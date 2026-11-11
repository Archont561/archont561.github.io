# AGENTS.md

> Guidance for AI coding agents working in this repo. Read this first.
> **Before building, changing, or debugging anything: verify live state** (read the
> actual code, config, and deployed branch). Do not act on stale assumptions.
>
> `pixi run agents` refreshes marked regions. Keep repository-specific policies
> and human notes outside those markers so future refreshes preserve them.

<!-- agents-md:begin id=overview -->
## Overview
archont561-workspace. Stack: node (typescript).
<!-- agents-md:end id=overview -->

Bun and Turbo power the workspace; Next/Fumadocs renders the static portfolio.

<!-- agents-md:begin id=commands -->
## Commands
- Install: `bun install --frozen-lockfile`
- Dev / run: `bun run dev`
- Test: `bun run test`
- Lint: `bun run lint`
- Typecheck: `bun run typecheck`
- Format: `bun run format`
<!-- agents-md:end id=commands -->

- Tools CLI: `pixi run tools <command>`

## Testing
Executable Given/When/Then specs use `test.scenario` from
`@archont561/bun-test-utils` in `packages/tools/features/*.test.ts`; unit and
integration tests live in `packages/tools/tests/`. Run them with `bun test`.
Shared code is tested once, in `tools` — consuming packages do not duplicate
those suites.

<!-- agents-md:begin id=structure -->
## Project structure
Top-level: `apps/`, `backlog/`, `data/`, `docs/`, `packages/`, `scripts/`, `tasks/`, `templates/`.
<!-- agents-md:end id=structure -->

Tools provide package metadata, CLI discovery, shared configs, maintenance
commands, snapshot checks, and a task kernel. The portfolio is snapshot-only;
the worker and live-client integration remain planned in `backlog/`.

## Agent skills
`.agents/skills/` (when present) contains curated skills from related Archont561
repositories and project-specific patterns. Treat skills as reference material;
adopt them as project policy only through canonical docs.

## Code style & conventions
Biome for JS/TS/JSON/CSS (root `biome.json`), Vale for prose, alint for repo
structure. TypeScript strict, ESM only, Bun executes TypeScript natively — no
build step for `packages/tools`. Conventional commits via convco. Imports use
aliases: `@/*` → package root per package (write `@/src/...`, `@/tests/...`;
never nested `../../`); `@root/*` is
reserved for `packages/tools` tooling; cross-package via package names. Public
source graphs consumed by another package use package self-references or local
relative imports instead of private `@/` aliases: consumers' TypeScript, Next,
and bunup declaration resolution use the consumer's alias context.

## Git & PR workflow
Conventional commits; normally one Backlog.md task per PR. CI runs the full
workspace check, coverage, policy, actionlint, and convco over the PR range.

## Gotchas & hard-won lessons
_TBD: add after every incident._

## Security & secrets
Never commit secrets. Cloudflare secrets (`GITHUB_APP_PRIVATE_KEY`, `DATABASE_URL`,
`KV` bindings) live in wrangler secrets — never in `wrangler.jsonc`.

## Boundaries
- ✅ **Always**: run `bun run check` before committing; assess documentation impact.
- ⚠️ **Ask first**: adding dependencies, schema/migrations, deploy/CI changes, publishing.
- 🚫 **Never**: commit secrets, hand-edit generated files (`scripts/restore.sh`,
  `.github/workflows/relock.yml`, `.github/workflows/publish-sandbox.yml` once
  `pixi-sandbox init` has run), force-push the default branch.

## Notes
<!-- Human-owned. Anything here is never touched by re-runs of agents-md. -->

- Install with `pixi install --locked` and `bun install --frozen-lockfile`. Pixi
  owns system tools; Bun owns JS. Run `bun run check` inside the Pixi environment.
- `packages/tools` is **repo-internal** (`private: true`) — it is not published and
  not meant for other repositories.
- M1 tooling and the snapshot-only portfolio are implemented. Worker, client
  integration, and release preparation remain planned in `backlog/`; do not
  implement features outside a milestone without asking.
- Snapshot refreshes contact public registries and write dated `data/` captures;
  `--check` validates committed evidence offline. Refresh the backlog index with
  `pixi run tools task docs:index` after changing task or milestone status.
- `pixi-sandbox init` (v0.9.0) will generate `scripts/restore.sh`,
  `.github/workflows/relock.yml`, `.github/workflows/publish-sandbox.yml`. Those
  files are generated — regenerate, never hand-edit. Gate drift with
  `pixi-sandbox init --check` (see `backlog/decisions/D-009-pixi-sandbox.md`).
- Gotcha: Biome with `--write` must never scan dependency trees — its excludes
  need `!**/node_modules/**` AND `!**/.bun/**` (directory-tree form). A bare
  `!**/node_modules` silently scans bun's store and can corrupt `.d.ts` files
  in the install cache (symptom: TS2317 `ThisType` errors). Fix: purge
  `~/.bun/install/cache` and `bun install --force`.
