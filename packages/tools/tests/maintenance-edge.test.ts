import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, test } from "@archont561/bun-test-utils";
import { renderAgents, updateAgents } from "@/src/maintenance/agents.ts";
import { pathExists } from "@/src/maintenance/files.ts";
import { updateReadme } from "@/src/maintenance/readme.ts";
import { checkStructure } from "@/src/maintenance/structure.ts";
import { probeVersions } from "@/src/maintenance/version-probe.ts";
import {
  readManifest,
  repositoryRoot,
  workspaceManifestPaths,
} from "@/src/maintenance/workspaces.ts";
import {
  createRepository,
  readFixture,
  writeFixture,
  writeManifest,
} from "@/tests/fixtures/task009.ts";

const agentText =
  "# Guidance\n<!-- agents-md:begin id=commands -->\nOld commands\n<!-- agents-md:end id=commands -->\n## Notes\nHuman notes\n";

describe("structure failure details", () => {
  test("reports missing, hard-coded, and unloadable version modules", ({ tmpdir }) => {
    createRepository(tmpdir.dir);
    rmSync(join(tmpdir.dir, "apps/github-app/src/version.ts"));
    writeFixture(
      tmpdir.dir,
      "apps/portfolio/src/version.ts",
      'export const name = "wrong"; export const version = "9.9.9";',
    );
    const client = "packages/github-app-client/src/version.ts";
    writeFixture(
      tmpdir.dir,
      client,
      `${readFixture(tmpdir.dir, client)}\nthrow new Error("broken version module");\n`,
    );
    const issues = checkStructure(tmpdir.dir).join("\n");
    expect(issues).toContain("Missing required file: apps/github-app/src/version.ts");
    expect(issues).toContain("apps/portfolio/src/version.ts: derive metadata");
    expect(issues).toContain("apps/portfolio/src/version.ts: exported name/version");
    expect(issues).toContain("broken version module");
  });

  test("reports malformed sandbox and docs without crashing", ({ tmpdir }) => {
    createRepository(tmpdir.dir);
    writeFixture(tmpdir.dir, "pixi-sandbox.toml", "schema = [\n");
    writeFixture(tmpdir.dir, "docs/index.mdx", "---\ntitle: [\n---\n\n# broken\n");
    writeFixture(tmpdir.dir, "docs/missing.mdx", "# No frontmatter\n");
    writeFixture(tmpdir.dir, "docs/empty.mdx", "---\ntitle: Empty\ndescription: Empty page\n---\n");
    const issues = checkStructure(tmpdir.dir).join("\n");
    expect(issues).toContain("pixi-sandbox.toml: invalid TOML");
    expect(issues).toContain("docs/index.mdx: invalid frontmatter");
    expect(issues).toContain("docs/missing.mdx: frontmatter required");
    expect(issues).toContain("docs/empty.mdx: empty content");
  });
});

describe("root dependency boundaries", () => {
  test("identifies invalid manifests and application dependencies at the root", ({ tmpdir }) => {
    createRepository(tmpdir.dir);
    writeManifest(tmpdir.dir, "", {
      name: "example-repo",
      version: "1.2.3",
      workspaces: ["apps/*", "packages/*"],
      dependencies: { next: "1.0.0" },
    });
    writeFixture(tmpdir.dir, "apps/portfolio/package.json", "{ not json }");
    writeManifest(tmpdir.dir, "apps/github-app", {
      name: "@example/github-app",
      version: "1.2.3",
      devDependencies: { "@biomejs/biome": "2.0.0" },
    });
    const issues = checkStructure(tmpdir.dir).join("\n");
    expect(issues).toContain("next: application dependencies belong in app manifests");
    expect(issues).toContain("repository tooling @biomejs/biome belongs in the root manifest");
    expect(issues).toContain("Cannot read");
    expect(issues).toContain("apps/portfolio/package.json");
  });
});

describe("workspace and file errors", () => {
  test("reports absent workspace declarations and patterns with no matches", ({ tmpdir }) => {
    createRepository(tmpdir.dir);
    writeManifest(tmpdir.dir, "", { name: "repo", version: "1.2.3" });
    expect(() =>
      workspaceManifestPaths(tmpdir.dir, readManifest(join(tmpdir.dir, "package.json"))),
    ).toThrow("declare workspaces");
    writeManifest(tmpdir.dir, "", { name: "repo", version: "1.2.3", workspaces: ["missing/*"] });
    expect(checkStructure(tmpdir.dir).join("\n")).toContain(
      "Workspace pattern has no package.json",
    );
  });

  test("uses fresh metadata and gives useful errors for unreadable manifests", ({ tmpdir }) => {
    expect(repositoryRoot(".")).toBe(resolve("."));
    expect(() => readManifest(join(tmpdir.dir, "missing.json"))).toThrow("Cannot read");
    writeFixture(tmpdir.dir, "not-a-directory", "file");
    expect(pathExists(join(tmpdir.dir, "not-a-directory/child"))).toBe(false);
  });

  test("can create an initially absent README", ({ tmpdir }) => {
    createRepository(tmpdir.dir);
    rmSync(join(tmpdir.dir, "README.md"));
    expect(updateReadme(tmpdir.dir, true)).toBe(true);
    expect(existsSync(join(tmpdir.dir, "README.md"))).toBe(false);
    expect(updateReadme(tmpdir.dir)).toBe(true);
    expect(readFixture(tmpdir.dir, "README.md")).toContain("example-repo");
  });

  test("version probes return both values and import errors", async ({ tmpdir }) => {
    createRepository(tmpdir.dir);
    const file = join(tmpdir.dir, "apps/portfolio/src/version.ts");
    const missing = join(tmpdir.dir, "missing.ts");
    const results = await probeVersions([file, missing]);
    expect(results[0]).toMatchObject({ file, name: "@example/portfolio", version: "1.2.3" });
    expect(results[1]?.error).toBeDefined();
  });
});

describe("agent generator safety", () => {
  test("refuses missing or malformed markers", ({ tmpdir }) => {
    createRepository(tmpdir.dir);
    for (const content of [
      "Human only\n",
      "<!-- agents-md:begin id=commands",
      "<!-- agents-md:begin id=commands -->\n",
      "<!--  agents-md:begin id=commands -->\n<!-- agents-md:end id=commands -->",
    ]) {
      writeFixture(tmpdir.dir, "AGENTS.md", content);
      expect(() => updateAgents(tmpdir.dir)).toThrow("marker");
      expect(readFixture(tmpdir.dir, "AGENTS.md")).toBe(content);
    }
  });

  test("cleans its staging directory when the generator fails", ({ tmpdir }) => {
    createRepository(tmpdir.dir);
    writeFixture(tmpdir.dir, "AGENTS.md", agentText);
    let staged = "";
    expect(() =>
      renderAgents(tmpdir.dir, (path) => {
        staged = path;
        throw new Error("generator failed");
      }),
    ).toThrow("generator failed");
    expect(staged).not.toBe("");
    expect(existsSync(staged)).toBe(false);
    expect(readFixture(tmpdir.dir, "AGENTS.md")).toBe(agentText);
  });

  test("rejects a generator that edits human notes or unknown regions", ({ tmpdir }) => {
    createRepository(tmpdir.dir);
    const text = `${agentText}\n<!-- agents-md:begin id=custom -->\nKeep this.\n<!-- agents-md:end id=custom -->\n`;
    writeFixture(tmpdir.dir, "AGENTS.md", text);
    for (const [oldText, newText] of [
      ["Human notes", "Lost notes"],
      ["Keep this.", "Changed."],
    ]) {
      expect(() =>
        renderAgents(tmpdir.dir, (staging) => {
          const file = join(staging, "AGENTS.md");
          writeFileSync(file, readFileSync(file, "utf8").replace(oldText ?? "", newText ?? ""));
        }),
      ).toThrow("outside its markers");
      expect(readFixture(tmpdir.dir, "AGENTS.md")).toBe(text);
    }
  });
});
