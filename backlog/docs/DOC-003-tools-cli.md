# DOC-003: tools CLI reference

**Status:** draft · **Milestone:** M1 · **Decisions:** D-005, D-010

## Invocation

```bash
pixi run tools <command> [args]   # → bun run --bun tools → packages/tools/src/cli/index.ts
bunx tools <command>              # same entry via workspace bin
```

## Commands

| Command | Status | Replaces | Purpose |
| --- | --- | --- | --- |
| `version` | implemented | — | print `name version` from package-meta |
| `check-structure` | M1 | `doit check_structure` | repo contract: required files, no `tools/dist`, version hygiene |
| `readme` | M1 | `doit readme` | render `templates/README.md.ejs` from package-meta |
| `agents` | M1 | `doit agents` | refresh `AGENTS.md` marked regions (agents-md) |
| `watch-repos` | M1 | `doit watch_repos` | repository-audit snapshots |
| `registries` | M1 | `doit registries` | npm/PyPI/conda registry snapshots → `data/packages.json` |
| `docs-link-check` | M1 | `doit docs_link_check` | lychee/link check over `docs/` |
| `devcontainer` | M1 | `doit devcontainer_setup` | devcontainer lifecycle checks |
| `export-ai` | M4 | `doit export_ai` | llms.txt, llms-full.txt, per-page `.md`, feeds (D-008) |

## Adding a command

1. Write a scenario in `features/<name>.feature`.
2. Add `src/cli/commands/<name>.ts` — `export default defineCommand({...})`.
3. The kebab-case filename becomes the command name; no registration needed.
   Only top-level `.ts` files are discovered; `.d.ts`, `.test.ts`, and
   `.spec.ts` files are excluded. A command must provide `run` or `subCommands`.
4. Steps in `tests/<name>.steps.ts`; unit tests in `tests/<name>.test.ts`.

Commands are imported lazily. Root help loads their metadata, and a broken
module or invalid command export fails with its filename and a clear reason
rather than silently disappearing from help. See DOC-012 for an example.
