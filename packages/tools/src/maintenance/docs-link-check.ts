import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, statSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { pathExists } from "./files.ts";

export interface LinkCheckOptions {
  root: string;
  offline?: boolean;
  siteDir?: string;
  basePath?: string;
  binary?: string;
}

/** Reject traversal, URL escapes and ambiguous paths before making a staging symlink. */
export function normalizeBasePath(base = ""): string {
  if (base === "" || base === "/") return "";
  const value = base.replace(/\/$/, "");
  if (
    !/^\/(?:[A-Za-z0-9._~-]+\/)*[A-Za-z0-9._~-]+$/.test(value) ||
    value.split("/").some((part) => part === "." || part === "..")
  )
    throw new Error(`Unsafe site base path: ${base}`);
  return value;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function siteArguments(root: string, options: LinkCheckOptions, stage: string): string[] {
  const base = normalizeBasePath(options.basePath);
  const siteDir = options.siteDir;
  if (!siteDir) {
    if (base) throw new Error("A base path requires --site-dir");
    return ["--root-dir", root];
  }
  if (
    isAbsolute(siteDir) ||
    siteDir.split(/[\\/]/).some((part) => part === "..") ||
    /[?*{}[\]\\]/.test(siteDir)
  ) {
    throw new Error(`Unsafe site directory: ${siteDir}`);
  }
  const out = resolve(root, siteDir);
  if (relative(root, out).startsWith("..") || !pathExists(out) || !statSync(out).isDirectory()) {
    throw new Error(`Static export directory not found: ${siteDir}`);
  }
  if (base) {
    const destination = join(stage, base.slice(1));
    mkdirSync(resolve(destination, ".."), { recursive: true });
    symlinkSync(out, destination, "dir");
  }
  return [
    "--root-dir",
    base ? stage : out,
    "--remap",
    `^${escapeRegex(`https://archont561.github.io${base}/`)}(.*) ${pathToFileURL(`${out}/`).href}$1`,
  ];
}

function linkInputs(root: string, siteDir?: string): string[] {
  if (!pathExists(join(root, ".lychee.toml"))) throw new Error("Missing .lychee.toml");
  const docs = [
    ...new Bun.Glob("docs/**/*.{md,mdx}").scanSync({ cwd: root, onlyFiles: true }),
  ].sort();
  if (!pathExists(join(root, "README.md")) || !docs.length) {
    throw new Error("README.md and at least one documentation file are required");
  }
  const inputs = ["README.md", ...docs];
  if (siteDir) {
    const html = [
      ...new Bun.Glob("**/*.html").scanSync({ cwd: join(root, siteDir), onlyFiles: true }),
    ].sort();
    if (!html.length) throw new Error(`${siteDir}: no HTML files to check`);
    inputs.push(...html.map((file) => `${siteDir}/${file}`));
  }
  return inputs;
}

/** Map the published project prefix to an optional local static export. */
export function linkArguments(options: LinkCheckOptions, stage: string): string[] {
  const root = resolve(options.root);
  const args = [
    "--config",
    join(root, ".lychee.toml"),
    "--no-progress",
    "--default-extension",
    "md",
  ];
  if (options.offline) args.push("--offline");
  args.push(...siteArguments(root, options, stage));
  return [...args, "--", ...linkInputs(root, options.siteDir)];
}

/** Run the actual lychee binary and clean up its temporary project-prefix root. */
export function checkDocsLinks(options: LinkCheckOptions): void {
  const stage = mkdtempSync(join(tmpdir(), "tools-links-"));
  try {
    const args = linkArguments(options, stage);
    const result = spawnSync(options.binary ?? "lychee", args, {
      cwd: options.root,
      encoding: "utf8",
    });
    if (result.error)
      throw new Error(`Could not start lychee: ${result.error.message}`, { cause: result.error });
    if (result.status !== 0)
      throw new Error(
        `lychee failed (exit ${result.status ?? result.signal}):\n${result.stdout}${result.stderr}`,
      );
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
  } finally {
    rmSync(stage, { recursive: true, force: true });
  }
}
