import { existsSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@archont561/bun-test-utils";
import { task as exportedTask } from "@archont561/tools/tasks";
import { renderBacklogIndex, statusOf } from "@root/tasks/docs.ts";
import { discoverTasks, runTasks, task, tasks } from "@/src/tasks/index.ts";
import { createRepository, writeFixture } from "@/tests/fixtures/task009.ts";

const tempTest = test.extend({
  root: {
    setup: async (use) => {
      const { mkdtempSync, rmSync } = await import("node:fs");
      const { tmpdir } = await import("node:os");
      const root = mkdtempSync(join(tmpdir(), "tools-task-unit-"));
      try {
        await use(root);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
  },
});

test("the exported and CLI kernels are the same module instance", () => {
  expect(exportedTask).toBe(task);
});

test("task definitions reject duplicates and unsafe file patterns", () => {
  expect(() => tasks(task({ name: "same", run() {} }), task({ name: "same", run() {} }))).toThrow(
    "Duplicate",
  );
  expect(() => task({ name: "bad", fileDep: ["../secret"], run() {} })).toThrow("unsafe");
  expect(() => task({ name: "", run() {} })).toThrow("Invalid task name");
});

tempTest("a cycle or missing dependency fails before any action", async ({ root }) => {
  let calls = 0;
  const registry = tasks(
    task({
      name: "a",
      deps: ["b"],
      run() {
        calls++;
      },
    }),
    task({
      name: "b",
      deps: ["a"],
      run() {
        calls++;
      },
    }),
  ).map((item) => ({ task: item, source: "test" }));
  await expect(runTasks(registry, ["a"], { root })).rejects.toThrow("cycle");
  await expect(runTasks(registry, ["missing"], { root })).rejects.toThrow("Unknown task");
  expect(calls).toBe(0);
  expect(existsSync(join(root, ".tools-cache"))).toBe(false);
});

tempTest("predicates and failed targets do not record success", async ({ root }) => {
  let up = true;
  let calls = 0;
  const registry = tasks(
    task({
      name: "predicate",
      upToDate: () => up,
      run() {
        calls++;
      },
    }),
    task({ name: "missing-target", targets: ["missing.txt"], run() {} }),
  ).map((item) => ({ task: item, source: "test" }));
  expect((await runTasks(registry, ["predicate"], { root }))[0]?.status).toBe("skip");
  up = false;
  expect((await runTasks(registry, ["predicate"], { root }))[0]?.status).toBe("run");
  expect(calls).toBe(1);
  await expect(runTasks(registry, ["missing-target"], { root })).rejects.toThrow(
    "declared targets",
  );
});

tempTest(
  "discovery rejects malformed exports and ignores test and nested files",
  async ({ root }) => {
    createRepository(root);
    writeFixture(root, "tasks/ignored.test.ts", "throw new Error('not discovered')");
    writeFixture(root, "tasks/nested/ignored.ts", "throw new Error('not discovered')");
    writeFixture(root, "tasks/broken.ts", "export default 42;");
    await expect(discoverTasks(root)).rejects.toThrow("tasks/broken.ts");
  },
);

tempTest(
  "discovers tasks in declared workspaces and executes them against the selected root",
  async ({ root }) => {
    createRepository(root);
    writeFixture(root, "tasks/repo.ts", "export default [{name: 'repo:fixture', run() {}}];");
    writeFixture(
      root,
      "apps/portfolio/tasks/fixture.ts",
      `import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
export default [{ name: 'portfolio:fixture', run({root}) { writeFileSync(join(root, 'ran.txt'), root); } }];`,
    );
    writeFixture(root, "apps/portfolio/tasks/ignored.test.ts", "throw new Error('test file')");
    writeFixture(root, "apps/portfolio/tasks/ignored.spec.ts", "throw new Error('spec file')");
    writeFixture(root, "apps/portfolio/tasks/ignored.d.ts", "throw new Error('declaration')");
    writeFixture(
      root,
      "apps/portfolio/tasks/internal/ignored.ts",
      "throw new Error('nested file')",
    );
    writeFixture(
      root,
      "packages/github-app-client/tasks/fixture.ts",
      "export default [{name: 'client:fixture', run() {}}];",
    );
    writeFixture(root, "apps/unlisted/tasks/ignored.ts", "throw new Error('undeclared workspace')");
    const registry = await discoverTasks(root);
    const item = registry.find(({ task }) => task.name === "portfolio:fixture");
    expect(item?.source).toBe("apps/portfolio/tasks/fixture.ts");
    expect(registry.findIndex(({ task }) => task.name === "repo:fixture")).toBeLessThan(
      registry.findIndex(({ task }) => task.name === "portfolio:fixture"),
    );
    expect(registry.findIndex(({ task }) => task.name === "portfolio:fixture")).toBeLessThan(
      registry.findIndex(({ task }) => task.name === "client:fixture"),
    );
    expect(await runTasks(registry, ["portfolio:fixture"], { root })).toEqual([
      { name: "portfolio:fixture", status: "run" },
    ]);
    expect(await Bun.file(join(root, "ran.txt")).text()).toBe(root);
  },
);

tempTest(
  "duplicate names across repository and workspace task registries fail clearly",
  async ({ root }) => {
    createRepository(root);
    const source = "export default [{name: 'duplicate', run() {}}];";
    writeFixture(root, "tasks/root.ts", source);
    writeFixture(root, "apps/portfolio/tasks/workspace.ts", source);
    await expect(discoverTasks(root)).rejects.toThrow(
      'Duplicate task "duplicate" in tasks/root.ts and apps/portfolio/tasks/workspace.ts',
    );
  },
);

test("backlog statuses support frontmatter and existing bold status lines", () => {
  expect(statusOf("---\nstatus: in progress\n---\n")).toBe("in progress");
  expect(statusOf("**Status:** done · **Milestone:** M1")).toBe("done");
  expect(statusOf("Status: **done (2026-11-10)** · Depends on: —")).toBe("done (2026-11-10)");
  expect(statusOf("No status")).toBe("unknown");
});

tempTest("backlog index is sorted and links to status-bearing source files", ({ root }) => {
  writeFixture(root, "backlog/tasks/B.md", "# B\nStatus: todo\n");
  writeFixture(root, "backlog/tasks/A.md", "---\nstatus: done\n---\n# A\n");
  const rendered = renderBacklogIndex(root);
  expect(rendered).toContain("[A](tasks/A.md) | done");
  expect(rendered.indexOf("[A] ")).toBe(-1);
  expect(rendered.indexOf("[A](")).toBeLessThan(rendered.indexOf("[B]("));
  expect(rendered.endsWith("\n\n")).toBe(false);
});

tempTest(
  "a failed dependency waits for independent siblings and never runs its dependent",
  async ({ root }) => {
    const events: string[] = [];
    const registry = tasks(
      task({
        name: "fail",
        run: async () => {
          events.push("failed");
          throw new Error("boom");
        },
      }),
      task({
        name: "slow",
        run: async () => {
          await new Promise((resolve) => setTimeout(resolve, 20));
          events.push("slow finished");
        },
      }),
      task({
        name: "after",
        deps: ["fail", "slow"],
        run: () => {
          events.push("dependent");
        },
      }),
    ).map((item) => ({ task: item, source: "test" }));
    await expect(runTasks(registry, ["after"], { root })).rejects.toThrow("boom");
    expect(events).toEqual(["failed", "slow finished"]);
    expect(existsSync(join(root, ".tools-cache"))).toBe(false);
  },
);

tempTest("a missing input cannot be cached as clean", async ({ root }) => {
  let count = 0;
  const registry = tasks(
    task({
      name: "missing-input",
      fileDep: ["input.txt"],
      run() {
        count++;
      },
    }),
  ).map((item) => ({ task: item, source: "test" }));
  await runTasks(registry, ["missing-input"], { root });
  await runTasks(registry, ["missing-input"], { root });
  expect(count).toBe(2);
});
