# TASK-011 — Task kernel & day-one tasks (M1)

Status: todo · Depends on: TASK-002 · Blocks: M1 exit · Decisions: [D-010](../decisions/D-010-automation-port.md), [DOC-013](../docs/DOC-013-task-kernel.md)

## Acceptance criteria

- [ ] Kernel in `packages/tools/src/tasks/` per DOC-013's API: `Task`/`Tasks`
      types, `task()`/`tasks()` constructors (flattening, per-file
      duplicate-name check), `TaskPreset`/`forWorkspaces`; topo DAG, `fileDep`
      hash state in `.tools-cache/tasks.json` (gitignored), `upToDate`
      predicate, parallel run of independent tasks. **Zero new runtime
      dependencies.**
- [ ] Subpath export `@archont561/tools/tasks` in the package `exports` map —
      repo task files import the same kernel instance the CLI runs.
- [ ] Task discovery: built-ins `packages/tools/src/tasks/*.ts` + repo-authored
      `tasks/*.ts` at the root, every file default-exporting `Tasks`;
      deterministic order; duplicate names across files = hard error naming
      both sources; `--list` shows each task's source file; `tasks/**/*.ts`
      typechecked (tools tsconfig `include`).
- [ ] CLI command `commands/task.ts` (autodiscovered, DOC-012):
      `pixi run tools task <name...>` with `--list`, `--force`, `--dry-run`.
- [ ] Day-one: built-in `forWorkspaces` + `readme:check:<pkg>` preset; repo
      `tasks/` files for `docs:index` (backlog status index from frontmatter)
      and `version:sync` (stubs ↔ package.json drift gate via package-meta).
      `release:prepare` lands in M3; `snapshots:refresh` / `seo:artifacts`
      in M4 (their milestones, per DOC-013's table).
- [ ] Gherkin coverage in `tools/features/`: skip-if-clean, dirty re-run,
      `--force`, DAG ordering, preset expansion, discovery merge + duplicate
      error. `bun run check` green.

## Non-goals

- `calc_dep`, watch daemon, plugins, remote cache (DOC-013 cuts).
- Replacing turbo (package graph), pixi tasks (system tools), lefthook
  (hooks), or alint (lint contracts).
