# M0: Scaffold

**Status:** done (2026-11-10)

## Scope

- Monorepo skeleton: `apps/{portfolio,github-app}`, `packages/{tools,github-app-client}`,
  root configs (package.json, turbo.json, pixi.toml, biome.json, lefthook.yml,
  .alint.yml, .vale.ini), CI workflow (pinned actions), devcontainer, docs stub.
- `@archont561/tools/package-meta`: typed package.json loader (the one
  implemented module), used by every workspace's `src/version.ts`.
- Test harness: `tools/features/version.feature` (Gherkin) +
  `tools/tests/` (cucumber steps + bun-test-utils unit tests) — shared code
  tested once per repo (D-007).
- Backlog with proposed design: 11 decisions, 12 docs, 5 milestones.

## Exit criteria

- [x] `bun install` provisions all workspaces
- [x] `bun run test` green (63 tests: feature steps + unit)
- [x] `bun run typecheck` green (4/4 workspaces)
- [x] `bun run lint` green (biome)
- [x] `bun run --bun tools version` prints `@archont561/tools <version>`
- [x] No implemented code beyond package-meta + version stubs + its tests

## Known gaps (deliberate)

- `pixi.lock` not generated (no pixi on the build host) — TASK-001.
- `pixi-sandbox init` not run — TASK-001 (generated files per D-009).
- `docs/`, portfolio, worker, client are stubs — M2–M4.
