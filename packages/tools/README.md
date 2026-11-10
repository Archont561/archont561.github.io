# @archont561/tools

Repo-internal toolkit for `archont561.github.io`. **Private — this repository
only** (D-001): never published, not a dependency of other `Archont561/*`
repos.

## What lives here

| Path | Status | Purpose |
| --- | --- | --- |
| `src/package-meta/` | implemented | Typed `package.json` loader shared by every workspace (D-006) |
| `src/cli/` | stub (`version` only) | citty CLI — `pixi run tools <command>` (D-005, full set in M1) |
| `src/configs/` | M1 | Shared TS/bunup/UnoCSS/Biome configs (TASK-003) |
| `features/` + `tests/` | implemented (version) | Gherkin specs + steps/unit tests — shared code is tested **once**, here (D-007) |

## Usage

```ts
import { readPackageMeta } from "@archont561/tools/package-meta";

export const meta = readPackageMeta(import.meta.url); // nearest package.json
export const { name, version } = meta;
```

```bash
pixi run tools version   # → bun run --bun tools → src/cli/index.ts (TS-native)
```

## Aliases

- `@/*` → package root (tsconfig `paths`, honoured by Bun — write `@/src/...`, `@/tests/...`)
- `@root/*` → repository root — **this package only, tooling use only** (D-005)
- Cross-package imports use package names (`@archont561/tools/...`), never `../..`

## Tests

```bash
bun run test   # from repo root (turbo) or `bun test` here
```

Design: `backlog/docs/DOC-003-tools-cli.md`, `backlog/docs/DOC-012`.
