# TASK-009: Automation port — check-structure, readme, agents

**Status:** not started · **Milestone:** M1 · **Labels:** tools

First slice of D-010 (the old `doit` automation → citty commands). Each
command lands with its `features/` scenario and `tests/` steps.

## Acceptance criteria

- [ ] `tools check-structure` (repo contract incl. `tools/dist` absence, root
      files, version hygiene via package-meta)
- [ ] `tools readme` renders `templates/README.md.ejs` from package-meta
      (readme-md-generator EJS approach — no stale npm dependency)
- [ ] `tools agents` refreshes `AGENTS.md` marked regions
- [ ] Specs ported from the old `automation/features` where applicable
- [ ] `pixi run` tasks + lefthook wired to the new commands
