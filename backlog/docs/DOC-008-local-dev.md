# DOC-008: Local development

**Status:** draft · **Milestone:** M0

## Setup

```bash
pixi install        # system tools (bun, actionlint, convco, vale, lefthook, gh)
bun install         # workspace JS dependencies
pixi run hooks-install
bun run check       # biome + typecheck + tests
```

## Day-to-day

```bash
pixi run tools version     # CLI chain smoke test
bun run test               # turbo → tools features/ + tests/
pixi run lint-actions      # actionlint over workflows
```

## Layout of checks

| Check | Local | CI |
| --- | --- | --- |
| biome lint/format | `bun run lint` | ci.yml |
| typecheck | `bun run typecheck` | ci.yml |
| tests (`test.scenario` + unit) | `bun run test` | ci.yml |
| actionlint | `pixi run lint-actions` | ci.yml |
| convco | commit-msg hook | ci.yml (PR range) |
| vale / alint | `pixi run` tasks (M1) | ci.yml (M1) |

Worker dev (`wrangler dev`) and portfolio dev (`next dev`) arrive with
M2/M4; both run against the same Pixi+Bun setup.

## Dev container

`.devcontainer/devcontainer.json` pins the official pixi image
(`ghcr.io/prefix-dev/pixi`) and delegates to `.devcontainer/setup.sh` (the
`Archont561/pixi-sandbox` pattern): `pixi global install git gh` →
`pixi install --all` → `bun install --frozen-lockfile` → `pixi run
hooks-install` → `pixi run check`. Switch `pixi install` to `--locked --all`
once `pixi.lock` is committed (TASK-001).
