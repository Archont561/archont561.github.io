import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { updateTextFile } from "@/src/maintenance/files.ts";
import { readManifest } from "@/src/maintenance/workspaces.ts";

const managedSections = new Set([
  "overview",
  "commands",
  "testing",
  "structure",
  "conventions",
  "git",
  "gotchas",
  "security",
  "boundaries",
]);

interface Region {
  id: string;
  beginEnd: number;
  endStart: number;
  endEnd: number;
}

function markerTokens(text: string): RegExpMatchArray[] {
  const tokens = /<!--\s*agents-md:(?:begin|end)\b[\s\S]*?-->/g;
  const starts = /<!--\s*agents-md:(?:begin|end)\b/g;
  const matches = [...text.matchAll(tokens)];
  if (matches.length !== [...text.matchAll(starts)].length) {
    throw new Error("Unclosed or malformed agents-md marker");
  }
  return matches;
}

/** Reject ambiguous markers instead of letting the upstream regex swallow notes. */
function markedRegions(text: string): Region[] {
  const regions: Region[] = [];
  const seen = new Set<string>();
  let open: { id: string; beginEnd: number } | undefined;
  for (const match of markerTokens(text)) {
    const token = /^<!-- agents-md:(begin|end) id=([a-z][a-z0-9-]*) -->$/.exec(match[0]);
    const kind = token?.[1];
    const id = token?.[2];
    if (!id || match.index === undefined) throw new Error("Invalid agents-md marker");
    if (kind === "begin") {
      if (open || seen.has(id)) throw new Error(`Nested or duplicate agents-md marker: ${id}`);
      seen.add(id);
      open = { id, beginEnd: match.index + match[0].length };
      continue;
    }
    if (!open || open.id !== id) throw new Error(`Unmatched agents-md end marker: ${id}`);
    regions.push({
      id,
      beginEnd: open.beginEnd,
      endStart: match.index,
      endEnd: match.index + match[0].length,
    });
    open = undefined;
  }
  if (open) throw new Error(`Unclosed agents-md marker: ${open.id}`);
  if (!regions.some(({ id }) => managedSections.has(id))) {
    throw new Error(
      "AGENTS.md has no recognized agents-md markers; existing guidance was not changed",
    );
  }
  return regions;
}

function outsideRegions(text: string, regions: Region[]): string {
  let cursor = 0;
  let result = "";
  for (const region of regions) {
    if (!managedSections.has(region.id)) continue;
    result += text.slice(cursor, region.beginEnd) + text.slice(region.endStart, region.endEnd);
    cursor = region.endEnd;
  }
  return result + text.slice(cursor);
}

/** Normalize only generated commands; npm examples in human-owned notes stay intact. */
export function normalizeAgentCommands(text: string): string {
  const region = markedRegions(text).find(({ id }) => id === "commands");
  if (!region) return text;
  const body = text
    .slice(region.beginEnd, region.endStart)
    .replaceAll("npm install", "bun install --frozen-lockfile")
    .replaceAll("npm run ", "bun run ");
  return text.slice(0, region.beginEnd) + body + text.slice(region.endStart);
}

const structureNoise = new Set([
  "node_modules",
  "dist",
  "build",
  "out",
  "target",
  "vendor",
  "__pycache__",
  "venv",
  "coverage",
]);

/** The upstream generator uses filesystem iteration order; normalize its structure line. */
function normalizeStructure(text: string, root: string): string {
  const region = markedRegions(text).find(({ id }) => id === "structure");
  if (!region) return text;
  const dirs = readdirSync(root, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() && !entry.name.startsWith(".") && !structureNoise.has(entry.name),
    )
    .map((entry) => entry.name)
    .sort()
    .slice(0, 12);
  const listing = `Top-level: ${dirs.map((dir) => `\`${dir}/\``).join(", ")}.`;
  const body = text
    .slice(region.beginEnd, region.endStart)
    .replace(" _TBD: note where the important code lives_", "")
    .replace(/^Top-level: .*$/m, listing);
  return text.slice(0, region.beginEnd) + body + text.slice(region.endStart);
}

function runAgentsMd(staging: string): void {
  const env: NodeJS.ProcessEnv = { ...process.env, GIT_CEILING_DIRECTORIES: staging };
  for (const name of ["GIT_DIR", "GIT_WORK_TREE", "GIT_COMMON_DIR", "GIT_INDEX_FILE"]) {
    delete env[name];
  }
  const agentCli = createRequire(import.meta.url).resolve(
    "@eugeniughelbur/agents-md/bin/agents-md.js",
  );
  const result = spawnSync(process.execPath, [agentCli, "--no-symlink"], {
    cwd: staging,
    encoding: "utf8",
    env,
  });
  if (result.error || result.status !== 0) {
    throw new Error(
      `agents-md failed: ${result.error?.message ?? (result.stderr.trim() || `exit ${result.status}`)}`,
    );
  }
}

/**
 * Run the installed agents-md CLI in a disposable copy of its input facts. It
 * cannot touch the real file or create CLAUDE.md; we verify its marker boundary
 * before atomically publishing the result.
 */
export function renderAgents(root: string, generate = runAgentsMd): string {
  const file = join(root, "AGENTS.md");
  const original = readFileSync(file, "utf8");
  const before = markedRegions(original);
  // Validate package metadata through the shared parser before passing it on.
  const meta = readManifest(join(root, "package.json"));
  const staging = mkdtempSync(join(tmpdir(), "tools-agents-"));
  try {
    writeFileSync(join(staging, "AGENTS.md"), original);
    writeFileSync(join(staging, "package.json"), `${JSON.stringify(meta.raw, null, 2)}\n`);
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      if (entry.isDirectory() && !entry.name.startsWith(".")) {
        mkdirSync(join(staging, entry.name), { recursive: true });
      }
    }
    generate(staging);
    const generated = normalizeStructure(
      normalizeAgentCommands(readFileSync(join(staging, "AGENTS.md"), "utf8")),
      root,
    );
    const after = markedRegions(generated);
    if (
      before.map(({ id }) => id).join("\0") !== after.map(({ id }) => id).join("\0") ||
      outsideRegions(original, before) !== outsideRegions(generated, after)
    ) {
      throw new Error(
        "agents-md tried to change content outside its markers; AGENTS.md was not changed",
      );
    }
    return generated;
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
}

export function updateAgents(root: string, check = false): boolean {
  return updateTextFile(join(root, "AGENTS.md"), renderAgents(root), check);
}
