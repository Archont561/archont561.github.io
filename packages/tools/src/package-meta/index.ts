/**
 * Typed package.json lookup — the one shared implementation every workspace
 * imports instead of copying its own JSON import. Zero runtime dependencies,
 * safe to inline into published builds (bunup `noExternal`).
 *
 * Design: backlog/decisions/D-006-versioning.md
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { URL as NodeURL } from "node:url";
import { fileURLToPath } from "node:url";

export interface PackageMeta {
  /** Package name, e.g. `@archont561/tools`. Required. */
  name: string;
  /** Semantic version (prerelease and build metadata allowed). Required. */
  version: string;
  description?: string;
  license?: string;
  /** Defaults to `false` when absent. */
  private: boolean;
  /** Defaults to `"module"` when absent. */
  type: "module" | "commonjs";
  packageManager?: string;
  workspaces?: string[];
  engines?: Record<string, string>;
  /** The full parsed document, for fields outside this interface. */
  raw: Record<string, unknown>;
}

const SEMVER =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;

function fail(source: string, message: string): never {
  throw new Error(`package-meta: ${source}: ${message}`);
}

function optionalString(source: string, key: string, value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") fail(source, `"${key}" must be a string`);
  return value;
}

function parseName(doc: Record<string, unknown>, source: string): string {
  const name = doc.name;
  if (typeof name !== "string" || name.length === 0) {
    fail(source, `"name" must be a non-empty string`);
  }
  return name;
}

function parseVersion(doc: Record<string, unknown>, source: string): string {
  const version = doc.version;
  if (typeof version !== "string" || !SEMVER.test(version)) {
    fail(source, `"version" must be a semantic version, got ${JSON.stringify(version)}`);
  }
  return version;
}

function parseWorkspaces(doc: Record<string, unknown>, source: string): string[] | undefined {
  if (doc.workspaces === undefined) return undefined;
  if (!Array.isArray(doc.workspaces) || doc.workspaces.some((entry) => typeof entry !== "string")) {
    fail(source, `"workspaces" must be an array of strings`);
  }
  return [...(doc.workspaces as string[])];
}

function parseEngines(
  doc: Record<string, unknown>,
  source: string,
): Record<string, string> | undefined {
  if (doc.engines === undefined) return undefined;
  if (typeof doc.engines !== "object" || doc.engines === null || Array.isArray(doc.engines)) {
    fail(source, `"engines" must be an object`);
  }
  const engines: Record<string, string> = {};
  for (const [key, value] of Object.entries(doc.engines as Record<string, unknown>)) {
    if (typeof value !== "string") fail(source, `"engines.${key}" must be a string`);
    engines[key] = value;
  }
  return engines;
}

/** Validate an already-parsed JSON document as `PackageMeta`. */
export function parsePackageMeta(raw: unknown, source = "package.json"): PackageMeta {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    fail(source, "manifest must be a JSON object");
  }
  const doc = raw as Record<string, unknown>;

  const isPrivate = doc.private ?? false;
  if (typeof isPrivate !== "boolean") fail(source, `"private" must be a boolean`);

  const type = doc.type ?? "module";
  if (type !== "module" && type !== "commonjs") {
    fail(source, `"type" must be "module" or "commonjs"`);
  }

  return {
    name: parseName(doc, source),
    version: parseVersion(doc, source),
    description: optionalString(source, "description", doc.description),
    license: optionalString(source, "license", doc.license),
    private: isPrivate,
    type,
    packageManager: optionalString(source, "packageManager", doc.packageManager),
    workspaces: parseWorkspaces(doc, source),
    engines: parseEngines(doc, source),
    raw: doc,
  };
}

const cache = new Map<string, PackageMeta>();

/**
 * Load the nearest package.json above `from` (a module file path or file URL,
 * normally `import.meta.url`) as a typed `PackageMeta`. Results are cached per
 * manifest path; repeated lookups return the same instance.
 */
export function readPackageMeta(from: string | NodeURL = import.meta.url): PackageMeta {
  const start =
    typeof from === "string"
      ? from.startsWith("file://")
        ? fileURLToPath(from)
        : from
      : fileURLToPath(from);
  let dir = dirname(start);
  for (;;) {
    const candidate = join(dir, "package.json");
    const cached = cache.get(candidate);
    if (cached) return cached;
    if (existsSync(candidate)) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(readFileSync(candidate, "utf8"));
      } catch (error) {
        fail(candidate, `invalid JSON: ${(error as Error).message}`);
      }
      const meta = parsePackageMeta(parsed, candidate);
      cache.set(candidate, meta);
      return meta;
    }
    const parent = dirname(dir);
    if (parent === dir) fail(start, "no package.json found in any parent directory");
    dir = parent;
  }
}
