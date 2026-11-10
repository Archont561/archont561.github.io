# DOC-004: github-app API

**Status:** draft · **Milestone:** M2 · **Decisions:** D-003

Base URL: `https://github-app.archont561.workers.dev` (route config TBD).
Contract: `/openapi.json` (OpenAPI 3.1 from `@hono/zod-openapi`); interactive
docs at `/docs` (Scalar).

## Routes (planned)

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | liveness + version (package-meta) |
| GET | `/version` | `name version` |
| GET | `/openapi.json` | generated contract (client input) |
| POST | `/webhooks/github` | GitHub webhooks (HMAC-verified, idempotent via KV) |
| GET | `/api/v1/repos/:owner/:repo/health` | repo alignment report (alint-style rules server-side) |
| GET | `/api/v1/packages` | registry snapshot query |
| GET | `/api/v1/alignment/:repo` | structure drift vs template |
| GET | `/api/v1/docs/:repo/*` | README/AGENTS/llms exports |

## Conventions

- Zod schemas in `src/routes/v1/*.ts` are the single source; never hand-write
  an OpenAPI fragment.
- Auth: GitHub App JWT → installation tokens (`@octokit/auth-app`); public
  read routes unauthenticated with KV + rate limiting.
- Errors: RFC 7807-style problem JSON; every route validates with
  `@hono/zod-validator`.

## Events & permissions (least privilege)

- Webhook events: `installation`, `installation_repositories`, `push`
  (default branch → re-align + KV bust), `release`, `star`, `repository`.
- Permissions: `contents: read`, `metadata: read` — add `issues: write` only
  if the app ever comments.

## Workers runtime notes

- **Cron jobs**: entry exports `{ fetch, scheduled }`; `triggers.crons` in
  `wrangler.jsonc` drives the GH→Neon sync backstop + KV warm. Heavy webhook
  work runs in `ctx.waitUntil(...)` after the `202` acknowledgement.
- **Octokit on Workers** (D-003 auth stack):
  - `GITHUB_APP_PRIVATE_KEY` must be **PKCS#8** (`BEGIN PRIVATE KEY`):
    GitHub issues PKCS#1 PEM, which WebCrypto cannot import. Convert once:
    `openssl pkcs8 -topk8 -inform PEM -outform PEM -nocrypt`.
  - Webhook HMAC via `@octokit/webhooks-methods` `verify()` against the
    **raw** request body — verify before `JSON.parse`.
  - Installation tokens: `createAppAuth` caches in memory and invalidates at
    59 min; persist in KV (`token:<installation-id>`, DOC-007) so cold
    starts don't mint a new token every request.
