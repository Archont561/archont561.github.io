import { readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { test } from "@archont561/bun-test-utils";
import { checkDevcontainer, setupDevcontainer } from "@/src/maintenance/devcontainer.ts";
import { createRepository, writeFixture } from "@/tests/fixtures/task009.ts";

interface Fixtures {
  tmpdir: { dir: string };
}
function containerFixture(root: string): void {
  createRepository(root);
  writeFixture(
    root,
    ".devcontainer/devcontainer.json",
    readFileSync(new URL("../../../.devcontainer/devcontainer.json", import.meta.url), "utf8"),
  );
  writeFixture(
    root,
    ".devcontainer/setup.sh",
    readFileSync(new URL("../../../.devcontainer/setup.sh", import.meta.url), "utf8"),
  );
}

test
  .scenario<Fixtures>("Devcontainer: prepare locked dependencies without hooks or servers")
  .given("a complete developer checkout", ({ tmpdir }) => {
    containerFixture(tmpdir.dir);
    return { root: tmpdir.dir, events: [] as string[] };
  })
  .when("container setup completes", ({ root, events }) => {
    setupDevcontainer(root, {
      platform: "linux",
      arch: "x64",
      run: (cmd, args) => {
        events.push([cmd, ...args].join(" "));
      },
    });
    return {};
  })
  .then(
    "frozen dependencies and prose are prepared without global mutations",
    ({ events, expect }) => {
      expect(events).toEqual(["bun install --frozen-lockfile", "vale sync"]);
    },
  );

test
  .scenario<Fixtures>("Devcontainer: opt into hooks")
  .given("a complete developer checkout", ({ tmpdir }) => {
    containerFixture(tmpdir.dir);
    return { root: tmpdir.dir, events: [] as string[] };
  })
  .when("the developer explicitly requests hooks", ({ root, events }) => {
    setupDevcontainer(root, {
      platform: "linux",
      arch: "x64",
      hooks: true,
      run: (cmd, args) => {
        events.push([cmd, ...args].join(" "));
      },
    });
    return {};
  })
  .then("hooks are installed last", ({ events, expect }) => {
    expect(events.at(-1)).toBe("lefthook install");
    expect(events).toHaveLength(3);
  });

test
  .scenario<Fixtures>("Devcontainer: refuse unsupported hardware and missing lockfiles")
  .given("a developer checkout", ({ tmpdir }) => {
    containerFixture(tmpdir.dir);
    return { root: tmpdir.dir, events: [] as string[] };
  })
  .when("setup is attempted on ARM or without a Bun lock", ({ root, events }) => {
    const run = (command: string) => {
      events.push(command);
    };
    let arm = "";
    let missing = "";
    try {
      setupDevcontainer(root, { platform: "linux", arch: "arm64", run });
    } catch (error) {
      arm = String(error);
    }
    rmSync(join(root, "bun.lock"));
    try {
      setupDevcontainer(root, { platform: "linux", arch: "x64", run });
    } catch (error) {
      missing = String(error);
    }
    return { arm, missing };
  })
  .then("both attempts fail before launching anything", ({ arm, missing, events, expect }) => {
    expect(arm).toContain("Linux x86-64");
    expect(missing).toContain("bun.lock");
    expect(events).toEqual([]);
  });

test
  .scenario<Fixtures>("Devcontainer: stop when frozen install fails")
  .given("a complete checkout", ({ tmpdir }) => {
    containerFixture(tmpdir.dir);
    return { root: tmpdir.dir, events: [] as string[] };
  })
  .when("dependency installation fails", ({ root, events }) => {
    try {
      setupDevcontainer(root, {
        platform: "linux",
        arch: "x64",
        hooks: true,
        run: (cmd) => {
          events.push(cmd);
          throw new Error("failed");
        },
      });
    } catch {
      /* expected */
    }
    return {};
  })
  .then("prose setup and hooks do not run", ({ events, expect }) => {
    expect(events).toEqual(["bun"]);
  });

test
  .scenario<Fixtures>("Devcontainer: keep the editor and bootstrap aligned")
  .given("the declared container configuration", ({ tmpdir }) => {
    containerFixture(tmpdir.dir);
    return { root: tmpdir.dir };
  })
  .when("the configuration and setup script are inspected", ({ root }) => {
    checkDevcontainer(root);
    return {
      config: JSON.parse(readFileSync(join(root, ".devcontainer/devcontainer.json"), "utf8")),
      script: readFileSync(join(root, ".devcontainer/setup.sh"), "utf8"),
    };
  })
  .then(
    "the pinned runtime, forwarded port, and locked setup are explicit",
    ({ config, script, expect }) => {
      expect(config.runArgs).toContain("--platform=linux/amd64");
      expect(config.forwardPorts).toContain(3000);
      expect(config.customizations.vscode.settings["typescript.tsdk"]).toBe(
        "node_modules/typescript/lib",
      );
      expect(script).toContain("pixi install --locked");
      expect(script).not.toContain("pixi global install");
    },
  );
