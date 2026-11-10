# D-009: pixi-sandbox — generated files policy

**Status:** accepted · **Date:** 2026-11-10

## Context

`pixi-sandbox init` generates the air-gapped restore machinery. Generated
files have drifted from their generator in sibling repos when hand-edited or
when `init --check` was not gated (observed in `qgis-rust` and `clifacet`).

## Decision

- Run **`pixi-sandbox init` pinned to v0.9.0** (current release). It generates:
  - `scripts/restore.sh` (version-stamped header; derives
    `<branch_prefix>/<bundle>-<platform>` from `pixi-sandbox.toml` at runtime)
  - `.github/workflows/relock.yml` (relocks on manifest edits)
  - `.github/workflows/publish-sandbox.yml` (packs + pushes the transport branch)
- **Hand-written:** `pixi-sandbox.toml` (bundle config). Everything else the
  init writes is regenerated, never hand-edited.
- **Gate drift in CI:** a pixi task + CI step running `pixi-sandbox init
  --check` with canonical arguments (it was "in no pixi task, not in gates and
  not in ci.yml" in sibling repos — the sanctioned but silent failure mode).
- Known historical bug: init 0.4.2 generated a publish workflow that built
  from the consumer checkout; pinned 0.9.0 is unaffected.
- Operator knobs documented in DOC-011: `PIXI_SANDBOX_FETCH=skip`,
  `PIXI_SANDBOX_USER_TOOLS=skip`, `PIXI_SANDBOX_BRANCH`/`PIXI_SANDBOX_BUNDLE`.

## Consequences

- The sandbox workflows appear only after `pixi-sandbox init` runs (TASK-001);
  until then alint's `shared-root-contract` covers only committed files.
- **Status (2026-11-10):** init executed with pinned 0.9.0 (SHA-verified) —
  `scripts/restore.sh`, `relock.yml`, `publish-sandbox.yml` generated;
  `pixi.lock` + `pixi-sandbox.toml` (schema 1, `cargo_vendor = false`) are
  committed inputs; `init --check` is green and gated in `ci.yml` + the
  `sandbox-check` pixi task.
