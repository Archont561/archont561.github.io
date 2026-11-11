import { existsSync } from "node:fs";
import { join } from "node:path";
import { test } from "@archont561/bun-test-utils";
import { createRepository, readFixture, runTool, writeFixture } from "@/tests/fixtures/task009.ts";

interface ScenarioFixtures {
  tmpdir: { dir: string };
}

test
  .scenario<ScenarioFixtures>("README generation: render package metadata through EJS")
  .given("a repository with a README template and an old README", ({ tmpdir }) => {
    createRepository(tmpdir.dir);
    writeFixture(tmpdir.dir, "README.md", "Original README\n");
    return { root: tmpdir.dir };
  })
  .when("I generate the README", ({ root }) => ({ result: runTool(root, "readme"), root }))
  .then("the rendered README replaces the old content", ({ result, root, expect }) => {
    expect(result.status).toBe(0);
    const readme = readFixture(root, "README.md");
    expect(readme).toContain("# example-repo 1.2.3");
    expect(readme).toContain("@example/portfolio 1.2.3");
    expect(readme).toContain("@example/tools 1.2.3");
    expect(existsSync(join(root, ".README.previous"))).toBe(false);
  });

test
  .scenario<ScenarioFixtures>("README generation: preserve the old README on failure")
  .given("a repository with an invalid EJS template", ({ tmpdir }) => {
    createRepository(tmpdir.dir);
    writeFixture(tmpdir.dir, "README.md", "Original README\n");
    writeFixture(tmpdir.dir, "templates/README.md.ejs", "<% if ( %>broken");
    return { root: tmpdir.dir };
  })
  .when("I generate the README", ({ root }) => ({ result: runTool(root, "readme"), root }))
  .then("generation fails without changing the original", ({ result, root, expect }) => {
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("README.md.ejs");
    expect(readFixture(root, "README.md")).toBe("Original README\n");
    expect(existsSync(join(root, ".README.previous"))).toBe(false);
  });

test
  .scenario<ScenarioFixtures>("README generation: refuse an unresolved legacy backup")
  .given("a repository with a previous README backup", ({ tmpdir }) => {
    createRepository(tmpdir.dir);
    writeFixture(tmpdir.dir, ".README.previous", "Unresolved backup\n");
    return { root: tmpdir.dir };
  })
  .when("I generate the README", ({ root }) => ({ result: runTool(root, "readme"), root }))
  .then("generation refuses to overwrite the backup or the README", ({ result, root, expect }) => {
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(".README.previous");
    expect(readFixture(root, ".README.previous")).toBe("Unresolved backup\n");
    expect(readFixture(root, "README.md")).toBe("fixture\n");
  });

test
  .scenario<ScenarioFixtures>("README generation: check drift without writing")
  .given("a README that does not match its template", ({ tmpdir }) => {
    createRepository(tmpdir.dir);
    return { root: tmpdir.dir };
  })
  .when("I check the generated README", ({ root }) => ({
    result: runTool(root, "readme", "--check"),
    root,
  }))
  .then("the check reports drift without modifying the README", ({ result, root, expect }) => {
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("README.md");
    expect(readFixture(root, "README.md")).toBe("fixture\n");
  });
