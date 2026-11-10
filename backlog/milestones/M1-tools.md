# M1: tools — CLI, shared configs, automation port

**Status:** in progress · **Depends on:** M0 · **Decisions:** D-005, D-010

## Scope

- citty command autodiscovery (`commands/*.ts`, filename = name, default-export
  contract) replacing the stub registry (D-005).
- Shared configs in `tools`: TS base/app/package/worker JSONs, bunup factory,
  UnoCSS preset, Biome base — consumed by all workspaces (DRY).
- Automation port (D-010), in order: `check-structure` → `readme` / `agents`
  (EJS templates + agents-md) → `watch-repos` / `registries` →
  `docs-link-check` / `devcontainer`.
- Task kernel (DOC-013, TASK-011): doit-style runner (DAG, skip-if-clean
  `fileDep` state, `upToDate`, preset factories) in `tools`, surfaced as
  `pixi run tools task`; day-one tasks `docs:index`, `version:sync`.
- README/AGENTS generation wired to package-meta; `backlog` CLI usage doc.
- Pixi tasks for vale/alint in `check`; `.github/workflows` extended as needed.

## Exit criteria

- [ ] `pixi run tools <command>` works for every ported command
- [ ] `pixi run tools task <name>` runs the kernel: skip-if-clean proven
      (docs:index / version:sync + `readme:check:*` preset), `--force`/`--dry-run` work
- [ ] Old Python behaviours covered by `features/` `test.scenario` specs
- [ ] No Python/doit left in the repo
- [ ] `tools/dist` never exists (enforced by `check-structure`)
- [ ] `bun run check` green including new suites
