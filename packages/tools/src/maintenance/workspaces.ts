import { readFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { type PackageMeta, parsePackageMeta } from "../package-meta/index.ts";

export interface Workspace {
  /** Repository-relative path with forward slashes. */
  path: string;
  meta: PackageMeta;
}

/** These commands are repo-internal, so their default is independent of cwd. */
export function repositoryRoot(root?: string): string {
  return root === undefined
    ? fileURLToPath(new URL("../../../../", import.meta.url))
    : resolve(root);
}

/** Read fresh metadata rather than the module loader's long-lived cache. */
export function readManifest(path: string): PackageMeta {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, "utf8"));
  } catch (cause) {
    throw new Error(
      `Cannot read ${path}: ${cause instanceof Error ? cause.message : String(cause)}`,
      {
        cause,
      },
    );
  }
  return parsePackageMeta(raw, path);
}

function validatePattern(pattern: string): string {
  const normalized = pattern.replace(/\/+$/, "");
  if (
    !normalized ||
    normalized.startsWith("!") ||
    isAbsolute(normalized) ||
    normalized.includes("\\") ||
    normalized.split("/").some((part) => part === ".." || part === ".")
  ) {
    throw new Error(`Unsafe or unsupported workspace pattern: ${JSON.stringify(pattern)}`);
  }
  return normalized;
}

/** Resolve declared workspaces deterministically, without scanning dependency trees. */
export function workspaceManifestPaths(root: string, meta: PackageMeta): string[] {
  if (!meta.workspaces?.length) throw new Error("package.json must declare workspaces");
  const paths = new Set<string>();
  for (const rawPattern of meta.workspaces) {
    const pattern = validatePattern(rawPattern);
    const matches = [
      ...new Bun.Glob(`${pattern}/package.json`).scanSync({ cwd: root, onlyFiles: true }),
    ];
    if (matches.length === 0)
      throw new Error(`Workspace pattern has no package.json: ${rawPattern}`);
    for (const path of matches) paths.add(path.split(sep).join("/"));
  }
  return [...paths].sort();
}

export function readWorkspaces(
  root: string,
  rootMeta = readManifest(join(root, "package.json")),
): Workspace[] {
  return workspaceManifestPaths(root, rootMeta).map((path) => ({
    path: dirname(path).split(sep).join("/"),
    meta: readManifest(join(root, path)),
  }));
}
