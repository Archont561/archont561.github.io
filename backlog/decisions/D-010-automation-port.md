# D-010: Automation port (Python → tools CLI), scope and timing

**Status:** accepted · **Date:** 2026-11-10

## Context

The previous repo's automation lived in `automation/*.py` (doit + pytest-bdd):
`check_structure`, `readme`, `agents`, `watch_repos`, `registries`, `export_ai`,
`docs_link_check`, `devcontainer_setup`. That automation belongs to *this*
repository's workflows — it is not a cross-repo platform.

## Decision

- All of it ports into `packages/tools/src/cli/commands/*.ts` as citty
  commands (D-005). **`doit`/`dodo.py`/Python do not return.**
- **Timing: M1, together with the CLI** — the automation *is* the tools
  package; there is no separate late "migration" milestone. What remains at
  M4/M5 levels is only the pieces that depend on later milestones (e.g.
  `export-ai` needs the SEO pipeline from D-008).
- **Scope: this repo only.** The citty tools are `private: true` and are not a
  product for other `Archont561/*` repositories. Other repos may copy ideas;
  they are not consumers. This retires the earlier "rollout to other repos"
  milestone.
- Port order (M1): `check-structure` → `version` (done) → `readme` / `agents`
  → `watch-repos` / `registries` → `docs-link-check` / `devcontainer` →
  `export-ai` (M4, with the SEO pipeline).
- **doit's *runner* layer is replaced by the task kernel** specified in
  DOC-013 (TASK-011): DAG + `file_dep`/`targets`/`uptodate` skip-if-clean
  state + task-generator presets, as a zero-dependency module in `tools`.
  Commands port above run under it where file-driven orchestration helps.

## Consequences

- Gherkin scenarios in `tools/features/` carry over the old
  `automation/features/*.feature` behaviour, one command at a time.
- `pixi run tools <command>` becomes the only automation entry.
