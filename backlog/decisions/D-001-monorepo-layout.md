# D-001: Monorepo layout (Bun workspaces + Turbo)

**Status:** accepted · **Date:** 2026-11-10

## Context

`archont561.github.io` is the deployment target (GitHub Pages user site at the
domain root) and the home for the GitHub App automation. Multiple deployables
and shared packages must live together: the portfolio site, the worker, repo
tooling, and a generated API client.

## Decision

- **Bun workspaces** (`apps/*`, `packages/*`) with `bun.lock` as the single JS
  lockfile; `packageManager: bun@1.4.4`.
- **Turborepo** orchestrates `build` / `dev` / `lint` / `typecheck` / `test`
  with `^build` dependency ordering and caching.
- `apps/` = deployables (`portfolio` → GitHub Pages, `github-app` → Cloudflare
  Worker + composite Action). `packages/` = shared libraries (`tools` private,
  `github-app-client` generated and published to npm — D-004).
- **`packages/tools` is repo-internal.** `private: true`, never published, not
  an adoption target for other `Archont561/*` repositories. Cross-repo reuse is
  explicitly out of scope (see M-milestones scope note).
- **`packages/github-app-client` is publishable** — a generated SDK built with
  bunup (`dist/` + d.ts, private `tools` inlined via `noExternal`) and published
  to npm with provenance; the portfolio consumes the published artifact, in-repo
  consumers consume `dist/` via turbo `^build` (D-004).
- `packages/tools` is **TypeScript-native**: no build step, `exports` point at
  `.ts`, Bun executes it directly; it is never published. The client package is
  the one published artifact of this repo.

## Consequences

- One `bun install` provisions everything; Turbo fans out checks.
- Other Archont561 repos keep their own tooling; this repo's `tools` may be
  *copied from*, never depended on.
