# TASK-004: Worker skeleton — health, version, OpenAPI

**Status:** not started · **Milestone:** M2 · **Labels:** github-app

## Acceptance criteria

- [ ] Hono app in `apps/github-app/src/` with `/health`, `/version`
      (via package-meta), `/openapi.json`, `/docs`
- [ ] `openapi` script exports the Zod-derived contract to
      `packages/github-app-client/openapi.json` (turbo `openapi` task — DOC-005
      graph already wires it ahead of client `generate`)
- [ ] `wrangler.jsonc` with KV + Neon bindings (D-003)
- [ ] `wrangler dev` serves locally; `deploy-worker.yml` deploys from main
- [ ] Route tests with bun-test-utils (fixtures: KV mock, `app.request()`)
