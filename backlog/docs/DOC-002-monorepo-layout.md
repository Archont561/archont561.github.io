# DOC-002: Monorepo layout

**Status:** draft · **Milestone:** M0 · **Decisions:** D-001, D-002

```
apps/portfolio/            @archont561/portfolio        (M4)
apps/github-app/           @archont561/github-app       (M2)
packages/tools/            @archont561/tools            private, this repo only
  src/package-meta/        typed package.json loader    IMPLEMENTED
  src/cli/                 citty CLI (discovery + version)
  src/configs/             shared workspace configs
  features/                executable scenario specs    IMPLEMENTED
  tests/                   unit + integration tests     IMPLEMENTED
packages/github-app-client/ @archont561/github-app-client  publishable (M3)
backlog/                   tasks, docs, decisions, milestones
docs/                      site content (M4)
```

## Import aliases (all packages)

| Alias | Maps to | Scope |
| --- | --- | --- |
| `@/*` | `<current package>/` (root) | every workspace — use `@/src/...`, `@/tests/...` |
| `@root/*` | repository root | **`packages/tools` only, tooling use** (structure checks, generators) — never in app/package code |
| `@archont561/<pkg>/...` | workspace package | cross-package imports |

Rationale: no nested `../../` in imports. TypeScript and Bun use the same
package-root paths; the shared bunup configuration provides the equivalent of
`alias: { "@": "." }` without passing an unsupported bunup option.

## Shared configuration

Each workspace's `tsconfig.json` only extends a variant through its `.tsconfig`
symlink to `packages/tools/src/configs/typescript/`: `app.json` for the
portfolio, `worker.json` for the worker, `package.json` for the client, and
`tools.json` for tools. `base.json` contains the strict compiler settings and
package-root alias. The tools variant repeats `@/*` because TypeScript replaces
rather than merges `paths`, adds `@root/*`, and includes `features/` and `tests/`.

The symlink must live directly in the workspace root. TypeScript and Wrangler's
esbuild expand `${configDir}` relative to the consuming config. Bun does not
expand it, so the shared paths also include `../*`, relative to the logical
`.tsconfig` symlink; it resolves to the same workspace root in Bun. Directly
extending the physical shared config would make this fallback relative to the
shared config directory instead. To add another workspace, create the equivalent
relative symlink and extend the appropriate variant, for example:

```bash
# From an app under apps/:
ln -s ../../packages/tools/src/configs/typescript .tsconfig
```

```json
{ "extends": "./.tsconfig/app.json" }
```

These are Git-tracked symbolic links, not copies. Checkouts need working
symlink support (`core.symlinks=true`); the Pixi lock targets Linux and macOS.

Turbopack does not expand inherited `${configDir}` paths, so the portfolio also
uses the shared Next config to map `@/*` to its root. TypeScript and Turbopack
resolve imports in source dependencies with the consuming app's alias context.
Consequently, a source package's public entrypoints and their transitive imports
must use relative imports or package self-references rather than that package's
private `@/` alias. This avoids silent collisions between identical paths in
consumer and dependency; `@archont561/tools` follows this rule.

The client also links `.tsconfig.bunup.json` to the shared bunup declaration
config. The bunup factory, Next config, portfolio UnoCSS preset, and root Biome
base all live under `packages/tools/src/configs/`; usage and the separate
bunup declaration-resolver limitation are documented in
`packages/tools/README.md` and DOC-005.

## Rules

- Every workspace: `package.json`, an extends-only `tsconfig.json` (strict,
  `noEmit`, `allowImportingTsExtensions`, `paths` for `@/*`), `src/version.ts`
  (via `@archont561/tools/package-meta`), `AGENTS.md`, `README.md`.
- `packages/tools` ships source files — `exports` map to `.ts` or Node-loadable
  `.mjs`, with no `dist/`, ever (D-005). `packages/github-app-client` is generated source
  built by bunup into `dist/` and published to npm (D-004); in-repo consumers
  use `dist/`, the portfolio uses the npm artifact.
- System tooling: `pixi.toml` + `pixi.lock` (generated, committed). JS
  tooling: `package.json` / `bun.lock`. Never mix layers (D-002).
- Root `package.json` reserves the `tools` script name for the CLI chain.
