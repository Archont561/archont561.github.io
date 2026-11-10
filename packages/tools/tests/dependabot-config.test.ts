import { readFileSync } from "node:fs";
import { describe, expect, test } from "@archont561/bun-test-utils";
import { YAML } from "bun";

type Update = {
  "package-ecosystem": string;
  directory: string;
  "exclude-paths"?: string[];
};

describe("Dependabot configuration", () => {
  test("excludes only generated workflows from Actions version updates", () => {
    const file = new URL("../../../.github/dependabot.yml", import.meta.url);
    const config = YAML.parse(readFileSync(file, "utf8")) as { version: number; updates: Update[] };
    const actions = config.updates.filter(
      (update) => update["package-ecosystem"] === "github-actions",
    );

    expect(config.version).toBe(2);
    expect(actions).toHaveLength(1);
    expect(actions[0]?.directory).toBe("/");
    expect([...(actions[0]?.["exclude-paths"] ?? [])].sort()).toEqual([
      ".github/workflows/publish-sandbox.yml",
      ".github/workflows/relock.yml",
    ]);
  });
});
