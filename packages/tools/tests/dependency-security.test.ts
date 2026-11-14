import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { expect, test } from "@archont561/bun-test-utils";

// Resolve the dependency the same way the generator does, rather than a
// potentially unrelated hoisted copy of js-yaml.
const clientRequire = createRequire(
  new URL("../../github-app-client/package.json", import.meta.url),
);
const generatorRequire = createRequire(clientRequire.resolve("@hey-api/openapi-ts/package.json"));
const parserManifestPath = generatorRequire.resolve("@hey-api/json-schema-ref-parser/package.json");
const parserRequire = createRequire(parserManifestPath);
const yaml = parserRequire("js-yaml") as { load: (input: string) => unknown };
const spec = [
  "openapi: 3.0.3",
  "info:",
  "  title: Security compatibility fixture",
  "  version: '1.0.0'",
  "paths: {}",
  "components:",
  "  schemas:",
  "    Common: &common",
  "      type: object",
  "      properties:",
  "        status:",
  "          type: string",
  "    Status:",
  "      allOf:",
  "        - <<: *common",
  "        - $ref: './extra.yaml#/Extra'",
  "",
].join("\n");

test("the generator's schema parser resolves the approved patched js-yaml", () => {
  const metadata = parserRequire("js-yaml/package.json") as { version: string };
  expect(metadata.version).toBe("4.3.2");
});

test("patched js-yaml limits merges while preserving ordinary ordered maps", () => {
  const largeMapping = `base: &base\n${Array.from({ length: 10050 }, (_, index) => `  k${index}: ${index}\n`).join("")}target:\n  <<: *base\n`;
  const emptySources = `empty: &empty {}\nsources: &sources [${Array(20).fill("*empty").join(", ")}]\ntargets:\n${Array(510).fill("  - <<: *sources\n").join("")}`;

  expect(() => yaml.load(largeMapping)).toThrow(/merge/i);
  expect(() => yaml.load(emptySources)).toThrow(/merge/i);
  expect(yaml.load("!!omap\n- a: 1\n- b: 2\n")).toEqual([{ a: 1 }, { b: 2 }]);
  expect(() => yaml.load("!!omap\n- a: 1\n- a: 2\n")).toThrow();
});

test("the installed parser bundles YAML anchors and external references", async () => {
  const directory = mkdtempSync(join(tmpdir(), "yaml-security-"));
  try {
    writeFileSync(join(directory, "spec.yaml"), spec);
    writeFileSync(
      join(directory, "extra.yaml"),
      "Extra:\n  type: object\n  properties:\n    revision:\n      type: integer\n",
    );
    const metadata = generatorRequire(parserManifestPath) as { main: string };
    const parserPath = join(dirname(parserManifestPath), metadata.main);
    const { $RefParser } = (await import(pathToFileURL(parserPath).href)) as {
      $RefParser: new () => {
        bundle: (options: { pathOrUrlOrSchema: string }) => Promise<unknown>;
      };
    };
    const result = await new $RefParser().bundle({
      pathOrUrlOrSchema: join(directory, "spec.yaml"),
    });
    expect(result).toMatchObject({
      openapi: "3.0.3",
      components: {
        schemas: {
          Status: {
            allOf: [
              { type: "object", properties: { status: { type: "string" } } },
              { $ref: "#/components/schemas/Extra" },
            ],
          },
          Extra: { type: "object", properties: { revision: { type: "integer" } } },
        },
      },
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
