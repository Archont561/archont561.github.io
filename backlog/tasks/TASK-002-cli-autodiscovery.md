# TASK-002: citty command autodiscovery in tools CLI

**Status:** done · **Milestone:** M1 · **Labels:** tools

Replace the stub `subCommands` registry (D-005, DOC-012).

## Acceptance criteria

- [x] `src/cli/index.ts` discovers `src/cli/commands/*.ts` (kebab filename =
      command name, lazy import, `.ts`-only filter, shape-check on load)
- [x] `version` moved to `commands/version.ts` and behaves as today
- [x] Given/When/Then `test.scenario`: unknown/broken command module fails with a clear error
- [x] Root `--help` lists discovered commands; snapshot test locks the output
- [x] `pixi run tools version` still green
