# DOC-008: Local development

**Status:** draft · **Milestone:** M0

## Setup

```bash
pixi install --locked            # locked Bun, Vale, Lychee, actionlint, etc.
bun install --frozen-lockfile    # workspace JS dependencies, including alint
pixi run hooks-install           # optional
pixi run check                   # full workspace quality gate
```

`bun run check` runs the same workspace gate when the Pixi environment is on
PATH. It needs the installed Vale and Lychee binaries and alint's normal Bun
postinstall; it does not silently skip a missing tool. An online install needs
access to the locked conda/PyPI packages and alint's pinned release asset.

## Day-to-day

```bash
pixi run tools version
pixi run check-structure
pixi run readme-check && pixi run agents-check
pixi run tools registries --check && pixi run tools watch-repos --check
pixi run tools task --list
pixi run tools task docs:index version:sync readme:check
pixi run tools task docs:index --dry-run
pixi run docs-link-check    # offline local links
pixi run lint-vale && pixi run lint-alint
bun run test                # turbo → tools features/ + tests/
pixi run lint-actions
```

See [DOC-003](DOC-003-tools-cli.md) for online refresh commands, the dated data
sources, and link-check options; [DOC-013](DOC-013-task-kernel.md) describes task
semantics and the ignored cache.

## Layout of checks

| Check | Local | CI |
| --- | --- | --- |
| Biome, typecheck, tests | `bun run check` | `pixi run check` |
| Structure and generated README/agents drift | `bun run check`; pre-commit | `pixi run check` |
| Offline snapshots, devcontainer, local links, task checks | `bun run check` | `pixi run check` |
| Vale / alint | `pixi run lint-vale` / `pixi run lint-alint` | `pixi run check` |
| Actionlint and recommended PCC policy | `pixi run lint-actions` / `pixi run policy` | ci.yml |
| convco | commit-msg hook | ci.yml (PR range) |

Worker dev (`wrangler dev`) and portfolio dev (`next dev`) arrive with M2/M4;
both use the same Pixi+Bun setup.

## Dev container

`.devcontainer/devcontainer.json` pins the Pixi image and Linux amd64, forwards
port 3000, and invokes `.devcontainer/setup.sh`. That script performs
`pixi install --locked`, a frozen Bun install, and `tools devcontainer --setup`
(which verifies prerequisites, repeats the frozen install, and runs `vale sync`).
It neither installs global tools nor starts a server. Hooks are opt-in with
`INSTALL_HOOKS=true`; alternatively run `pixi run hooks-install` later.
