# D-006: Versioning and the shared package-meta loader

**Status:** accepted · **Date:** 2026-11-10

## Context

Every workspace needs its own name/version (CLI `--version`, worker `/health`,
client metadata, site metadata). Copying `import pkg from "../package.json"`
into each package duplicates parsing and drifts. The loader must be usable from
published builds without leaking private dependencies.

## Decision

- **`@archont561/tools/package-meta`** is the single implementation:
  `readPackageMeta(from)` walks up from `import.meta.url` to the nearest
  `package.json`, validates it (`parsePackageMeta`), and returns a typed
  `PackageMeta` (name, version — semver-checked, description, license, private,
  type, packageManager, workspaces, engines, `raw` passthrough). Zero runtime
  dependencies; results cached per manifest path.
- Each workspace has a three-line `src/version.ts` that calls it. Versions
  start at `0.0.0` (dummy) everywhere.
- For any consumer (client or otherwise), the helper is consumed as source —
  no inlining needed. **If a package is ever published** (D-004 escape hatch),
  its bunup build must inline `@archont561/tools` (`noExternal`) so the
  private dependency never appears in the published manifest.
- Release mechanics (M3+): convco for conventional commits and changelog;
  version bumps and `github-app-client` publishing via CI (Changesets only if
  multi-package releases become painful).

## Consequences

- Changing the version strategy is a one-file change.
- The helper is covered once, in `tools` (D-007) — packages just consume it.
