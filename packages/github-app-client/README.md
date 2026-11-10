# @archont561/github-app-client

Typed client for the github-app worker API — **generated, built with bunup, and
published to npm with provenance** (D-004). `dist/` + generated declarations;
the private `@archont561/tools` helper is inlined into the bundle and absent
from the published manifest. **Scaffold only** — generation lands in M3
(`backlog/milestones/M3-client.md`).

## Pipeline (D-004, DOC-005)

```
apps/github-app (Zod → OpenAPI)  --turbo "openapi"-->  openapi.json (contract, committed here)
openapi.json  --turbo "generate" (hey-api)-->  src/client/*.gen.ts
src/index.ts  --"bun run build" (bunup)-->  dist/ (ESM + index.d.ts)
dist/  -->  npm publish (--provenance) + in-repo consumers via turbo ^build
```

Turbo enforces that `generate` runs **before `dev` and `test`**
(`turbo.json`: `test`/`dev`/`build` → `generate` → `@archont561/github-app#openapi`).

## Usage (from M3)

```ts
import { createClient } from "@archont561/github-app-client";
const client = createClient({ baseUrl: "https://github-app.archont561.workers.dev" });
```

## Conventions

- `@/*` → package root (tsconfig `paths`; bunup resolves the same aliases — `@/src/...`).
- `src/version.ts` reports `name`/`version` via `@archont561/tools/package-meta`
  (inlined at build; explicit export annotations — bunup dts is isolated-declarations).
- `src/client/` is generated — never hand-edit (regenerate + CI diff gate).
- Published to npm from version tags via `publish-client.yml` (provenance) —
  `backlog/docs/DOC-005-client-pipeline.md`.
