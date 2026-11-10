# D-005: Tools CLI (citty, autodiscovery, TS-native)

**Status:** accepted · **Date:** 2026-11-10

## Context

Repo automation (structure checks, README/AGENTS generation, registry watches,
AI exports) must not live in ad-hoc scripts. It replaces the Python `doit`
automation of the previous repo. Scope: **this repository only**.

## Decision

- **citty** (unjs) — zero-dependency, TS-first, `defineCommand`/`runMain`,
  lazy subcommands, native `util.parseArgs`.
- **Command autodiscovery:** `src/cli/index.ts` scans `src/cli/commands/*.ts`;
  the kebab-case filename is the command name; each module default-exports a
  citty `Command` (shape-checked on load with a clear error). No registry file
  to maintain. Nested subdirectories may later map to command groups.
- **TS-only:** discovery accepts `*.ts` (excluding `*.d.ts`, `*.test.ts`, and
  `*.spec.ts`);
  there is no build step and `packages/tools/dist` must never exist
  (`check-structure` asserts this). Typecheck is `tsc --noEmit`.
- **Invocation chain:** `pixi run tools <args>` → `bun run --bun tools <args>`
  → root `package.json` script `tools` → `bun packages/tools/src/cli/index.ts`
  (executed natively as TypeScript by Bun). The workspace `bin` entry mirrors
  the same file for `bunx tools`.
- The initial scaffold exposed only `version`; autodiscovery now loads it from
  `commands/`, while the remaining commands land in M1.

## Consequences

- Adding a command = dropping one file in `commands/` (DOC-012).
- Root `package.json` must keep the `tools` script delegating to the entry
  file — the name is reserved for this chain.
