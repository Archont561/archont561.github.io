# TASK-009: Automation port — check-structure, readme, agents

**Status:** done · **Milestone:** M1 · **Labels:** tools

First slice of D-010 (the old `doit` automation → citty commands). Each
command lands with an executable `test.scenario` in `features/` and supporting
unit tests in `tests/`.

## Acceptance criteria

- [x] `tools check-structure` (repo contract incl. `tools/dist` absence, root
      files, version hygiene via package-meta)
- [x] `tools readme` renders `templates/README.md.ejs` from package-meta
      (EJS directly, without the stale readme-md-generator CLI)
- [x] `tools agents` refreshes `AGENTS.md` marked regions
- [x] Applicable old automation scenarios ported to `test.scenario`
- [x] `pixi run` tasks + lefthook wired to the new commands

The generators have non-writing `--check` modes. README writes are atomic and
refuse unresolved legacy backups; agents-md runs in a disposable staging area,
with project policies and human notes outside the regenerated markers. See
[DOC-003](../docs/DOC-003-tools-cli.md) for the contract and commands.
