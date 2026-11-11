# M1: tools — CLI, shared configs, automation port

**Status:** done · **Depends on:** M0 · **Decisions:** D-005, D-010

CLI discovery, shared configs, the M1 automation port, and the task kernel are
implemented. M2–M4 application, release, and SEO work remains separate.

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

- [x] `pixi run tools <command>` works for every ported command
- [x] `pixi run tools task <name>` runs the kernel: skip-if-clean proven
      (docs:index / version:sync + `readme:check:*` preset), `--force`/`--dry-run` work
- [x] Applicable old automation behaviours covered by `features/` `test.scenario` specs
- [x] No repo-owned Python/doit automation; vendored PCC test fixtures and Semgrep runtime remain
- [x] `tools/dist` never exists (enforced by `check-structure`)
- [x] `bun run check` green including new suites
