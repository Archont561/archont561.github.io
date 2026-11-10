# DOC-005: Client generation pipeline

**Status:** draft · **Milestone:** M3 · **Decisions:** D-004

## Pipeline

```
apps/github-app (Zod → OpenAPI) → openapi.json (committed at
packages/github-app-client/openapi.json) → hey-api (openapi-ts) →
src/client/*.gen.ts → bunup build → dist/ (ESM + d.ts) → npm publish
(provenance) + in-repo consumers via turbo ^build
```

The client is a **publishable npm package** built with bunup (D-004):
`dist/` + generated declarations, private `@archont561/tools` inlined via
`noExternal` (absent from the published manifest), `@hey-api/openapi-ts`
runtime kept as the single real dependency. In-repo consumers get `dist/`
through turbo `^build` ordering; the portfolio installs the published
artifact.

## Turbo enforcement (dev/test always see a fresh client)

The chain is a **task graph**, not a habit — `turbo.json` (already wired):

```
apps/github-app#openapi          cache:false — exports the Zod-derived contract
    │                            to packages/github-app-client/openapi.json
    ▼                            (committed; owned by the client package)
packages/github-app-client#generate   openapi-ts → src/client/*.gen.ts
    │                            inputs: openapi.json + openapi-ts.config.ts
    ▼
#build / #test / #dev            all dependsOn: generate
```

Key points:

- **Contract ownership:** `openapi.json` lives in the *client* package (the
  consumer owns the contract it generates from). The worker's `openapi` task
  writes it there; since the file sits inside the client package, Turbo's
  cache hashing stays in-bounds (`generate.inputs = ["openapi.json", ...]`).
- **Ordering** uses Turbo's `pkg#task` syntax —
  `generate.dependsOn: ["@archont561/github-app#openapi"]` — because the
  client does not *import* the worker; this is a contract dependency, not a
  module one. No fake `workspace:*` dependency needed.
- **Enforcement:** `test` and `dev` (and `build`) declare
  `dependsOn: ["generate", ...]`, so `bun run test`, `bun run dev`, and CI
  regenerate the client before anything runs. `build` additionally outputs
  `dist/**`, so `^build` gives every in-repo consumer a built package before
  it compiles. Scripts land in M2/M3; the graph is already in `turbo.json` and
  activates when the scripts appear.
- `openapi` is `cache: false` (side-effecting export); `generate` is cached on
  its inputs/outputs (`src/client/**`).
- Package-specific tweaks later go in per-package `turbo.json`
  (`"extends": ["//"]`), never as `pkg#task` clutter in the root config.

## Aliases

`openapi-ts.config.ts` and generated code use `@/*` → package root (DOC-002 —
write `@/src/...`, `@/tests/...`). No nested `../../` in imports anywhere.
The shared bunup factory uses each workspace's nearest tsconfig for JS and the
client's `.tsconfig.bunup.json` link for declaration alias resolution. The link
exposes the effective `@` → `.` mapping to bunup's declaration resolver, which
otherwise ignores inherited `paths`.

That resolver uses the **entry package's** context for every declaration,
including declarations from inlined source packages. An inlined source package's
public import graph must therefore use relative imports or package
self-references, not its own `@/` aliases: otherwise the resolver can silently
pick a matching path in the entry package. The factory rejects unresolved `@/`
imports in emitted declarations, but that check cannot detect a wrong path
that already resolved. The client build is tested from an isolated external
consumer with no private `tools` dependency.

## Steps (M3)

1. `openapi-ts.config.ts`: input reads `openapi.json`, output `src/client/`,
   runtime `@hey-api/openapi-ts` bundled client (post-0.73 — do NOT add the
   deprecated `@hey-api/client-fetch`).
2. CI job regenerates and fails on diff (generated code is committed and
   reviewable).
3. Hand-written `src/index.ts` composes `createClient` + version metadata
   (package-meta) and re-exports the SDK — explicit type annotations on every
   export (bunup's dts is isolated-declarations; D-004).
4. `publish-client.yml` publishes on version tags with npm provenance
   (DOC-009); release tagging is the portfolio's upgrade path.

## Consumption

```ts
import { createClient } from "@archont561/github-app-client";
const client = createClient({ baseUrl: "https://github-app.archont561.workers.dev" });
```

- **in-repo** (worker validation, tests): resolved from `dist/` after `^build`.
- **external** (portfolio): the published npm package; never `workspace:*`.

## Escape hatch: private source-drop

If publishing is ever reversed: set `private: true`, drop the bunup build and
`publish-client.yml`, and consume via `workspace:*` from source. The generation
pipeline above does not change either way.
