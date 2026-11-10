import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@archont561/bun-test-utils";
import { assertSuccess, biome, repo, run } from "@/tests/fixtures/config-test-utils.ts";

function seedBiomeProject(directory: string): void {
  const shared = "packages/tools/src/configs/biome";
  for (const path of [
    "src",
    "node_modules/one",
    "nested/node_modules/two",
    ".bun/store/pkg",
    shared,
  ]) {
    mkdirSync(join(directory, path), { recursive: true });
  }
  copyFileSync(join(repo, "biome.json"), join(directory, "biome.json"));
  copyFileSync(join(repo, shared, "base.json"), join(directory, shared, "base.json"));
  writeFileSync(join(directory, "src/main.ts"), "export function value() {\nreturn 1;\n}\n");
  for (const path of [
    "node_modules/one/index.ts",
    "nested/node_modules/two/index.ts",
    ".bun/store/pkg/index.ts",
  ]) {
    writeFileSync(join(directory, path), "export const dependency=1;\n");
  }
}

test("root Biome inherits the base and never rewrites dependency trees", () => {
  const directory = mkdtempSync(join(tmpdir(), "biome-config-"));
  try {
    seedBiomeProject(directory);
    const rootConfig = readFileSync(join(directory, "biome.json"), "utf8");
    const result = run(biome, ["check", "--write", ".", "--colors=off"], directory);
    assertSuccess(result);
    expect(readFileSync(join(directory, "biome.json"), "utf8")).toBe(rootConfig);
    expect(readFileSync(join(directory, "src/main.ts"), "utf8")).toBe(
      "export function value() {\n  return 1;\n}\n",
    );
    for (const path of [
      "node_modules/one/index.ts",
      "nested/node_modules/two/index.ts",
      ".bun/store/pkg/index.ts",
    ]) {
      expect(readFileSync(join(directory, path), "utf8")).toBe("export const dependency=1;\n");
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
