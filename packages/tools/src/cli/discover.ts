import { readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { CommandDef, CommandMeta, SubCommandsDef } from "citty";

const commandName = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isResolvableRecord(value: unknown): boolean {
  return isRecord(value) || typeof value === "function";
}

function assertCommand(value: unknown): asserts value is CommandDef {
  if (!isRecord(value)) {
    throw new TypeError("the default export must be a citty command object");
  }
  const hasRun = typeof value.run === "function";
  const hasSubCommands = isResolvableRecord(value.subCommands);
  if ((!hasRun && !hasSubCommands) || (value.run !== undefined && !hasRun)) {
    throw new TypeError("the command must have a callable run or subCommands");
  }
  for (const key of ["setup", "cleanup"] as const) {
    if (value[key] !== undefined && typeof value[key] !== "function") {
      throw new TypeError(`the command's ${key} must be a function`);
    }
  }
  for (const key of ["args", "subCommands"] as const) {
    if (value[key] !== undefined && !isResolvableRecord(value[key])) {
      throw new TypeError(`the command's ${key} must be an object or resolver`);
    }
  }
}

async function commandMetadata(command: CommandDef): Promise<CommandMeta> {
  const metadata: unknown =
    typeof command.meta === "function" ? await command.meta() : await command.meta;
  if (metadata === undefined) return {};
  if (!isRecord(metadata)) throw new TypeError("the command's meta must resolve to an object");
  return metadata as CommandMeta;
}

async function loadCommand(file: string, name: string): Promise<CommandDef> {
  try {
    const module: { default?: unknown } = await import(pathToFileURL(file).href);
    assertCommand(module.default);
    const meta = await commandMetadata(module.default);
    // The filename is authoritative even when a module supplies meta.name.
    return { ...module.default, meta: { ...meta, name } };
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    throw new Error(`Failed to load command "${name}" from ${file}: ${detail}`, { cause });
  }
}

/** Discover command names without importing their modules. */
export async function discoverCommands(directory: string | URL): Promise<SubCommandsDef> {
  const path = directory instanceof URL ? fileURLToPath(directory) : directory;
  const absolutePath = resolve(path);
  const entries = (await readdir(absolutePath, { withFileTypes: true })).sort((a, b) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
  );
  const commands: SubCommandsDef = Object.create(null);
  for (const entry of entries) {
    if (
      !entry.isFile() ||
      !entry.name.endsWith(".ts") ||
      /\.(?:d|test|spec)\.ts$/.test(entry.name)
    ) {
      continue;
    }
    const name = entry.name.slice(0, -3);
    if (!commandName.test(name)) {
      throw new Error(`Invalid command filename "${entry.name}": use a kebab-case .ts filename`);
    }
    commands[name] = () => loadCommand(join(absolutePath, entry.name), name);
  }
  return commands;
}
