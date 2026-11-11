import { spyOn } from "bun:test";
import { rmSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@archont561/bun-test-utils";
import { runCommand } from "citty";
import agentsCommand from "@/src/cli/commands/agents.ts";
import structureCommand from "@/src/cli/commands/check-structure.ts";
import readmeCommand from "@/src/cli/commands/readme.ts";
import { createRepository, writeFixture } from "@/tests/fixtures/task009.ts";

test("check-structure command reports violations and succeeds when repaired", async ({
  tmpdir,
}) => {
  createRepository(tmpdir.dir);
  rmSync(join(tmpdir.dir, "README.md"));
  const args = ["--root", tmpdir.dir];
  await expect(runCommand(structureCommand, { rawArgs: args })).rejects.toThrow("README.md");
  writeFixture(tmpdir.dir, "README.md", "fixture\n");
  const output = spyOn(process.stdout, "write").mockImplementation(() => true);
  try {
    await runCommand(structureCommand, { rawArgs: args });
    expect(output).toHaveBeenCalledWith("Repository structure validated.\n");
  } finally {
    output.mockRestore();
  }
});

test("readme command detects drift, generates, then checks cleanly", async ({ tmpdir }) => {
  createRepository(tmpdir.dir);
  const args = ["--root", tmpdir.dir];
  await expect(runCommand(readmeCommand, { rawArgs: [...args, "--check"] })).rejects.toThrow(
    "out of date",
  );
  const output = spyOn(process.stdout, "write").mockImplementation(() => true);
  try {
    await runCommand(readmeCommand, { rawArgs: args });
    await runCommand(readmeCommand, { rawArgs: [...args, "--check"] });
    expect(output).toHaveBeenCalledWith("Updated README.md.\n");
    expect(output).toHaveBeenCalledWith("README.md is up to date.\n");
  } finally {
    output.mockRestore();
  }
});

test("agents command detects drift, refreshes, then checks cleanly", async ({ tmpdir }) => {
  createRepository(tmpdir.dir);
  writeFixture(
    tmpdir.dir,
    "AGENTS.md",
    "<!-- agents-md:begin id=commands -->\nold\n<!-- agents-md:end id=commands -->\n",
  );
  const args = ["--root", tmpdir.dir];
  await expect(runCommand(agentsCommand, { rawArgs: [...args, "--check"] })).rejects.toThrow(
    "out of date",
  );
  const output = spyOn(process.stdout, "write").mockImplementation(() => true);
  try {
    await runCommand(agentsCommand, { rawArgs: args });
    await runCommand(agentsCommand, { rawArgs: [...args, "--check"] });
    expect(output).toHaveBeenCalledWith("Updated marked AGENTS.md regions.\n");
    expect(output).toHaveBeenCalledWith("AGENTS.md is up to date.\n");
  } finally {
    output.mockRestore();
  }
});
