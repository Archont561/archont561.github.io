import { type ArgsDef, type CommandDef, defineCommand, renderUsage } from "citty";
import { discoverCommands } from "@/src/cli/discover.ts";
import { readPackageMeta } from "@/src/package-meta/index.ts";

/** Build the CLI with lazy command loaders; the directory can be supplied by tests. */
export async function createCli(
  directory: string | URL = new URL("./commands/", import.meta.url),
): Promise<CommandDef> {
  const meta = readPackageMeta(import.meta.url);
  const subCommands = await discoverCommands(directory);
  if (Object.keys(subCommands).length === 0) {
    throw new Error(`No command modules found in ${directory}`);
  }
  return defineCommand({
    meta: {
      name: "tools",
      version: meta.version,
      description: "Archont561 repo automation",
    },
    subCommands,
  });
}

/** Unlike citty's default showUsage, propagate command-loading errors. */
export async function showCliUsage<T extends ArgsDef = ArgsDef>(
  command: CommandDef<T>,
  parent?: CommandDef<T>,
): Promise<void> {
  process.stdout.write(`${await renderUsage(command, parent)}\n\n`);
}
