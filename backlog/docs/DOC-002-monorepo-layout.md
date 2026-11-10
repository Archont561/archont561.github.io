# DOC-002: Monorepo layout

**Status:** draft · **Milestone:** M0 · **Decisions:** D-001, D-002

```
apps/portfolio/            @archont561/portfolio        (M4)
apps/github-app/           @archont561/github-app       (M2)
packages/tools/            @archont561/tools            private, this repo only
  src/package-meta/        typed package.json loader    IMPLEMENTED
  src/cli/                 citty CLI (discovery + version)
  features/                Gherkin specs                IMPLEMENTED
  tests/                   steps + unit tests           IMPLEMENTED
packages/github-app-client/ @archont561/github-app-client  publishable (M3)
backlog/                   tasks, docs, decisions, milestones
docs/                      site content (M4)
```

## Import aliases (all packages)

| Alias | Maps to | Scope |
| --- | --- | --- |
| `@/*` | `<current package>/` (root) | every workspace — use `@/src/...`, `@/tests/...`; tsconfig `paths` (+ bunup `alias: { "@": "." }` parity if a build ever appears) |
| `@root/*` | repository root | **`packages/tools` only, tooling use** (structure checks, generators) — never in app/package code |
| `@archont561/<pkg>/...` | workspace package | cross-package imports |

Rationale: no nested `../../` in imports — Bun, Next, and wrangler/esbuild all
honour tsconfig `paths`; any future bunup build mirrors `alias: { "@": "." }` (D-004).

## Rules

- Every workspace: `package.json`, `tsconfig.json` (strict, `noEmit`,
  `allowImportingTsExtensions`, `baseUrl` + `paths` for `@/*`), `src/version.ts`
  (3 lines, via `@archont561/tools/package-meta`), `AGENTS.md`, `README.md`.
- `packages/tools` ships TypeScript sources — `exports` map to `.ts`, no
  `dist/`, ever (D-005). `packages/github-app-client` is generated source
  built by bunup into `dist/` and published to npm (D-004); in-repo consumers
  use `dist/`, the portfolio uses the npm artifact.
- System tooling: `pixi.toml` + `pixi.lock` (generated, committed). JS
  tooling: `package.json` / `bun.lock`. Never mix layers (D-002).
- Root `package.json` reserves the `tools` script name for the CLI chain.
