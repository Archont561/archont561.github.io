# DOC-013: Task kernel — doit semantics in the tools package

**Status:** draft · **Milestone:** M1 · **Decisions:** D-010, D-005

## Why

D-010 ports the old repo's Python automation *commands* into the citty CLI, but
the part of `doit` that made it worth using — the **runner**: task DAG,
`file_dep`/`targets`/`uptodate` skip-if-clean semantics, state tracking, task
generators — has no home yet. A survey (2026-11) found no pure-TS package that
provides that kernel with presets: wireit has the semantics but no presets and
single-maintainer risk; Nx has first-class presets but replaces turbo; Vite+
`vp run` is a whole toolchain suite; the small TS runners are one-author bets.
So the kernel is specified here and implemented in `packages/tools` — a
zero-dependency module, not a framework.

## Kernel semantics (doit's runner loop)

1. Load the task registries — built-in `packages/tools/src/tasks/*.ts` plus
   repo-authored `tasks/*.ts` at the root (every file default-exports `Tasks`;
   discovery rules below).
2. Resolve the DAG for the requested task name(s).
3. Per task: hash `fileDep` globs, consult state (`.tools-cache/tasks.json`,
   gitignored), run the `upToDate` predicate — **skip if clean, run if dirty**.
4. Execute in topological order, in parallel where independent; write new
   hashes to state.

## API sketch

```ts
// packages/tools/src/tasks/ — kernel API (subpath export: @archont561/tools/tasks)
export interface Task {
  name: string;
  deps?: string[];                              // task DAG
  fileDep?: string[];                           // input globs (hash-tracked)
  targets?: string[];                           // output globs (drift = dirty)
  upToDate?: () => boolean | Promise<boolean>;  // custom predicate (doit's uptodate)
  run: () => void | Promise<void>;
}
export type Tasks = Task[];                     // the collection contract

export type TaskPreset = (params: Record<string, string>) => Task | Task[];
// presets are plain TS factories yielding tasks — doit's task_gen, no framework

export function task(def: TaskDef): Task;       // validate + normalize one
export function tasks(...defs: Array<TaskDef | TaskDef[] | Tasks>): Tasks;
// flattens (preset output splices in), rejects duplicate names per file
```

Repo-authored example — the `dodo.py` slot, in TS:

```ts
// tasks/docs.ts — repo root
import { task, tasks, forWorkspaces } from "@archont561/tools/tasks";

export default tasks(
  task({
    name: "docs:index",
    fileDep: ["backlog/**"],
    targets: ["backlog/README.md"],
    run: () => generateBacklogIndex(),
  }),
  ...forWorkspaces((ws) => task({ name: `readme:check:${ws}`, /* ... */ })),
);
```

CLI surface (via the existing autodiscovery, D-005/DOC-012):
`pixi run tools task <name...>` with `--list`, `--force`, `--dry-run`.
Execution: topo sort, parallel independent branches, state written after run.

## Task discovery

The loader merges two registries and every file default-exports `Tasks`:

- `packages/tools/src/tasks/*.ts` — **built-ins**: generic tasks + presets
  (`forWorkspaces`, `readme:check`).
- `tasks/*.ts` at the repo root — **repo-authored** chores.

Rules: TS only; deterministic sorted order; duplicate names across files are
a hard error naming both sources; `--list` shows each task's source file;
discovered files must typecheck (tools' tsconfig `include` covers
`tasks/**/*.ts`); `@archont561/tools/tasks` is a real subpath export so repo
files import the same kernel instance the CLI runs.

## Division of labor

| Layer | Owns | Never does |
| --- | --- | --- |
| turbo | package graph: `generate → build → test`, `^build`, cache | file-driven ad-hoc chores |
| pixi tasks | system tools (actionlint, vale, alint entry) | skip-if-clean logic |
| lefthook | hooks — *calls* tasks | reimplements them |
| alint | lint contracts | orchestration |
| **kernel** | file-driven repo chores with skip-if-clean + presets | builds, lint rules, hooks |

## Day-one task set

| Task | `fileDep` | `targets` / `upToDate` | What it does | Milestone |
| --- | --- | --- | --- | --- |
| `docs:index` | `backlog/**` | `backlog/README.md` | Regenerate the backlog status index from `status:` frontmatter | M1 |
| `version:sync` | `packages/*/package.json`, `packages/*/src/version.ts` | — | Drift gate: version stubs report their package.json version (via package-meta) | M1 |
| `release:prepare` | — | `upToDate`: tag exists | Clean tree → version bump → `convco changelog` → tag (client release choreography) | M3 |
| `snapshots:refresh` | — | `upToDate`: **TTL** (< 24h) | Portfolio data via github-app-client, committed snapshots (D-011) | M4 |
| `seo:artifacts` | `docs/**` | `out/llms.txt`, `out/sitemap.xml` | Regenerate LLM/SEO surfaces (D-008) | M4 |

Generic machinery (`forWorkspaces`, `readme:check`) ships as built-ins in
tools; the repo-specific rows live in root `tasks/` — the engine is the
package, the chores are repo files (D-010).

## Presets in practice

The factory earns its keep with per-workspace chores:

```ts
// one factory → N tasks, no copy-paste
export const readmeCheck = forWorkspaces((ws) => task({
  name: `readme:check:${ws}`,
  fileDep: [`${ws}/package.json`, `${ws}/README.md`],
  run: () => assertReadmeMatchesPackageMeta(ws),
}));
```

`forWorkspaces()` is the whole "presets" story — TS does the rest.

## Testing

Executable `test.scenario` Given/When/Then specs in `tools/features/*.test.ts`
(the repo's test convention): skip-if-clean on unchanged `fileDep`, re-run on
change, `--force` override, DAG ordering, parallel branches, and preset factory
expansion.

## Non-goals (v1)

- No `calc_dep` (dynamic deps), no watch daemon, no plugin API, no remote cache.
- The kernel never replaces turbo/pixi/lefthook/alint (table above).
- If those cut features ever become real needs, re-evaluate wireit — not before.

## Related

- [D-010](../decisions/D-010-automation-port.md) — automation lives in the tools package; doit/Python never return.
- [DOC-003](DOC-003-tools-cli.md), [DOC-012](DOC-012-adding-a-tools-command.md) — CLI conventions the `task` command follows.
- [TASK-011](../tasks/TASK-011-task-kernel.md) — implementation.
