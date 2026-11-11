import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import type { PackageMeta } from "../package-meta/index.ts";
import { pathExists } from "./files.ts";
import { readManifest, readWorkspaces, workspaceManifestPaths } from "./workspaces.ts";

const requiredFiles = [
  ".alint.yml",
  ".devcontainer/devcontainer.json",
  "AGENTS.md",
  "CONTRIBUTING.md",
  "LICENSE",
  "README.md",
  "apps/github-app/package.json",
  "apps/portfolio/package.json",
  "biome.json",
  "bun.lock",
  "docs/index.mdx",
  "lefthook.yml",
  "package.json",
  "packages/github-app-client/package.json",
  "packages/tools/package.json",
  "pixi-sandbox.toml",
  "pixi.lock",
  "pixi.toml",
  "scripts/restore.sh",
  "templates/README.md.ejs",
  "turbo.json",
];

// These are repository controls, not build tools needed by an application.
const repositoryOnlyDependencies = new Set([
  "@asamarts/alint",
  "@ast-grep/cli",
  "@biomejs/biome",
  "@eugeniughelbur/agents-md",
  "backlog",
  "turbo",
]);
const applicationDependencies = new Set([
  "@hono/zod-openapi",
  "fumadocs-core",
  "hono",
  "next",
  "react",
  "react-dom",
  "unocss",
  "wrangler",
]);

function isFile(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT" || code === "ENOTDIR") return false;
    throw error;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function dependencies(meta: PackageMeta, key: string): string[] {
  const value = meta.raw[key];
  return isRecord(value) ? Object.keys(value) : [];
}

function checkSandbox(root: string, issues: string[]): void {
  const path = join(root, "pixi-sandbox.toml");
  if (!isFile(path)) return;
  try {
    const config: unknown = Bun.TOML.parse(readFileSync(path, "utf8"));
    if (
      !isRecord(config) ||
      config.schema !== 1 ||
      !Array.isArray(config.bundle) ||
      !config.bundle.length
    ) {
      issues.push("pixi-sandbox.toml: a schema-1 sandbox bundle is required");
    }
  } catch (cause) {
    issues.push(
      `pixi-sandbox.toml: invalid TOML: ${cause instanceof Error ? cause.message : String(cause)}`,
    );
  }
}

function validFrontmatter(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.title === "string" &&
    value.title.trim().length > 0 &&
    typeof value.description === "string" &&
    value.description.trim().length > 0
  );
}

function checkPage(file: string, label: string, issues: string[]): void {
  const contents = readFileSync(file, "utf8");
  const match = /^---[\t ]*\r?\n([\s\S]*?)\r?\n---[\t ]*(?:\r?\n|$)([\s\S]*)$/.exec(contents);
  if (!match) issues.push(`${label}: frontmatter required`);
  else {
    try {
      if (!validFrontmatter(Bun.YAML.parse(match[1] ?? ""))) {
        issues.push(`${label}: title and description must be nonempty strings`);
      }
      if (!match[2]?.trim()) issues.push(`${label}: empty content`);
    } catch (cause) {
      issues.push(
        `${label}: invalid frontmatter: ${cause instanceof Error ? cause.message : String(cause)}`,
      );
    }
  }
  if (!isFile(join(dirname(file), "index.mdx"))) {
    issues.push(`${label}: section index.mdx required`);
  }
}

function checkDocs(root: string, issues: string[]): void {
  const docs = join(root, "docs");
  if (!pathExists(docs) || !statSync(docs).isDirectory()) return;
  const files = [...new Bun.Glob("**/*.mdx").scanSync({ cwd: docs, onlyFiles: true })].sort();
  for (const path of files) {
    const file = join(docs, path);
    checkPage(file, relative(root, file).split(sep).join("/"), issues);
  }
}

interface VersionProbe {
  file: string;
  name?: unknown;
  version?: unknown;
  error?: string;
}

function checkVersions(
  root: string,
  workspaces: Array<{ path: string; meta: PackageMeta }>,
  issues: string[],
): void {
  const versions = workspaces.flatMap(({ path, meta }) => {
    const file = join(root, path, "src/version.ts");
    const label = `${path}/src/version.ts`;
    if (!isFile(file)) {
      issues.push(`Missing required file: ${label}`);
      return [];
    }
    if (!/\breadPackageMeta\s*\(\s*import\.meta\.url\s*\)/.test(readFileSync(file, "utf8"))) {
      issues.push(`${label}: derive metadata with readPackageMeta(import.meta.url)`);
    }
    return [{ file, label, meta }];
  });
  if (!versions.length) return;

  const temporary = mkdtempSync(join(tmpdir(), "tools-version-probe-"));
  try {
    const output = join(temporary, "versions.json");
    const probe = fileURLToPath(new URL("./version-probe.ts", import.meta.url));
    const result = spawnSync(
      process.execPath,
      [probe, output, ...versions.map(({ file }) => file)],
      {
        cwd: root,
        encoding: "utf8",
      },
    );
    if (result.error || result.status !== 0 || !isFile(output)) {
      issues.push(
        `Version probe failed: ${result.error?.message ?? (result.stderr.trim() || `exit ${result.status}`)}`,
      );
      return;
    }
    const results = JSON.parse(readFileSync(output, "utf8")) as VersionProbe[];
    const byFile = new Map(results.map((item) => [item.file, item]));
    for (const { file, label, meta } of versions) {
      const actual = byFile.get(file);
      if (!actual) issues.push(`${label}: version probe did not return a result`);
      else if (actual.error)
        issues.push(`${label}: could not load version module: ${actual.error}`);
      else if (actual.name !== meta.name || actual.version !== meta.version) {
        issues.push(
          `${label}: exported name/version do not match package.json (${meta.name} ${meta.version})`,
        );
      }
    }
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

/** Check workspace version modules independently of the broader structure gate. */
export function checkWorkspaceVersions(root: string): string[] {
  const issues: string[] = [];
  checkVersions(root, readWorkspaces(root), issues);
  return issues;
}

function checkWorkspaceMembership(root: string, paths: string[], issues: string[]): void {
  const allManifests = ["apps/*/package.json", "packages/*/package.json"].flatMap((pattern) =>
    [...new Bun.Glob(pattern).scanSync({ cwd: root, onlyFiles: true })].map((p) =>
      p.split(sep).join("/"),
    ),
  );
  for (const path of allManifests) {
    if (!paths.includes(path)) {
      issues.push(`${path}: workspace is not declared in the root manifest`);
    }
  }
}

function checkAppDependencies(path: string, meta: PackageMeta, issues: string[]): void {
  if (!path.startsWith("apps/")) return;
  for (const dep of [
    ...dependencies(meta, "dependencies"),
    ...dependencies(meta, "devDependencies"),
  ]) {
    if (repositoryOnlyDependencies.has(dep)) {
      issues.push(`${path}: repository tooling ${dep} belongs in the root manifest`);
    }
  }
}

function collectWorkspaces(
  root: string,
  paths: string[],
  issues: string[],
): Array<{ path: string; meta: PackageMeta }> {
  const seen = new Map<string, string>();
  const workspaces: Array<{ path: string; meta: PackageMeta }> = [];
  for (const path of paths) {
    try {
      const meta = readManifest(join(root, path));
      const previous = seen.get(meta.name);
      if (previous) issues.push(`${path}: duplicate package name ${meta.name} (also ${previous})`);
      else seen.set(meta.name, path);
      checkAppDependencies(path, meta, issues);
      workspaces.push({ path: dirname(path).split(sep).join("/"), meta });
    } catch (cause) {
      issues.push(cause instanceof Error ? cause.message : String(cause));
    }
  }
  return workspaces;
}

/** Return every actionable contract violation instead of stopping at the first. */
export function checkStructure(root: string): string[] {
  const issues: string[] = [];
  for (const path of requiredFiles) {
    if (!isFile(join(root, path))) issues.push(`Missing required file: ${path}`);
  }
  if (pathExists(join(root, "packages/tools/dist"))) {
    issues.push("packages/tools/dist must not exist: tools run from source");
  }
  for (const legacy of ["automation", "dodo.py", "pytest.ini"]) {
    if (pathExists(join(root, legacy)))
      issues.push(`${legacy}: legacy Python/doit automation must not return`);
  }
  checkSandbox(root, issues);
  checkDocs(root, issues);

  let rootMeta: PackageMeta;
  let paths: string[];
  try {
    rootMeta = readManifest(join(root, "package.json"));
    paths = workspaceManifestPaths(root, rootMeta);
  } catch (cause) {
    issues.push(cause instanceof Error ? cause.message : String(cause));
    return issues;
  }
  for (const dep of dependencies(rootMeta, "dependencies")) {
    if (applicationDependencies.has(dep)) {
      issues.push(`${dep}: application dependencies belong in app manifests, not the root`);
    }
  }
  checkWorkspaceMembership(root, paths, issues);
  checkVersions(root, collectWorkspaces(root, paths, issues), issues);
  return issues;
}
