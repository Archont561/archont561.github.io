import { readFileSync } from "node:fs";
import { join } from "node:path";
import ejs from "ejs";
import { pathExists, updateTextFile } from "@/src/maintenance/files.ts";
import { readManifest, readWorkspaces } from "@/src/maintenance/workspaces.ts";

/** Render trusted repository templates with metadata from the checked manifests. */
export function renderReadme(root: string): string {
  const template = join(root, "templates/README.md.ejs");
  const rootMeta = readManifest(join(root, "package.json"));
  const workspaces = readWorkspaces(root, rootMeta);
  const text = ejs.render(
    readFileSync(template, "utf8"),
    { root: rootMeta, workspaces },
    { filename: template },
  );
  if (!text.trim()) throw new Error(`${template}: README generator produced no content`);
  return text;
}

/** Never touch an unresolved backup from the previous README generator. */
export function updateReadme(root: string, check = false): boolean {
  const previous = join(root, ".README.previous");
  if (pathExists(previous)) throw new Error(`Recover ${previous} before regenerating README.md`);
  return updateTextFile(join(root, "README.md"), renderReadme(root), check);
}
