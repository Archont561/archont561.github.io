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
| `check-structure` | implemented | `doit check_structure` | repo contract: required files, no `tools/dist`, version hygiene |
| `readme` | implemented | `doit readme` | render `templates/README.md.ejs` from package-meta |
| `agents` | implemented | `doit agents` | refresh `AGENTS.md` marked regions (agents-md) |
| `watch-repos` | implemented | `doit watch_repos` | repository-audit snapshots |
| `registries` | implemented | `doit registries` | npm/PyPI/conda registry snapshots → `data/packages.json` |
| `docs-link-check` | implemented | `doit docs_link_check` | lychee/link check over `docs/` |
| `devcontainer` | implemented | `doit devcontainer_setup` | devcontainer lifecycle checks |
| `task` | implemented | doit runner | list and execute file-aware DAG tasks (DOC-013) |
| `export-ai` | implemented | `doit export_ai` | llms.txt, llms-full.txt, per-page `.md`, feeds (D-008) |

## Repository maintenance

```bash
pixi run check-structure       # also: pixi run tools check-structure
pixi run readme                # render README.md
pixi run readme-check          # report drift, write nothing
pixi run agents                # refresh the marked AGENTS.md regions
pixi run agents-check          # report drift, write nothing
```

The commands default to this repository root regardless of the working directory;
`--root <path>` selects another repository (useful for isolated tests).
`readme` and `agents` also accept `--check`, which exits nonzero on drift.
The checks run in Lefthook's pre-commit hook and in `bun run check`.

`check-structure` validates the required repository files, declared workspaces,
package names and semantic versions through package-meta, each workspace's
`src/version.ts` exports, the sandbox plan, portable MDX frontmatter and section
indexes, and application/repository-tooling boundaries. It forbids
`packages/tools/dist`, including dangling symlinks. Package versions may differ;
they are checked against their own manifests, not against each other.

`readme` evaluates the trusted `templates/README.md.ejs` using fresh metadata.
Its EJS locals are `root` (the root `PackageMeta`) and `workspaces` (sorted
`{ path, meta }` entries). Edit the template rather than the generated README.
Rendering must succeed and produce content before the existing file is atomically
replaced. An unresolved `.README.previous` from the old generator must be
recovered manually before regeneration.

`agents` runs the installed agents-md generator in a disposable staging directory,
normalizes its generated commands to Bun, and checks that unmarked content was
preserved before writing atomically. It refuses malformed or missing markers and
does not create a `CLAUDE.md` symlink. The upstream generator replaces content
*inside* recognized markers, so keep repository-specific policies and human notes
outside them; this repository only marks its overview, commands, and structure.

## Snapshots, links, and the dev container

```bash
pixi run tools watch-repos             # fetch all public GitHub repository pages
pixi run tools watch-repos --check     # validate data/repositories.json offline
pixi run tools registries              # fetch npm, PyPI, and Prefix.dev
pixi run tools registries --check      # validate data/packages.json offline
pixi run tools docs-link-check         # Lychee: local and remote README/docs links
pixi run tools docs-link-check --offline
pixi run tools devcontainer            # validate config without installing
pixi run tools devcontainer --setup    # frozen install + Vale sync
pixi run tools devcontainer --setup --hooks  # explicitly opt into hooks
```

GitHub refresh accepts `GH_TOKEN` or `GITHUB_TOKEN` for authenticated API
requests. It projects stable public fields, checks every API page, derives
hygiene counts, and preserves the old capture date when only the date changed.
The curated `data/packages-manifest.json` declares account identities, names,
relations and aliases. A full registry refresh fetches npm package records and
maintainer inventory, PyPI records and all Prefix.dev channel pages. Missing or
undeclared packages, aliases without a target, or a release/reservation mismatch
fail before the committed capture is atomically replaced. `--check` requires a
complete dated capture consistent with the current manifest and works offline.
Both snapshots were seeded from the previous profile repository's captures dated
2026-11-10. They refresh independently; check each file's `retrieved` date and
refresh explicitly when live data is needed. The old mirrored profile
README is not present here, so the monorepo README is not modified by watchers.

Lychee checks `README.md` and `docs/**/*.{md,mdx}`; by default it also contacts
remote links. CI uses `--offline` for deterministic local checks. After a static
export exists, `--site-dir apps/portfolio/out --base-path /project` adds HTML
and remaps the published GitHub Pages prefix to local files. Without an export,
source-only checks stage Fumadocs-style routes pointing at the corresponding MDX. Unsafe paths and a
missing export fail closed. The portfolio uses root hosting, so omit `--base-path` for its export. Neither
this check nor devcontainer validation starts a server. See DOC-008 for locked bootstrap and opt-in hooks.

## Task kernel

```bash
pixi run tools task --list
pixi run tools task docs:index version:sync readme:check
pixi run tools task docs:index --dry-run
pixi run tools task version:sync --force
```

Tasks are declared in sorted built-in `packages/tools/src/tasks/*.ts` and root
`tasks/*.ts` files; duplicate names identify both sources. File and target
hashes live in ignored `.tools-cache/tasks.json`. The backlog index is generated
from frontmatter and the existing status lines; `docs:index:check` detects drift
without writing. `readme:check:<workspace-path>` verifies each README heading
against its manifest, and `readme:check` depends on every workspace check. See
[DOC-013](DOC-013-task-kernel.md) for the API and execution semantics.

## Adding a command

1. Write an executable `test.scenario` in `features/<name>.test.ts`.
2. Add `src/cli/commands/<name>.ts` — `export default defineCommand({...})`.
3. The kebab-case filename becomes the command name; no registration needed.
   Only top-level `.ts` files are discovered; `.d.ts`, `.test.ts`, and
   `.spec.ts` files are excluded. A command must provide `run` or `subCommands`.
4. Add any supporting unit tests in `tests/<name>.test.ts`.

Commands are imported lazily. Root help loads their metadata, and a broken
module or invalid command export fails with its filename and a clear reason
rather than silently disappearing from help. See DOC-012 for an example.

## Static AI exports

`pixi run tools export-ai` consumes the Fumadocs-processed `ai-manifest.json`
from `apps/portfolio/out` after Next.js has built it. It writes Markdown twins,
LLM indexes, RSS/JSON feeds, and `.nojekyll`; it validates paths and dates before
writing. The portfolio build invokes it and then indexes HTML with Pagefind.
Run `bun run --cwd apps/portfolio test:seo` after building to verify the actual
HTML, sitemap, Markdown, feeds, search index, and locked output hashes.
