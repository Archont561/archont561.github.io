#!/usr/bin/env bash
# Devcontainer post-create setup. Kept out of devcontainer.json so each step
# can be commented and the JSON stays a one-liner (same approach as
# Archont561/pixi-sandbox).
set -euo pipefail

pixi --version

# Baseline CLI tooling that the pixi image does not ship with.
# git is needed for Source Control, lefthook, and scripts/restore.sh (D-009).
pixi global install git gh

# Project environment from pixi.toml (bun, actionlint, convco, vale, lefthook).
# Switch to `pixi install --locked --all` once pixi.lock is committed (TASK-001).
pixi install --all

# Workspace JS dependencies (bun.lock is committed).
bun install --frozen-lockfile

# Git hooks (lefthook, convco commit-msg).
pixi run hooks-install

# Sanity gate — the same checks CI runs.
pixi run check

cat <<EOF

────────────────────────────────────────────────────────────
Ready. Common entry points:

  pixi run tools version     # CLI chain
  bun run test               # Gherkin + unit suites (tools)
  pixi run check             # biome + typecheck + tests

Design lives in backlog/ (see backlog/docs/DOC-001-architecture.md).
────────────────────────────────────────────────────────────
EOF
