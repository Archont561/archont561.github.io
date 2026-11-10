# D-004: Client generation (hey-api) — publishable npm package

**Status:** accepted · **Date:** 2026-11-10 (revised: publishable restored; supersedes the private-workspace draft of the same date)

## Context

The generated SDK is consumed by the portfolio, which lives in a separate repo on
different tooling. A previous draft demoted the package to a private
`workspace:*` source drop on the argument that in-repo consumption is all we need
and bun can bundle straight from a source entry. That is true today but leaves the
external consumer pinning a git ref and reimplementing our build; the publishable
shape costs one devDependency and gives npm-provenance, semver, and `exports`
resolution for free. Publishing is restored as the primary mode (decision
re-reversed 2026-11-10: "ok make client publishable").

## Decision

`@archont561/github-app-client` is a **publishable npm package built with
bunup**, committed under `packages/github-app-client`:

- **Build**: `bun run build` → `bunup` (config `bunup.config.ts`): entry
  `src/index.ts`, ESM output in `dist/` with generated `dist/index.d.ts`. The
  `exports()` plugin keeps the package.json `exports` map in sync with the
  artifacts (`.` → types + import; `./package.json` passthrough).
- **Isolated declarations**: bunup's dts uses oxc isolated-declarations mode —
  every export needs an explicit type annotation (`export const name: string = …`);
  unannotated destructured exports fail with an empty BuildMessage. Libraries that
  prefer inference can opt into `dts: { inferTypes: true }`; we use annotations.
- **Private dependency inlining**: `@archont561/tools` (version helper) is a
  `devDependency` (`workspace:*`) declared `noExternal` (bundled). It never
  appears in the published manifest; consumers see zero trace of it. The
  `@hey-api/openapi-ts` generator stays a real `dependencies` entry because the
  generated client tree imports its runtime.
- **Path aliases**: bunup resolves `@/*` from the package tsconfig automatically
  (no alias config needed in bunup.config.ts).
- **Publishing**: `publishConfig.access = public`; provenance via
  `.github/workflows/publish-client.yml` on version tags (`npm publish
  --provenance`), per DOC-009. `files: ["dist"]`.
- **Consumption — dual mode**:
  - **in-repo** (github-app validation, tests): turbo `^build` topology — the
    build depends on `generate` and emits `dist/` before any in-repo consumer
    builds or tests. No source-entry bundles inside this repo.
  - **external** (portfolio): consumes the published npm artifact; never a
    `workspace:*` ref. The portfolio uses the published npm package.

## Consequences

- `packages/github-app-client/package.json` carries `name`, `version`,
  `exports`, `publishConfig`, `files`, and `build`; `bunup` is the only build
  tool in the package.
- Turbo `build` outputs `dist/**`; `^build` ordering gives in-repo consumers a
  built package before they compile.
- Release tagging of `@archont561/github-app-client` is the portfolio's
  upgrade path.
- The escape hatch (private source-drop via `workspace:*` + `noExternal`) is a
  config-only change to `package.json` + `bunup.config.ts` if publishing is ever
  reversed again — no code moves.

## Alternatives considered

- **Private `workspace:*` source package with no build** (the reverted draft):
  minimal tooling, but the external consumer must build our sources with our
  conventions and tracks a git ref. Rejected when the user restored publishing.
- **Hand-rolled tsc emit + no bundler**: loses dependency inlining (the private
  helper would leak or need a separate published package) and the modern
  `exports` tooling.
- **Publishing `@archont561/tools` too**: exposes an internal repo-automation
  helper as public API surface for no consumer benefit; inlining instead keeps
  the published manifest to `@hey-api/openapi-ts` only.

## Related

- [DOC-005](../docs/DOC-005-client-pipeline.md) — the worker→client
  codegen chain this package packages.
- [DOC-009](../docs/DOC-009-deployment.md) — `publish-client.yml`, provenance.
- [TASK-006](../tasks/TASK-006-client-gen-and-publish.md) — M3 implementation.
