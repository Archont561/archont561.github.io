# D-007: Testing (bun-test-utils scenarios, once per repo)

**Status:** accepted · **Date:** 2026-11-10 (revised: executable `test.scenario` specs)

## Context

Testing must run on the Bun test runner with fixture ergonomics
(`@archont561/bun-test-utils`) and readable Given/When/Then behavioural specs
like the Python suite it replaces (`automation/features/*.feature` +
pytest-bdd). Shared code must not be re-tested in every consumer.

## Decision

- **Runner:** `bun test` extended by `@archont561/bun-test-utils` —
  `test.extend()` fixtures with session/file/test scopes and LIFO teardown,
  plus its `expect`/`describe`. `bunfig.toml` preloads bun-test-utils for
  run-wide teardown hooks.
- **Behaviour specs:** executable `features/*.test.ts` files define scenarios
  with `test.scenario(...).given(...).when(...).then(...)`. Steps and their
  assertions live together with the scenario; returned state is passed to the
  following steps. The built-in `tmpdir` fixture provides isolated workspaces.
  These chains are the single executable specs: there is no separate
  `.feature` loader or `tests/*.steps.ts` registry to keep in sync.
- **Peer dependency:** bun-test-utils 0.2.0 requires
  `@aboviq/bun-test-cucumber` for `test.scenario`; keep it installed even though
  this repo no longer registers its feature-loader plugin.
- **Once per repo:** shared code (like package-meta) is tested in
  `packages/tools/features/` + `packages/tools/tests/` only. Consuming
  packages get their own suites only when they gain their own behaviour
  (M2+); they never duplicate shared-code suites.
- Layout convention per testable package: `features/` = scenario specs,
  `tests/` = unit and integration tests. New shared behaviour starts with a
  scenario. Both directories are included in the tools typecheck.
- Optional bun-test-utils peers (`fast-check`, `happy-dom`, `playwright`) are
  added only when a suite needs them.

## Consequences

- `bun run test` (turbo) is the one test entry; CI runs it in `ci.yml`.
- One scenario is one Bun test; example tables can be expressed as typed loops.
- E2E/Playwright suites stay out of scope until M4.

## M5 browser-test proposal

`@playwright/test` is declared in the portfolio for the proposed browser suite,
but no suite or runner is configured. Playwright Test is a separate runner from
`bun test`; the Bun-only decision above remains in force until it is revised.
[TASK-016](../tasks/TASK-016-portfolio-browser-tests.md) must resolve whether to
record a targeted exception or use the Bun test-utils browser fixtures instead.
Existing shared-code and scenario tests remain on Bun either way.
