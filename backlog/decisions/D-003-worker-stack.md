# D-003: GitHub App worker stack (Hono + Neon + KV)

**Status:** accepted · **Date:** 2026-11-10

## Context

The GitHub App needs an HTTP surface (webhooks + query API for repo alignment,
registry snapshots, docs health) that runs edge-side, plus durable state and a
cache. It also ships as a composite GitHub Action for other workflows in this
repo.

## Decision

- **Hono** on Cloudflare Workers with **`@hono/zod-openapi`** — OpenAPI 3.1
  generated from Zod schemas; `/openapi.json` is the single contract source.
- **GitHub auth:** `@octokit/auth-app` + `@octokit/request` +
  `@octokit/webhooks` (HMAC verification). No Probot — it is a Node server
  framework and does not fit Workers.
- **Neon Postgres** via `@neondatabase/serverless` (HTTP driver) +
  **Drizzle** (`drizzle-orm` / `drizzle-kit`). No Prisma — not edge-compatible.
  Migrations run from CI/Node, never from the Worker.
- **Cloudflare KV** as read-through cache (GitHub API responses, registry
  snapshots, rate-limit counters, installation-token cache, webhook
  idempotency keys). Neon is the source of truth; KV is disposable.
- Bindings (`wrangler.jsonc`): `DB`/`DATABASE_URL`, `CACHE` KV namespace,
  secrets `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`. Secrets never in git.
- The composite Action (`apps/github-app/action.yml`) reuses the same logic;
  heavy automation runs through the `tools` CLI where possible.

## Consequences

- Route handlers double as OpenAPI documentation (Scalar UI at `/docs`).
- KV consistency is eventual; API responses carry the freshness source.
