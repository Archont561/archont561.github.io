# DOC-009: Deployment

**Status:** draft · **Milestone:** M2–M4

| Surface | Target | Pipeline | Milestone |
| --- | --- | --- | --- |
| Portfolio | GitHub Pages (`https://archont561.github.io/`) | `pages.yml`: static export → Pages | M4 |
| github-app | Cloudflare Workers | `deploy-worker.yml`: `wrangler deploy` on main | M2 |
| Sandbox transport | `sandbox/<bundle>-<platform>` branch | `publish-sandbox.yml` + `relock.yml` (generated, D-009) | TASK-001 |
| github-app-client | npm (`@archont561/github-app-client`) | `publish-client.yml`: version tags → `npm publish --provenance` (D-004) | M3 |

## Rules

- All action references pinned to full SHAs (alint `immutable-actions`).
- Secrets: GitHub Environments + wrangler secrets (`GITHUB_APP_PRIVATE_KEY` —
  stored **PKCS#8**, see DOC-004 workers notes — `DATABASE_URL`), plus the
  Actions secret `CODECOV_TOKEN` (coverage upload). Never in config or code.
- Pages deploy builds with `bun install --frozen-lockfile` + `pixi` toolchain;
  the worker deploy runs `drizzle-kit migrate` from CI before `wrangler deploy`.

## Deploy credentials — two different "envs"

- **GitHub Environment `cloudflare`** — credentials *of the deploy job*:
  `deploy-worker.yml` declares `environment: cloudflare` and reads
  `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` from it (wrangler picks up
  those env var names natively).
- **Worker runtime credentials** — read *by the code* at run time, Cloudflare-side
  via `wrangler secret put` (`GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`,
  `DATABASE_URL`) plus bindings in `wrangler.jsonc` (`CACHE` KV namespace, vars).
  Never in GitHub, never in git.

## Coverage

- CI runs `bun run coverage` (Bun lcov via `--coverage-reporter=lcov`) and
  uploads `packages/tools/coverage/lcov.info` with `codecov-action`
  (SHA-pinned). Status gates live in `codecov.yml`: project `auto` ±1%,
  patch ≥ 80%; vendored/feature/config files ignored.
- `CODECOV_TOKEN` is an Actions secret; the upload fails the CI on error.

## Dependency automation

- `.github/dependabot.yml`: `package-ecosystem: "bun"` at `/` (the npm
  ecosystem refuses `bun.lock`-only repos), plus `github-actions` for the
  SHA-pinned workflow actions. Weekly, minor/patch grouped.
- Known gap: the bun ecosystem supports version updates only — Dependabot
  **security updates** are not available for it yet (GitHub audit alerts
  still cover advisories).
- `github-actions` PRs may touch generated workflows (`publish-sandbox.yml`,
  `relock.yml`) — never hand-merge those (D-009); regenerate via
  `pixi-sandbox init` or upgrade the pinned pixi-sandbox release instead.
