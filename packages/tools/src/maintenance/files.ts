import {
  chmodSync,
  lstatSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join } from "node:path";

export function pathExists(path: string): boolean {
  try {
    lstatSync(path);
    return true;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT" || code === "ENOTDIR") return false;
    throw error;
  }
}

/** Compute before writing; replace a regular file atomically and preserve its mode. */
export function updateTextFile(path: string, content: string, check: boolean): boolean {
  let mode: number | undefined;
  let existing: string | undefined;
  if (pathExists(path)) {
    const stat = lstatSync(path);
    if (!stat.isFile()) throw new Error(`${path}: refusing to replace a non-regular file`);
    mode = stat.mode & 0o777;
    existing = readFileSync(path, "utf8");
  }
  if (existing === content) return false;
  if (check) return true;

  const temporary = mkdtempSync(join(dirname(path), `.${basename(path)}-`));
  try {
    const staged = join(temporary, "content");
    writeFileSync(staged, content, { flag: "wx" });
    if (mode !== undefined) chmodSync(staged, mode);
    renameSync(staged, path);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
  return true;
}
