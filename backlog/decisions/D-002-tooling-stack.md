# D-002: Tooling stack (Pixi + Biome + quality gates)

**Status:** accepted · **Date:** 2026-11-10

## Context

The Archont561 ecosystem standardises on Pixi for system-level tooling and Bun
for JS tooling. Lint/format/lint-prose/lint-structure must run identically in
CI, hooks, and a devcontainer.

## Decision

- **Pixi** (`pixi.toml`) owns system tools: `bun`, `nodejs`, `lefthook`,
  `actionlint`, `convco`, `vale`, `lychee`, `git`, `gh`. **Bun** owns all JS tooling via
  `package.json` / `bun.lock`. The two layers never mix.
- **Biome** (root `biome.json`) lints/formats TS/TSX/JSON/JSONC/CSS. Single
  config at root; no ESLint/Prettier.
- **Vale** (`.vale.ini`, `.vale/styles/Portfolio/`) lints prose.
- **alint** (`.alint.yml`) enforces repo structure: required-file checks,
  pinned action references (`immutable-actions`), docs index rules, no merge
  markers / bidi controls.
- **convco** checks conventional commits in the `commit-msg` hook and over the
  PR range in CI. **lefthook** wires the hooks (pre-commit: biome, actionlint,
  structure and generated-content drift; commit-msg: convco; pre-push: full `check`).
- **Backlog.md** (`backlog/`) for tasks, docs, decisions, milestones — one task
  per PR. **agents-md** generates marked regions of `AGENTS.md`; curated
  repository policies and human notes remain outside the markers. `tools agents`
  stages the generator and verifies that unmarked content is preserved.
- `pixi run <task>` is the canonical entry; tasks delegate to `bun run` scripts.

## Consequences

- CI (`ci.yml`) = `setup-pixi` + `bun install --frozen-lockfile` + pixi tasks.
- `pixi.lock` must be committed once generated (`pixi install` on a dev host).
