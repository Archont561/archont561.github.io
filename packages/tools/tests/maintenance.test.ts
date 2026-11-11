import { chmodSync, existsSync, readFileSync, rmSync, statSync, symlinkSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "@archont561/bun-test-utils";
import { normalizeAgentCommands, updateAgents } from "@/src/maintenance/agents.ts";
import { updateReadme } from "@/src/maintenance/readme.ts";
import { checkStructure } from "@/src/maintenance/structure.ts";
import { readManifest, readWorkspaces, repositoryRoot } from "@/src/maintenance/workspaces.ts";
import {
  createRepository,
  readFixture,
  writeFixture,
  writeManifest,
} from "@/tests/fixtures/task009.ts";

describe("repository structure", () => {
  test("validates sandbox and portable MDX, reporting all problems", ({ tmpdir }) => {
    createRepository(tmpdir.dir);
    writeFixture(tmpdir.dir, "pixi-sandbox.toml", "schema = 2\n");
    writeFixture(tmpdir.dir, "docs/topic/page.mdx", "---\ntitle: Example\n---\n\n# Page\n");
    const issues = checkStructure(tmpdir.dir).join("\n");
    expect(issues).toContain("schema-1 sandbox bundle");
    expect(issues).toContain("docs/topic/page.mdx: title and description");
    expect(issues).toContain("docs/topic/page.mdx: section index.mdx required");
  });

  test("rejects undeclared workspaces and duplicate package names", ({ tmpdir }) => {
    createRepository(tmpdir.dir);
    writeManifest(tmpdir.dir, "apps/portfolio", { name: "@example/github-app", version: "1.2.3" });
    writeManifest(tmpdir.dir, "packages/extra", { name: "@example/extra", version: "1.2.3" });
    writeManifest(tmpdir.dir, "", {
      name: "example-repo",
      version: "1.2.3",
      workspaces: ["apps/*", "packages/github-app-client", "packages/tools"],
    });
    const issues = checkStructure(tmpdir.dir).join("\n");
    expect(issues).toContain("duplicate package name @example/github-app");
    expect(issues).toContain("packages/extra/package.json: workspace is not declared");
  });

  test("rejects unsafe workspace globs instead of reading outside the repository", ({ tmpdir }) => {
    createRepository(tmpdir.dir);
    writeManifest(tmpdir.dir, "", { name: "example", version: "1.2.3", workspaces: ["../*"] });
    expect(checkStructure(tmpdir.dir).join("\n")).toContain(
      "Unsafe or unsupported workspace pattern",
    );
  });

  test("detects a dangling tools/dist symlink", ({ tmpdir }) => {
    createRepository(tmpdir.dir);
    symlinkSync("missing-target", join(tmpdir.dir, "packages/tools/dist"));
    expect(checkStructure(tmpdir.dir).join("\n")).toContain("packages/tools/dist must not exist");
  });
});

describe("workspace metadata", () => {
  test("reads and verifies fresh package versions on repeated checks", ({ tmpdir }) => {
    createRepository(tmpdir.dir);
    expect(checkStructure(tmpdir.dir)).toEqual([]);
    writeManifest(tmpdir.dir, "apps/portfolio", { name: "@example/portfolio", version: "2.3.4" });
    expect(readManifest(join(tmpdir.dir, "apps/portfolio/package.json")).version).toBe("2.3.4");
    expect(checkStructure(tmpdir.dir)).toEqual([]);
  });

  test("resolves declared workspaces in deterministic path order", ({ tmpdir }) => {
    createRepository(tmpdir.dir);
    expect(readWorkspaces(tmpdir.dir).map(({ path }) => path)).toEqual([
      "apps/github-app",
      "apps/portfolio",
      "packages/github-app-client",
      "packages/tools",
    ]);
  });
});

describe("README generation", () => {
  test("is idempotent, supports checks and preserves file permissions", ({ tmpdir }) => {
    createRepository(tmpdir.dir);
    const file = join(tmpdir.dir, "README.md");
    chmodSync(file, 0o640);
    expect(updateReadme(tmpdir.dir, true)).toBe(true);
    expect(readFixture(tmpdir.dir, "README.md")).toBe("fixture\n");
    expect(updateReadme(tmpdir.dir)).toBe(true);
    const mtime = statSync(file).mtimeMs;
    expect(statSync(file).mode & 0o777).toBe(0o640);
    expect(updateReadme(tmpdir.dir)).toBe(false);
    expect(updateReadme(tmpdir.dir, true)).toBe(false);
    expect(statSync(file).mtimeMs).toBe(mtime);
  });

  test("does not replace a README symlink or modify its target", ({ tmpdir }) => {
    createRepository(tmpdir.dir);
    const file = join(tmpdir.dir, "README.md");
    writeFixture(tmpdir.dir, "important.txt", "human content\n");
    rmSync(file);
    symlinkSync("important.txt", file);
    expect(() => updateReadme(tmpdir.dir)).toThrow("non-regular file");
    expect(readFixture(tmpdir.dir, "important.txt")).toBe("human content\n");
  });

  test("rejects empty output without changing the previous README", ({ tmpdir }) => {
    createRepository(tmpdir.dir);
    writeFixture(tmpdir.dir, "templates/README.md.ejs", " \n");
    expect(() => updateReadme(tmpdir.dir)).toThrow("produced no content");
    expect(readFixture(tmpdir.dir, "README.md")).toBe("fixture\n");
  });
});

describe("agent guidance", () => {
  test("normalizes only marked commands and is idempotent", () => {
    const text =
      "<!-- agents-md:begin id=commands -->\nInstall: npm install\nDev: npm run dev\n<!-- agents-md:end id=commands -->\n## Notes\nKeep npm run in my example.\n";
    const normalized = normalizeAgentCommands(text);
    expect(normalized).toContain("bun install --frozen-lockfile");
    expect(normalized).toContain("bun run dev");
    expect(normalized).toEndWith("Keep npm run in my example.\n");
    expect(normalizeAgentCommands(normalized)).toBe(normalized);
  });

  test("rejects nested, duplicated, or mismatched markers without writing", ({ tmpdir }) => {
    createRepository(tmpdir.dir);
    for (const text of [
      "<!-- agents-md:begin id=commands --><!-- agents-md:begin id=testing --><!-- agents-md:end id=testing --><!-- agents-md:end id=commands -->",
      "<!-- agents-md:begin id=commands --><!-- agents-md:end id=commands --><!-- agents-md:begin id=commands --><!-- agents-md:end id=commands -->",
      "<!-- agents-md:begin id=commands --><!-- agents-md:end id=overview -->",
    ]) {
      writeFixture(tmpdir.dir, "AGENTS.md", text);
      expect(() => updateAgents(tmpdir.dir)).toThrow("marker");
      expect(readFixture(tmpdir.dir, "AGENTS.md")).toBe(text);
      expect(existsSync(join(tmpdir.dir, "AGENTS.generated.md"))).toBe(false);
    }
  });
});

describe("the current repository", () => {
  test("satisfies the same structure and generation checks as its hooks", () => {
    const root = repositoryRoot();
    expect(checkStructure(root)).toEqual([]);
    expect(updateReadme(root, true)).toBe(false);
    expect(updateAgents(root, true)).toBe(false);
  });

  test("exposes all maintenance checks through Pixi and Lefthook", () => {
    const root = repositoryRoot();
    const pixi = Bun.TOML.parse(readFileSync(join(root, "pixi.toml"), "utf8")) as {
      tasks: Record<string, string>;
    };
    const hooks = Bun.YAML.parse(readFileSync(join(root, "lefthook.yml"), "utf8")) as {
      "pre-commit": { commands: Record<string, { run: string }> };
    };
    for (const [name, command] of [
      ["check-structure", "check-structure"],
      ["readme", "readme"],
      ["readme-check", "readme --check"],
      ["agents", "agents"],
      ["agents-check", "agents --check"],
    ] as const) {
      expect(pixi.tasks[name]).toBe(`bun run --bun tools ${command}`);
    }
    expect(hooks["pre-commit"].commands.structure?.run).toBe("pixi run check-structure");
    expect(hooks["pre-commit"].commands.readme?.run).toBe("pixi run readme-check");
    expect(hooks["pre-commit"].commands.agents?.run).toBe("pixi run agents-check");
  });
});
