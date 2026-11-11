# @archont561/tools

Repo-internal toolkit for `archont561.github.io`. **Private — this repository
only** (D-001): never published, not a dependency of other `Archont561/*`
repos.

## What lives here

| Path | Status | Purpose |
| --- | --- | --- |
| `src/package-meta/` | implemented | Typed `package.json` loader shared by every workspace (D-006) |
| `src/cli/` | implemented | citty discovery and M1 maintenance commands (D-005, D-010) |
| `src/maintenance/` | implemented | Structure, safe generation, repository and registry snapshots, links, and devcontainer checks |
| `src/tasks/` | implemented | Dependency-free DAG, file/target hashes, predicates, and workspace presets (DOC-013) |
| `src/configs/` | implemented | Shared TypeScript, bunup, UnoCSS, and Biome configs (TASK-003) |
| `features/` + `tests/` | implemented | Executable `test.scenario` specs + unit/integration tests — shared code is tested **once**, here (D-007) |

## Usage

```ts
import { readPackageMeta } from "@archont561/tools/package-meta";

export const meta = readPackageMeta(import.meta.url); // nearest package.json
export const { name, version } = meta;
```

```bash
pixi run tools version       # → bun run --bun tools → src/cli/index.ts (TS-native)
pixi run check-structure     # validate the repo and workspace package metadata
pixi run readme              # render templates/README.md.ejs
pixi run agents              # refresh marked AGENTS.md regions safely
pixi run readme-check        # check without writing
pixi run agents-check        # check without writing
pixi run tools registries --check
pixi run tools watch-repos --check
pixi run tools task --list
pixi run tools task docs:index version:sync readme:check
```

See DOC-003 for the maintenance contract, `--root` and `--check` flags, and
how generated files preserve existing human-owned content.

## Aliases and shared configs

- `@/*` → package root (write `@/src/...`, `@/tests/...`).
- `@root/*` → repository root — **this package only, tooling use only** (D-005).
- Cross-package imports use package names (`@archont561/tools/...`), never `../..`.

Workspace tsconfigs extend the shared TypeScript variants through a `.tsconfig`
symlink in each workspace root. This keeps inherited `@/*` paths relative to the
consumer in both TypeScript and Bun, which does not expand `${configDir}`.
To add a workspace, link that directory and extend `app.json`, `worker.json`,
or `package.json`; see DOC-002 for an example. Only the tools variant adds
`@root/*` and includes `features/`, `tests/`, and root `tasks/**/*.ts`.

For a publishable bunup package, link `.tsconfig.bunup.json` in its root to
`src/configs/bunup/tsconfig.json` (as the client does), then spread the factory
and retain its plugins:

```ts
import { createBunupBase } from "@archont561/tools/configs/bunup";
import { defineConfig } from "bunup";

const base = createBunupBase();
export default defineConfig({ ...base, entry: ["src/index.ts"], plugins: [...base.plugins] });
```

Bunup has no `alias` option; its effective `@` → `.` mapping comes from the
linked declaration config. JS uses each imported workspace's nearest tsconfig,
while bunup resolves declarations in the entry package's context. Its public
source dependencies must use relative imports or package self-references, not
private `@/` imports. The factory rejects unresolved `@/` imports in emitted
declarations but cannot detect a wrong path that already resolved; see DOC-005.

The portfolio consumes `@archont561/tools/configs/unocss`, a small custom-rule
preset with `sr-only`. It also uses `@archont561/tools/configs/next` to configure
the same app-root alias for Turbopack. Imported source packages need the same
public-graph restriction described above because Turbopack and TypeScript use
the app's context. Root `biome.json` extends the shared Biome base; its
dependency-tree exclusions intentionally retain `/**`, protected by a scoped
rule override.

## Tests

```bash
bun run test   # from repo root (turbo) or `bun test` here
```

Design: `backlog/docs/DOC-003-tools-cli.md`, `backlog/docs/DOC-012`.
