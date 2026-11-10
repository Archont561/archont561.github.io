# TASK-001: Generate pixi.lock and run pixi-sandbox init

Status: **done (2026-11-10)** · Depends on: — · Blocks: M1 exit · Decision: [D-009](../decisions/D-009-pixi-sandbox.md)

## Acceptance criteria

- [x] `pixi lock` solves and commits `pixi.lock` (all platforms pinned).
- [x] `pixi-sandbox init` (pinned binary 0.9.0, SHA256-verified against the
      release `SHA256SUMS`) generates its owned files: `scripts/restore.sh`
      (via `--script-path scripts/restore.sh`), `.github/workflows/publish-sandbox.yml`,
      `.github/workflows/relock.yml` — generated-only, never hand-edited (D-009).
- [x] Reviewed plan in `pixi-sandbox.toml`: `schema = 1`, `branch_prefix = "sandbox"`,
      `cargo_vendor = false` (JS-only repo), `[[bundle]] name = "developer"`,
      `environments = ["default"]`, `platforms = ["linux-64"]`.
- [x] `pixi-sandbox init --check --project-root . --script-path scripts/restore.sh`
      passes ("every owned file matches a fresh render"); wired as a CI gate in
      `.github/workflows/ci.yml` (checksum-verified fetch of the pinned binary).
- [x] Launcher smoke: `sh -n scripts/restore.sh` clean; without a git remote it
      fails closed with an actionable error (needs a published sandbox branch —
      end-to-end fetch is exercised by the publish workflow once a remote exists).

## Notes

- Lockfile refresh is automated by the generated `relock.yml` bot (dispatches
  `ci.yml` as the verdict workflow for its lock commit).
- `pixi-sandbox plan --config pixi-sandbox.toml` reports
  `developer: default · linux-64 · sandbox/developer-linux-64` — the archived
  branch name the launcher resolves.
