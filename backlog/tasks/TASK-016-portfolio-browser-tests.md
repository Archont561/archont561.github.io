# TASK-016: Portfolio browser and offline regression tests

**Status:** not started · **Milestone:** M5 · **Labels:** tests, portfolio, accessibility

## Runner decision

`@playwright/test` is declared for the proposed browser suite but is not
configured. D-007 currently specifies Bun as the test runner. Before integrating
the suite, either document a targeted Playwright Test exception in D-007 or use
Bun with the existing `@archont561/bun-test-utils` browser fixtures and the
`playwright` peer. Do not silently replace the existing Bun suites.

## Acceptance criteria

- [ ] Record the runner decision and provide a reproducible local test command,
      browser installation instructions, and an integration plan for the
      workspace test entry. Obtain required approval before changing CI.
- [ ] Test the static export on desktop and mobile-sized browser contexts,
      including keyboard navigation, focus, card opening/closing, reduced motion,
      and the project-list fallback.
- [ ] Test the globe loader's first-frame sequence and its skip, timeout, and
      WebGL/error paths. Avoid relying solely on screenshots or a readiness
      callback that does not prove a frame was rendered.
- [ ] After online installation and cache completion, emulate offline mode and
      test direct loads, in-app navigation, and search when it is in the chosen
      scope. Cover previously unvisited cached pages, updates, and cache failures.
- [ ] Exercise package filters and docs navigation while preserving existing
      SEO/Markdown contracts and accessible alternatives to canvas interaction.
- [ ] Run at least Chromium and WebKit where supported; document that mobile
      emulation is not a substitute for checking an actual phone.

This is planned coverage, not a claim that browser tests or browser binaries
are already installed. See [TASK-013](TASK-013-portfolio-atlas.md) and
[TASK-014](TASK-014-portfolio-offline.md).
