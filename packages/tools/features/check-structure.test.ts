import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { test } from "@archont561/bun-test-utils";
import {
  createRepository,
  runTool,
  writeFixture,
  writeManifest,
} from "@/tests/fixtures/task009.ts";

interface ScenarioFixtures {
  tmpdir: { dir: string };
}

test
  .scenario<ScenarioFixtures>("Repository structure: accept a valid workspace")
  .given("a complete repository with valid package metadata", ({ tmpdir }) => {
    createRepository(tmpdir.dir);
    return { root: tmpdir.dir };
  })
  .when("I check the repository structure", ({ root }) => ({
    result: runTool(root, "check-structure"),
  }))
  .then("validation succeeds", ({ result, expect }) => {
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("structure validated");
  });

test
  .scenario<ScenarioFixtures>("Repository structure: report a missing root file")
  .given("a repository without README.md", ({ tmpdir }) => {
    createRepository(tmpdir.dir);
    rmSync(join(tmpdir.dir, "README.md"));
    return { root: tmpdir.dir };
  })
  .when("I check the repository structure", ({ root }) => ({
    result: runTool(root, "check-structure"),
  }))
  .then("validation fails with the missing file", ({ result, expect }) => {
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("README.md");
  });

test
  .scenario<ScenarioFixtures>("Repository structure: reject tools build output")
  .given("a repository containing packages/tools/dist", ({ tmpdir }) => {
    createRepository(tmpdir.dir);
    mkdirSync(join(tmpdir.dir, "packages/tools/dist"));
    return { root: tmpdir.dir };
  })
  .when("I check the repository structure", ({ root }) => ({
    result: runTool(root, "check-structure"),
  }))
  .then("validation rejects the forbidden build output", ({ result, expect }) => {
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("packages/tools/dist");
  });

test
  .scenario<ScenarioFixtures>("Repository structure: reject invalid package versions")
  .given("a workspace with a non-semantic version", ({ tmpdir }) => {
    createRepository(tmpdir.dir);
    writeManifest(tmpdir.dir, "apps/portfolio", { name: "@example/portfolio", version: "one.two" });
    return { root: tmpdir.dir };
  })
  .when("I check the repository structure", ({ root }) => ({
    result: runTool(root, "check-structure"),
  }))
  .then("validation identifies the invalid manifest", ({ result, expect }) => {
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("apps/portfolio/package.json");
    expect(result.stderr).toContain("semantic version");
  });

test
  .scenario<ScenarioFixtures>("Repository structure: detect version stub drift")
  .given("a workspace whose exported version disagrees with its manifest", ({ tmpdir }) => {
    createRepository(tmpdir.dir);
    const source = `import { readPackageMeta } from ${JSON.stringify(new URL("../src/package-meta/index.ts", import.meta.url).href)};\nexport const meta = readPackageMeta(import.meta.url);\nexport const name = meta.name;\nexport const version = "9.9.9";\n`;
    writeFixture(tmpdir.dir, "apps/portfolio/src/version.ts", source);
    return { root: tmpdir.dir };
  })
  .when("I check the repository structure", ({ root }) => ({
    result: runTool(root, "check-structure"),
  }))
  .then("validation identifies the drifted version module", ({ result, expect }) => {
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("apps/portfolio/src/version.ts");
    expect(result.stderr).toContain("version");
  });

test
  .scenario<ScenarioFixtures>("Repository structure: keep repository tooling at the root")
  .given("a site package declaring repository-only tooling", ({ tmpdir }) => {
    createRepository(tmpdir.dir);
    writeManifest(tmpdir.dir, "apps/portfolio", {
      name: "@example/portfolio",
      version: "1.2.3",
      devDependencies: { "@biomejs/biome": "2.0.0" },
    });
    return { root: tmpdir.dir };
  })
  .when("I check the repository structure", ({ root }) => ({
    result: runTool(root, "check-structure"),
  }))
  .then("validation reports the misplaced dependency", ({ result, expect }) => {
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("@biomejs/biome");
    expect(result.stderr).toContain("root");
  });

test
  .scenario<ScenarioFixtures>("Repository structure: reject legacy Python automation")
  .given("a repository containing the old doit entry point", ({ tmpdir }) => {
    createRepository(tmpdir.dir);
    writeFixture(tmpdir.dir, "dodo.py", "# legacy automation\n");
    return { root: tmpdir.dir };
  })
  .when("I check the repository structure", ({ root }) => ({
    result: runTool(root, "check-structure"),
  }))
  .then("the legacy entry point is rejected", ({ result, expect }) => {
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("dodo.py");
    expect(result.stderr).toContain("legacy Python/doit");
  });
