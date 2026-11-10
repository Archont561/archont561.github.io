# TASK-010: Automation port — watch-repos, registries, link-check, devcontainer

**Status:** not started · **Milestone:** M1 · **Labels:** tools

Second slice of D-010.

## Acceptance criteria

- [ ] `tools watch-repos` writes repository-audit snapshots
- [ ] `tools registries` refreshes `data/packages.json` (npm/PyPI/conda)
- [ ] `tools docs-link-check` (lychee) and `tools devcontainer` checks
- [ ] All old `automation/*.py`, `dodo.py`, and pytest config deleted; `check`
      runs the new commands only
