# DOC-001: Architecture

**Status:** draft · **Milestone:** M0 · **Owners:** Archont561

## Purpose

`archont561.github.io` hosts the Archont561 portfolio (GitHub Pages) and the
GitHub App automation (Cloudflare Worker) in one Bun + Turbo monorepo, with
repo-internal tooling and a generated API client.

## Components

```
                       ┌──────────────────────────────┐
   GitHub webhooks ───►│ apps/github-app (Hono,       │──► Neon Postgres (truth)
   cron triggers  ───► │  OpenAPI, Workers)           │──► KV (cache)
                       └──────────┬───────────────────┘
                                  │ /openapi.json
                                  ▼
                       ┌──────────────────────────────┐
                       │ packages/github-app-client   │ (generated SDK → npm)
                       └──────────┬───────────────────┘
                                  │ npm (provenance) · build-time calls (fallback: snapshots)
                                  ▼
                       ┌──────────────────────────────┐
   GitHub Pages    ◄───│ apps/portfolio (Next.js +    │
                       │  Fumadocs, static export)    │
                       └──────────────────────────────┘

   packages/tools  ──── used by every workspace (package-meta, CLI, configs)
```

## Data flow

1. Worker receives webhooks + cron; state to Neon, hot reads through KV.
2. `openapi.json` (from the worker) → hey-api → `github-app-client` → npm.
3. Portfolio builds statically: committed snapshots, optionally refreshed via
   the client (D-011), plus SEO/LLM artifacts (D-008).
4. `packages/tools` provides the typed package-meta loader (implemented) and
   the repo automation CLI (M1).

## In-repo references

- Layout: DOC-002 · CLI: DOC-003 · API: DOC-004 · Client: DOC-005
- Data: DOC-006, DOC-007 · Dev/deploy: DOC-008, DOC-009
- SEO surface: DOC-010 · Restore: DOC-011
