import { spyOn } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, test } from "@archont561/bun-test-utils";
import { type CommandDef, runCommand, type SubCommandsDef } from "citty";
import { createCli, showCliUsage } from "@/src/cli/app.ts";
import versionCommand from "@/src/cli/commands/version.ts";
import { discoverCommands } from "@/src/cli/discover.ts";
import { readPackageMeta } from "@/src/package-meta/index.ts";

const testWithCommands = test.extend({
  directory: {
    setup: async (use) => {
      const directory = mkdtempSync(join(tmpdir(), "tools commands "));
      try {
        await use(directory);
      } finally {
        rmSync(directory, { recursive: true, force: true });
      }
    },
  },
});

async function load(commands: SubCommandsDef, name: string): Promise<CommandDef> {
  const loader = commands[name];
  if (typeof loader !== "function") throw new Error(`No loader for ${name}`);
  return loader();
}

function runCli(...args: string[]) {
  const entry = fileURLToPath(new URL("../src/cli/index.ts", import.meta.url));
  return spawnSync(process.execPath, [entry, ...args], {
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
  });
}

testWithCommands(
  "only registers top-level command TypeScript files in name order",
  async ({ directory }) => {
    for (const name of [
      "zeta.ts",
      "alpha-command.ts",
      "definitions.d.ts",
      "unit.test.ts",
      "unit.spec.ts",
      "ignored.js",
      "ignored.tsx",
    ]) {
      writeFileSync(join(directory, name), "export default { run() {} };\n");
    }
    mkdirSync(join(directory, "nested.ts"));
    writeFileSync(join(directory, "nested.ts", "inside.ts"), "throw new Error('not a command');");

    const commands = await discoverCommands(pathToFileURL(`${directory}/`));
    expect(Object.keys(commands)).toEqual(["alpha-command", "zeta"]);
    expect("toString" in commands).toBe(false);
  },
);

testWithCommands("imports only the selected command when it runs", async ({ directory }) => {
  const marker = join(directory, "loaded-marker");
  writeFileSync(join(directory, "active.ts"), "export default { run() {} };\n");
  writeFileSync(
    join(directory, "other.ts"),
    `import { writeFileSync } from 'node:fs';\nwriteFileSync(${JSON.stringify(marker)}, 'loaded');\nexport default { run() {} };\n`,
  );

  const cli = await createCli(directory);
  expect(existsSync(marker)).toBe(false);
  await runCommand(cli, { rawArgs: ["active"] });
  expect(existsSync(marker)).toBe(false);
  const commands = await discoverCommands(directory);
  await load(commands, "other");
  expect(existsSync(marker)).toBe(true);
});

testWithCommands(
  "uses the filename for the command name even when metadata disagrees",
  async ({ directory }) => {
    writeFileSync(
      join(directory, "hello-world.ts"),
      "export default { meta: async () => ({ name: 'different', description: 'Greeting' }), run() {} };\n",
    );
    const command = await load(await discoverCommands(directory), "hello-world");
    expect(command.meta).toEqual({ name: "hello-world", description: "Greeting" });
  },
);

testWithCommands("rejects non-kebab command filenames", async ({ directory }) => {
  writeFileSync(join(directory, "Bad_Name.ts"), "export default { run() {} };\n");
  await expect(discoverCommands(directory)).rejects.toThrow(/Invalid command filename.*kebab-case/);
});

testWithCommands(
  "reports bad exports, metadata, and import failures with the command name",
  async ({ directory }) => {
    const fixtures = {
      missing: "export const command = {};",
      primitive: "export default 42;",
      empty: "export default {};",
      badrun: "export default { run: true };",
      badmeta: "export default { meta: 'invalid', run() {} };",
      syntax: "this is not valid TypeScript!!!",
    };
    for (const [name, contents] of Object.entries(fixtures)) {
      writeFileSync(join(directory, `${name}.ts`), contents);
    }
    const commands = await discoverCommands(directory);
    for (const name of Object.keys(fixtures)) {
      await expect(load(commands, name)).rejects.toThrow(`Failed to load command "${name}"`);
    }
  },
);

testWithCommands(
  "accepts a group with subcommands and reports an empty directory",
  async ({ directory }) => {
    await expect(createCli(directory)).rejects.toThrow("No command modules found");
    writeFileSync(join(directory, "group.ts"), "export default { subCommands: {} };\n");
    expect((await load(await discoverCommands(directory), "group")).subCommands).toEqual({});
  },
);

testWithCommands(
  "help renders discovered metadata and propagates module errors",
  async ({ directory }) => {
    writeFileSync(
      join(directory, "sample.ts"),
      'export default { meta: { description: "Sample command" }, run() {} };\n',
    );
    const cli = await createCli(directory);
    const output = spyOn(process.stdout, "write").mockImplementation(() => true);
    try {
      await showCliUsage(cli);
      expect(output).toHaveBeenCalledTimes(1);
      expect(output.mock.calls[0]?.[0]).toContain("Sample command");
    } finally {
      output.mockRestore();
    }
    writeFileSync(join(directory, "broken.ts"), "export default {};\n");
    await expect(showCliUsage(await createCli(directory))).rejects.toThrow(
      'Failed to load command "broken"',
    );
  },
);

describe("tools CLI", () => {
  test("version command prints the tools package metadata", async () => {
    const output = spyOn(process.stdout, "write").mockImplementation(() => true);
    try {
      await runCommand(versionCommand, { rawArgs: [] });
      const meta = readPackageMeta(import.meta.url);
      expect(output).toHaveBeenCalledWith(`${meta.name} ${meta.version}\n`);
    } finally {
      output.mockRestore();
    }
  });

  test("version retains its existing output", () => {
    const result = runCli("version");
    const meta = readPackageMeta(import.meta.url);
    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toBe(`${meta.name} ${meta.version}\n`);
  });

  test("root help lists discovered commands", () => {
    const result = runCli("--help");
    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout.replaceAll("\r\n", "\n")).toMatchSnapshot();
  });
});
