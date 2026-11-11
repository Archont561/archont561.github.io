# D-011: Portfolio data (committed snapshots + live client fallback)

**Status:** accepted · **Date:** 2026-11-10

## Context

The portfolio shows repository/package data (registry snapshots,
repository-audit) but must build statically and offline-ish. The worker API can
serve live data once M2/M3 land.

## Decision

- Committed JSON snapshots (`data/packages.json`, `data/repositories.json`) remain the **build-time source of truth** for
  static export.
- At build time the site may call the worker via `@archont561/github-app-client`
  for fresher values, **falling back to the committed snapshot** on any failure
  — the build never depends on the worker being up.
- Snapshot refresh is an automation command (`tools registries`, ported from
  `watch_registries`), run on schedule via the worker cron (M2) or workflow.

## Consequences

- Deterministic builds; snapshots are reviewed diffs like any code.

## Implementation status

The migrated site currently uses committed snapshots and curated project data
only. The worker API, generated client, and live-client fallback remain blocked
on M2/M3 and are not claimed as complete.
