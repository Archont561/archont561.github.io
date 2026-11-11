# TASK-010: Automation port — watch-repos, registries, link-check, devcontainer

**Status:** done · **Milestone:** M1 · **Labels:** tools

Second slice of D-010.

## Acceptance criteria

- [x] `tools watch-repos` writes repository-audit snapshots
- [x] `tools registries` refreshes `data/packages.json` (npm/PyPI/conda)
- [x] `tools docs-link-check` (lychee) and `tools devcontainer` checks
- [x] All old `automation/*.py`, `dodo.py`, and pytest config deleted; `check`
      runs the new commands only

## Notes

`data/packages-manifest.json` is curated input; `data/packages.json` and
`data/repositories.json` are dated captures seeded from the previous profile
repository. Offline checks validate them without contacting registries. The old
profile README and mirrored profile template are not present in this monorepo;
the portfolio can consume these snapshots in M4 rather than rewriting this
repository's generated README. The vendored PCC Python fixtures and Semgrep's
Python runtime remain tooling, not repository automation.
