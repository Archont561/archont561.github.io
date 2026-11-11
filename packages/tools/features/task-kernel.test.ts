import { existsSync } from "node:fs";
import { join } from "node:path";
import { test } from "@archont561/bun-test-utils";
import { discoverTasks, forWorkspaces, runTasks, task, tasks } from "@/src/tasks/index.ts";
import {
  createRepository,
  readFixture,
  runTool,
  workspacePaths,
  writeFixture,
} from "@/tests/fixtures/task009.ts";

interface Fixtures {
  tmpdir: { dir: string };
}
const kernelUrl = new URL("../src/tasks/index.ts", import.meta.url).href;

function fileTask(root: string): void {
  createRepository(root);
  writeFixture(root, "input.txt", "one");
  writeFixture(
    root,
    "tasks/example.ts",
    `
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { task, tasks } from ${JSON.stringify(kernelUrl)};
export default tasks(task({
  name: 'example', fileDep: ['input.txt'], targets: ['output.txt'],
  run({ root }) {
    const count = join(root, 'count.txt');
    writeFileSync(count, String((existsSync(count) ? Number(readFileSync(count, 'utf8')) : 0) + 1));
    writeFileSync(join(root, 'output.txt'), readFileSync(join(root, 'input.txt')));
  }
}));\n`,
  );
}

test
  .scenario<Fixtures>("Task kernel: skip unchanged files")
  .given("a task with an input and output", ({ tmpdir }) => {
    fileTask(tmpdir.dir);
    return { root: tmpdir.dir };
  })
  .when("the task runs twice", ({ root }) => ({
    root,
    first: runTool(root, "task", "example"),
    second: runTool(root, "task", "example"),
  }))
  .then("the second run is skipped and state is persisted", ({ root, first, second, expect }) => {
    expect(first.status).toBe(0);
    expect(first.stdout).toContain("run\texample");
    expect(second.status).toBe(0);
    expect(second.stdout).toContain("skip\texample");
    expect(readFixture(root, "count.txt")).toBe("1");
    expect(existsSync(join(root, ".tools-cache/tasks.json"))).toBe(true);
  });

test
  .scenario<Fixtures>("Task kernel: dirty inputs and targets rerun")
  .given("a previously completed file task", ({ tmpdir }) => {
    fileTask(tmpdir.dir);
    runTool(tmpdir.dir, "task", "example");
    return { root: tmpdir.dir };
  })
  .when("the input changes and then its output is tampered with", ({ root }) => {
    writeFixture(root, "input.txt", "two");
    const input = runTool(root, "task", "example");
    writeFixture(root, "output.txt", "tampered");
    const output = runTool(root, "task", "example");
    return { root, input, output };
  })
  .then("both changes cause a rerun", ({ root, input, output, expect }) => {
    expect(input.stdout).toContain("run\texample");
    expect(output.stdout).toContain("run\texample");
    expect(readFixture(root, "count.txt")).toBe("3");
    expect(readFixture(root, "output.txt")).toBe("two");
  });

test
  .scenario<Fixtures>("Task kernel: force and dry run")
  .given("a clean completed task", ({ tmpdir }) => {
    fileTask(tmpdir.dir);
    runTool(tmpdir.dir, "task", "example");
    return { root: tmpdir.dir };
  })
  .when("a forced dry run is followed by a forced execution", ({ root }) => {
    const dry = runTool(root, "task", "example", "--force", "--dry-run");
    const afterDry = readFixture(root, "count.txt");
    const forced = runTool(root, "task", "example", "--force");
    return { root, dry, afterDry, forced };
  })
  .then(
    "the preview has no side effects while force runs the action",
    ({ root, dry, afterDry, forced, expect }) => {
      expect(dry.stdout).toContain("would-run\texample");
      expect(afterDry).toBe("1");
      expect(forced.stdout).toContain("run\texample");
      expect(readFixture(root, "count.txt")).toBe("2");
    },
  );

test
  .scenario<Fixtures>("Task kernel: DAG order and parallel branches")
  .given("two independent prerequisites and one dependent", ({ tmpdir }) => ({ root: tmpdir.dir }))
  .when("the graph is executed", async ({ root }) => {
    const events: string[] = [];
    let release: (() => void) | undefined;
    const barrier = new Promise<void>((resolve) => {
      release = resolve;
    });
    let started = 0;
    const branch = (name: string) =>
      task({
        name,
        run: async () => {
          events.push(`start:${name}`);
          if (++started === 2) release?.();
          await Promise.race([
            barrier,
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("branches did not overlap")), 1000),
            ),
          ]);
          events.push(`end:${name}`);
        },
      });
    const registry = tasks(
      branch("a"),
      branch("b"),
      task({
        name: "final",
        deps: ["a", "b"],
        run: () => {
          events.push("final");
        },
      }),
    ).map((item) => ({ task: item, source: "fixture.ts" }));
    const results = await runTasks(registry, ["final"], { root });
    return { events, results };
  })
  .then("both branches overlap and finish before the dependant", ({ events, results, expect }) => {
    expect(events.slice(0, 2).sort()).toEqual(["start:a", "start:b"]);
    expect(events.at(-1)).toBe("final");
    expect(results.map((item) => item.name).sort()).toEqual(["a", "b", "final"]);
  });

test
  .scenario<Fixtures>("Task kernel: workspace preset expansion")
  .given("declared application and package workspaces", ({ tmpdir }) => {
    createRepository(tmpdir.dir);
    return { root: tmpdir.dir };
  })
  .when("a workspace task factory is expanded", ({ root }) => ({
    expanded: forWorkspaces((path) => task({ name: `check:${path}`, run() {} }), root),
  }))
  .then("one sorted task is created per workspace", ({ expanded, expect }) => {
    expect(expanded.map((item) => item.name)).toEqual(
      workspacePaths.map((path) => `check:${path}`),
    );
  });

test
  .scenario<Fixtures>("Task kernel: discover built-in and repository tasks")
  .given("a repository task registry", ({ tmpdir }) => {
    fileTask(tmpdir.dir);
    return { root: tmpdir.dir };
  })
  .when("the CLI lists the registries", ({ root }) => ({ result: runTool(root, "task", "--list") }))
  .then("the list includes task names and their source files", ({ result, expect }) => {
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("example\ttasks/example.ts");
    expect(result.stdout).toContain("readme:check:apps/portfolio\t");
    expect(result.stdout).toContain("readmes.ts");
  });

test
  .scenario<Fixtures>("Task kernel: discover workspace-owned tasks through the CLI")
  .given("a task registry in a declared workspace", ({ tmpdir }) => {
    createRepository(tmpdir.dir);
    writeFixture(
      tmpdir.dir,
      "apps/portfolio/tasks/project.ts",
      `import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
export default [{ name: 'portfolio:example', run({ root }) { writeFileSync(join(root, 'workspace-ran.txt'), root); } }];\n`,
    );
    return { root: tmpdir.dir };
  })
  .when("the CLI lists and executes the workspace task", ({ root }) => ({
    root,
    list: runTool(root, "task", "--list"),
    result: runTool(root, "task", "portfolio:example"),
  }))
  .then(
    "the source is shown and the task receives the selected root",
    ({ root, list, result, expect }) => {
      expect(list.status).toBe(0);
      expect(list.stdout).toContain("portfolio:example\tapps/portfolio/tasks/project.ts");
      expect(result.status).toBe(0);
      expect(result.stdout).toContain("run\tportfolio:example");
      expect(readFixture(root, "workspace-ran.txt")).toBe(root);
    },
  );

test
  .scenario<Fixtures>("Task kernel: reject duplicate registries")
  .given("two files declaring the same task name", ({ tmpdir }) => {
    fileTask(tmpdir.dir);
    writeFixture(tmpdir.dir, "tasks/other.ts", "export default [{ name: 'example', run() {} }];\n");
    return { root: tmpdir.dir };
  })
  .when("the task registries are discovered", async ({ root }) => {
    try {
      await discoverTasks(root);
      return { message: "" };
    } catch (error) {
      return { message: String(error) };
    }
  })
  .then("the error names both sources", ({ message, expect }) => {
    expect(message).toContain("Duplicate task");
    expect(message).toContain("tasks/example.ts");
    expect(message).toContain("tasks/other.ts");
  });
