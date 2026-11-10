# @archont561/github-app

GitHub App: Cloudflare Worker (Hono + `@hono/zod-openapi`) and composite
GitHub Action. **Scaffold only** — routes, Neon schema, and KV cache land in
M2 (`backlog/milestones/M2-github-app.md`).

## Responsibilities (D-003)

- Webhook ingestion (HMAC-verified, idempotent) + query API for repo
  alignment, registry snapshots, and docs health.
- **Contract producer:** `openapi` task exports the Zod-derived OpenAPI
  document to `packages/github-app-client/openapi.json` — the typed client is
  generated from it, and Turbo runs that chain before `dev`/`test` (DOC-005).
- Neon (truth) + KV (cache) — secrets via wrangler only.

## Conventions

- `@/*` → package root (use `@/src/...`; wrangler/esbuild honours tsconfig paths).
- `src/version.ts` reports `name`/`version` via `@archont561/tools/package-meta`
  (served at `/health` and `/version`).
- API design: `backlog/docs/DOC-004-github-app-api.md`.
