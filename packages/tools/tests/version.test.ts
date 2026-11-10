/**
 * Unit tests for the typed package.json loader. Shared code is tested once,
 * here in tools — consuming packages only use the helper (see D-007).
 */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "@archont561/bun-test-utils";
import { parsePackageMeta, readPackageMeta } from "@/src/package-meta/index.ts";

/** Fresh empty directory tree per test, removed on teardown (LIFO). */
const testWithTree = test.extend({
  tree: {
    setup: async (use) => {
      const root = mkdtempSync(join(tmpdir(), "pkg-meta-unit-"));
      await use(root);
      rmSync(root, { recursive: true, force: true });
    },
  },
});

const writeManifest = (root: string, manifest: Record<string, unknown>): string => {
  const file = join(root, "package.json");
  writeFileSync(file, JSON.stringify(manifest, null, 2));
  return file;
};

describe("parsePackageMeta: valid manifests", () => {
  test("accepts a minimal manifest and applies defaults", () => {
    const meta = parsePackageMeta({ name: "demo", version: "1.2.3" });
    expect(meta.name).toBe("demo");
    expect(meta.version).toBe("1.2.3");
    expect(meta.private).toBe(false);
    expect(meta.type).toBe("module");
  });

  test("accepts prerelease and build versions", () => {
    for (const version of ["0.0.0", "2.0.0-rc.1", "1.4.2+build.9", "1.0.0-alpha.1+sha.abc"]) {
      expect(parsePackageMeta({ name: "demo", version }).version).toBe(version);
    }
  });

  test("carries optional typed fields and preserves raw", () => {
    const raw = {
      name: "demo",
      version: "1.0.0",
      description: "hello",
      license: "MIT",
      private: true,
      type: "commonjs",
      packageManager: "bun@1.4.4",
      workspaces: ["apps/*"],
      engines: { bun: ">=1.1" },
      customField: "kept",
    };
    const meta = parsePackageMeta(raw);
    expect(meta.description).toBe("hello");
    expect(meta.license).toBe("MIT");
    expect(meta.private).toBe(true);
    expect(meta.type).toBe("commonjs");
    expect(meta.packageManager).toBe("bun@1.4.4");
    expect(meta.workspaces).toEqual(["apps/*"]);
    expect(meta.engines).toEqual({ bun: ">=1.1" });
    expect(meta.raw.customField).toBe("kept");
    expect(meta.raw).toBe(raw);
  });
});

describe("parsePackageMeta: required fields", () => {
  test("rejects non-object manifests", () => {
    for (const bad of [null, [], "name", 42]) {
      expect(() => parsePackageMeta(bad)).toThrow(/manifest must be a JSON object/);
    }
  });

  test("rejects missing or empty names", () => {
    expect(() => parsePackageMeta({ version: "1.0.0" })).toThrow(/"name"/);
    expect(() => parsePackageMeta({ name: "", version: "1.0.0" })).toThrow(/"name"/);
  });

  test("rejects non-semantic versions", () => {
    for (const version of ["one.two", "1.2", "v1.2.3", ""]) {
      expect(() => parsePackageMeta({ name: "demo", version })).toThrow(/"version"/);
    }
  });
});

describe("parsePackageMeta: malformed optional fields", () => {
  test("rejects malformed optional fields", () => {
    expect(() => parsePackageMeta({ name: "d", version: "1.0.0", private: "yes" })).toThrow(
      /"private"/,
    );
    expect(() => parsePackageMeta({ name: "d", version: "1.0.0", type: "esm" })).toThrow(/"type"/);
    expect(() => parsePackageMeta({ name: "d", version: "1.0.0", workspaces: "apps/*" })).toThrow(
      /"workspaces"/,
    );
    expect(() => parsePackageMeta({ name: "d", version: "1.0.0", engines: { bun: 1 } })).toThrow(
      /"engines\.bun"/,
    );
    expect(() => parsePackageMeta({ name: "d", version: "1.0.0", description: 7 })).toThrow(
      /"description"/,
    );
  });
});

describe("readPackageMeta", () => {
  testWithTree("reads the manifest above a nested module path", async ({ tree }) => {
    writeManifest(tree, { name: "nested-demo", version: "0.4.0" });
    const meta = readPackageMeta(join(tree, "src", "lib", "deep.ts"));
    expect(meta.name).toBe("nested-demo");
    expect(meta.version).toBe("0.4.0");
  });

  testWithTree("returns the same instance for repeated and sibling lookups", async ({ tree }) => {
    writeManifest(tree, { name: "cache-demo", version: "3.0.0" });
    const first = readPackageMeta(join(tree, "src", "a.ts"));
    const second = readPackageMeta(join(tree, "src", "a.ts"));
    const sibling = readPackageMeta(join(tree, "src", "b.ts"));
    expect(first).toBe(second);
    expect(first).toBe(sibling);
  });

  testWithTree("accepts file URLs as strings and objects", async ({ tree }) => {
    writeManifest(tree, { name: "url-demo", version: "1.0.0" });
    const url = new URL(`file://${join(tree, "index.ts")}`);
    expect(readPackageMeta(url).name).toBe("url-demo");
    expect(readPackageMeta(url.toString()).name).toBe("url-demo");
  });

  testWithTree("throws when no package.json exists above", async ({ tree }) => {
    expect(() => readPackageMeta(join(tree, "index.ts"))).toThrow(/no package\.json found/);
  });

  test("dogfoods its own package manifest", () => {
    const meta = readPackageMeta(import.meta.url);
    expect(meta.name).toBe("@archont561/tools");
    expect(meta.private).toBe(true);
    expect(meta.type).toBe("module");
    expect(typeof meta.version).toBe("string");
  });
});
