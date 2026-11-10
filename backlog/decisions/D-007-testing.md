# D-007: Testing (bun-test-utils + Gherkin, once per repo)

**Status:** accepted · **Date:** 2026-11-10

## Context

Testing must run on the Bun test runner with fixture ergonomics
(`@archont561/bun-test-utils`), and readable behavioural specs in Gherkin like
the Python suite it replaces (`automation/features/*.feature` +
pytest-bdd). Shared code must not be re-tested in every consumer.

## Decision

- **Runner:** `bun test` extended by `@archont561/bun-test-utils` —
  `test.extend()` fixtures with session/file/test scopes and LIFO teardown
  (e.g. a `tree` tmpdir fixture), plus its `expect`/`describe`.
- **Behaviour specs:** `@aboviq/bun-test-cucumber` runs Gherkin on the same
  `bun test` runner: `features/*.feature` (prose), `tests/*.steps.ts`
  (`withState<State>()` step definitions), `tests/features.test.ts`
  (`loadFeatures`), and `tests/cucumber-preload.ts` registered in
  `bunfig.toml [test].preload`. Step signature: `(state, captures[]) => state`.
- **Once per repo:** shared code (like package-meta) is tested in
  `packages/tools/features/` + `packages/tools/tests/` only. Consuming
  packages get their own suites only when they gain their own behaviour
  (M2+); they never duplicate shared-code suites.
- Layout convention per testable package: `features/` = Gherkin, `tests/` =
  steps + unit tests. New shared behaviour starts with a scenario.
- Optional bun-test-utils peers (`fast-check`, `happy-dom`, `playwright`) are
  added only when a suite needs them.

## Consequences

- `bun run test` (turbo) is the one test entry; CI runs it in `ci.yml`.
- E2E/Playwright suites stay out of scope until M4.
