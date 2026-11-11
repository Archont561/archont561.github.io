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

## M5 browser tests

The portfolio uses the Bun runner and `bun-test-utils` fixtures with its
`playwright` peer, not the separate Playwright Test runner. Its regular test
entry includes component, scenario, and browser tests. Browser cases skip when
no Playwright-managed Chromium or explicitly configured executable is installed;
other launch failures remain failures. When a browser is available, the suite
builds a fresh static export and serves it on a local test server. The portfolio
Turbo test task bypasses the cache so installing a browser takes effect without a
source change. Installation and executable-override instructions live in the
portfolio README. No browser binary is bundled with the repository.

Playwright's managed Chromium is the default rather than adding
`@sparticuz/chromium`: the evaluated 153.0.0 package includes a separate, roughly
70 MB unpacked serverless-oriented binary payload and requires explicit
executable and launch-argument configuration. It is not discovered automatically
by these fixtures. An externally provisioned binary, including Sparticuz Chromium, can
still be used with the documented overrides when its version and platform are
compatible.

[TASK-016](../tasks/TASK-016-portfolio-browser-tests.md) remains open for WebKit,
physical-device checks, the future interactive globe, and offline behavior.
