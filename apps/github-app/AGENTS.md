# @archont561/github-app

Cloudflare Worker (Hono + `@hono/zod-openapi`) + composite GitHub Action.
**Scaffold only** — routes, Neon schema, KV cache land in M2
(`backlog/milestones/M2-github-app.md`).

- Stack decision: `backlog/decisions/D-003-worker-stack.md`.
- `src/version.ts` reads this package's metadata via `@archont561/tools/package-meta`.
- Secrets (`GITHUB_APP_PRIVATE_KEY`, `DATABASE_URL`) are wrangler secrets only.
