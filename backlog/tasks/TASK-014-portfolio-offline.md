# TASK-014: Offline portfolio experience

**Status:** not started · **Milestone:** M5 · **Labels:** portfolio, offline, static-export

## Open scope decision

Choose either the whole site including documentation and search, or the atlas
and package directory only. Measure the completed export and its cache size
before deciding. Until this is resolved, neither scope is promised or implemented.

## Acceptance criteria

- [ ] Review and resolve, mitigate, or explicitly accept the Workbox dependency
      audit findings in [TASK-019](TASK-019-dependency-security.md) before
      enabling the offline build.
- [ ] Generate a service worker with `workbox-build` after Next's static export,
      `tools export-ai`, and Pagefind, so the precache sees the final outputs.
      Serve it from the GitHub Pages site root; do not require a backend.
- [ ] Explicitly include the selected pages and all assets they need: HTML,
      Next JavaScript/CSS and route data, relevant images/fonts/data, and
      Pagefind files when docs search is in scope. Self-host required assets.
- [ ] Handle `trailingSlash` directory URLs, direct loads, reloads, and Next
      client navigation; do not assume a generic precache configuration covers
      every App Router request.
- [ ] Indicate offline readiness only after the selected cache completes and
      the appropriate service worker is active. Handle failed downloads, storage
      limits, eviction, and updates without falsely claiming the site is ready.
- [ ] Define an update and old-cache cleanup policy that does not strand open
      pages with incompatible assets. Cache preparation must not block the atlas
      loader or the project-list fallback.
- [ ] After an initial online visit and completed installation, test offline
      direct loads of previously unvisited pages in scope, in-app navigation,
      and search if selected. Also test a new deployment and unavailable cache.
- [ ] Explain the selected scope and limitations: browser storage can be
      evicted, and external GitHub, registry, and other links need connectivity.

`workbox-build` is prepared but no worker or offline feature exists yet.
Partytown is not a substitute for this cache. See
[TASK-016](TASK-016-portfolio-browser-tests.md) for browser coverage.
