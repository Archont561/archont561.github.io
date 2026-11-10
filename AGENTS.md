# AGENTS.md

> Guidance for AI coding agents working in this repo. Read this first.
> **Before building, changing, or debugging anything: verify live state** (read the
> actual code, config, and deployed branch). Do not act on stale assumptions.

<!-- agents-md:begin id=overview -->
## Overview
archont561-workspace. Stack: bun, turbo, hono (planned), next/fumadocs (planned).
<!-- agents-md:end id=overview -->

<!-- agents-md:begin id=commands -->
## Commands
- Install: `bun install --frozen-lockfile`
- Test: `bun run test`
- Lint: `bun run lint`
- Typecheck: `bun run typecheck`
- Format: `bun run format`
- Tools CLI: `pixi run tools <command>`
<!-- agents-md:end id=commands -->

<!-- agents-md:begin id=testing -->
## Testing
Behaviour specs in Gherkin live in `packages/tools/features/`, step definitions and
unit tests in `packages/tools/tests/`, run with `bun test` (Bun test runner +
`@archont561/bun-test-utils`). Shared code is tested once, in `tools` — consuming
packages do not duplicate those suites.
<!-- agents-md:end id=testing -->

<!-- agents-md:begin id=structure -->
## Project structure
Top-level: `apps/` (portfolio, github-app), `packages/` (tools, github-app-client),
`backlog/` (tasks, docs, decisions, milestones), `docs/` (site content). Tools
provide package metadata, CLI discovery, and shared configs; the apps and
remaining automation are scaffolded or planned in `backlog/`.
<!-- agents-md:end id=structure -->

## Agent skills
`.agents/skills/` (when present) contains curated skills from related Archont561
repositories and project-specific patterns. Treat skills as reference material;
adopt them as project policy only through canonical docs.

<!-- agents-md:begin id=conventions -->
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
<!-- agents-md:end id=conventions -->

<!-- agents-md:begin id=git -->
## Git & PR workflow
Conventional commits; one Backlog.md task per PR. CI runs biome, typecheck, tests,
actionlint, convco over the PR range.
<!-- agents-md:end id=git -->

<!-- agents-md:begin id=gotchas -->
## Gotchas & hard-won lessons
_TBD: add after every incident._
<!-- agents-md:end id=gotchas -->

<!-- agents-md:begin id=security -->
## Security & secrets
Never commit secrets. Cloudflare secrets (`GITHUB_APP_PRIVATE_KEY`, `DATABASE_URL`,
`KV` bindings) live in wrangler secrets — never in `wrangler.jsonc`.
<!-- agents-md:end id=security -->

<!-- agents-md:begin id=boundaries -->
## Boundaries
- ✅ **Always**: run `bun run check` before committing; assess documentation impact.
- ⚠️ **Ask first**: adding dependencies, schema/migrations, deploy/CI changes, publishing.
- 🚫 **Never**: commit secrets, hand-edit generated files (`scripts/restore.sh`,
  `.github/workflows/relock.yml`, `.github/workflows/publish-sandbox.yml` once
  `pixi-sandbox init` has run), force-push the default branch.
<!-- agents-md:end id=boundaries -->

## Notes
<!-- Human-owned. Anything here is never touched by re-runs of agents-md. -->

- Install with `pixi install` and `bun install`. Pixi owns system tools; Bun owns JS.
- `packages/tools` is **repo-internal** (`private: true`) — it is not published and
  not meant for other repositories.
- Implemented tools include package metadata, CLI command discovery (`version`
  only), and shared configs; the apps and remaining automation are still
  scaffolds or designs in `backlog/`. Do not implement features outside a
  milestone without asking.
- `pixi-sandbox init` (v0.9.0) will generate `scripts/restore.sh`,
  `.github/workflows/relock.yml`, `.github/workflows/publish-sandbox.yml`. Those
  files are generated — regenerate, never hand-edit. Gate drift with
  `pixi-sandbox init --check` (see `backlog/decisions/D-009-pixi-sandbox.md`).
- Gotcha: Biome with `--write` must never scan dependency trees — its excludes
  need `!**/node_modules/**` AND `!**/.bun/**` (directory-tree form). A bare
  `!**/node_modules` silently scans bun's store and can corrupt `.d.ts` files
  in the install cache (symptom: TS2317 `ThisType` errors). Fix: purge
  `~/.bun/install/cache` and `bun install --force`.
