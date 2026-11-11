# TASK-016: Portfolio browser and offline regression tests

**Status:** in progress · **Milestone:** M5 · **Labels:** tests, portfolio, accessibility

## Runner decision

Use the Bun runner, `@archont561/bun-test-utils` fixtures, and the `playwright`
peer as described in D-007. The portfolio's regular test command includes browser
cases but skips them when Chromium is not installed. Browser installation and
custom executable instructions are in the portfolio README. No CI workflow was
changed; the existing workspace test entry discovers these cases.

## Acceptance criteria

- [x] Record the runner decision and provide a reproducible local test command,
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

The initial Chromium suite covers theme persistence, storage failures, search,
project and package filters, mobile navigation, and the no-JavaScript fallback.
It rebuilds and serves the static export, but it does not install a browser.
WebKit, a physical phone, the interactive globe, and offline behavior remain
open. See [TASK-013](TASK-013-portfolio-atlas.md) and
[TASK-014](TASK-014-portfolio-offline.md).
