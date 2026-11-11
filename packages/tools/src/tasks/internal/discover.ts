import type { Dirent } from "node:fs";
import { readdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { type Task, type Tasks, task } from "../index.ts";

export interface RegisteredTask {
  task: Task;
  source: string;
}

async function registryFiles(directory: string): Promise<string[]> {
  let entries: Dirent[];
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  return entries
    .filter(
      (entry) =>
        entry.isFile() && entry.name.endsWith(".ts") && !/\.(?:d|test|spec)\.ts$/.test(entry.name),
    )
    .map((entry) => resolve(directory, entry.name))
    .sort();
}

async function loadRegistry(file: string, source: string, root: string): Promise<Tasks> {
  try {
    const module: { default?: unknown; createTasks?: (root: string) => unknown } = await import(
      pathToFileURL(file).href
    );
    if (!Array.isArray(module.default)) throw new TypeError("default export must be a Tasks array");
    const value = module.createTasks ? module.createTasks(root) : module.default;
    if (!Array.isArray(value)) throw new TypeError("createTasks must return a Tasks array");
    return value.map(task);
  } catch (cause) {
    throw new Error(
      `Cannot load task registry ${source}: ${cause instanceof Error ? cause.message : String(cause)}`,
      { cause },
    );
  }
}

/** Merge top-level built-ins and repo registries, retaining their source files. */
export async function discoverTasks(
  root: string,
  builtinDirectory = fileURLToPath(new URL("../", import.meta.url)),
): Promise<RegisteredTask[]> {
  const result: RegisteredTask[] = [];
  const seen = new Map<string, string>();
  for (const directory of [builtinDirectory, join(root, "tasks")]) {
    for (const file of await registryFiles(directory)) {
      const source = relative(root, file).replaceAll("\\", "/");
      for (const item of await loadRegistry(file, source, root)) {
        const previous = seen.get(item.name);
        if (previous)
          throw new Error(
            `Duplicate task ${JSON.stringify(item.name)} in ${previous} and ${source}`,
          );
        seen.set(item.name, source);
        result.push({ task: item, source });
      }
    }
  }
  return result;
}
