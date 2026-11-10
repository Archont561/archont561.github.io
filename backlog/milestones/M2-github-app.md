# M2: github-app — worker + Neon + KV

**Status:** not started · **Depends on:** M1 · **Decisions:** D-003

## Scope

- Hono app with `@hono/zod-openapi`: `/health`, `/version`, `/openapi.json`,
  `/docs` (Scalar), `/webhooks/github`, `/api/v1/*` (DOC-004).
- Neon schema + Drizzle (DOC-006); migrations from CI only.
- KV cache policy (DOC-007); `wrangler.jsonc` bindings; secrets via wrangler.
- `@octokit/auth-app` GitHub auth + webhook HMAC verification + idempotency.
- Cron sync: `scheduled` handler + `triggers.crons` (webhook-miss backstop +
  KV warm; DOC-004 workers notes).
- Composite Action (`action.yml`) reusing the same logic.
- `deploy-worker.yml` (pinned actions); worker tests with bun-test-utils
  fixtures (KV mock, cassettes for GitHub/Neon HTTP).

## Exit criteria

- [ ] `wrangler dev` serves `/health` and a valid `/openapi.json`
- [ ] Webhook round-trip verified (signature + idempotency + Neon row)
- [ ] `deploy-worker.yml` deploys from main
- [ ] Worker suite green in CI
