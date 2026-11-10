#!/usr/bin/env bun
/**
 * Scaffold CLI: exposes only `version` (the implemented helper).
 * Command autodiscovery and the full command set land in M1 — see
 * backlog/decisions/D-005-tools-cli.md and backlog/docs/DOC-003-tools-cli.md.
 */
import { defineCommand, runMain } from "citty";
import { readPackageMeta } from "@/src/package-meta/index.ts";

const meta = readPackageMeta(import.meta.url);

const versionCommand = defineCommand({
  meta: {
    name: "version",
    description: "Print the tools package name and version",
  },
  run() {
    // Explicit output channel (PCC-S01: no console debug prints in code).
    process.stdout.write(`${meta.name} ${meta.version}\n`);
  },
});

runMain(
  defineCommand({
    meta: {
      name: "tools",
      version: meta.version,
      description: "Archont561 repo automation (scaffold: `version` only, see backlog/)",
    },
    subCommands: {
      version: versionCommand,
    },
  }),
);
