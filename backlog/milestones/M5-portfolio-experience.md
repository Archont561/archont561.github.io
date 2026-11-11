# M5: Portfolio atlas, documentation, and offline experience

**Status:** in progress · **Depends on:** deployed M4 static foundation, not M2/M3 live integration · **Decisions:** D-008, D-011; D-007 review pending

## Scope

Build on the existing snapshot-only GitHub Pages site. Preserve static export,
existing URLs, accessible navigation, Pagefind, and Markdown/AI exports.

- [TASK-013](../tasks/TASK-013-portfolio-atlas.md): interactive project atlas,
  first-frame loader, project cards, and accessible list fallback.
- [TASK-014](../tasks/TASK-014-portfolio-offline.md): post-export service worker,
  offline readiness, update handling, and offline navigation.
- [TASK-015](../tasks/TASK-015-docs-navigation.md): scannable documentation,
  grouped sidebar, and concise, verified project guides.
- [TASK-016](../tasks/TASK-016-portfolio-browser-tests.md): browser, mobile,
  accessibility, failure, and offline regression tests.
- [TASK-017](../tasks/TASK-017-package-directory.md): package directory filters
  and accurate registry-specific status and version information.
- [TASK-018](../tasks/TASK-018-portfolio-navigation.md): shared page navigation
  and explicit decisions about any additional pages.

The cross-cutting [TASK-019](../tasks/TASK-019-dependency-security.md) tracks
existing workspace audit findings and the new Workbox dependency advisories.

## Prepared dependencies

`apps/portfolio` declares `react-globe.gl` for the proposed atlas and
`workbox-build` and `@playwright/test` as development dependencies. The site
now has grouped Fumadocs navigation, shared page navigation, a Pagefind search
palette, a full-viewport static globe placeholder, and a project directory at
`/projects/`. The interactive globe, service worker, browser test suite, and
Playwright configuration are not implemented. The proposed
separate Playwright runner must be reconciled with the current Bun test policy
in D-007 before it is integrated (TASK-016).

Motion, Radix, Fumadocs UI, and geometry-generation packages remain optional;
adding them requires the normal dependency approval. Three.js is a transitive
dependency of the globe library; add it directly only if application code uses
its API.

## Open decisions

- Offline coverage: the whole site including docs and search, or the atlas and
  package directory only. Measure the export before choosing; do not claim a
  broader offline guarantee than the selected, successfully cached scope.
- Whether to add top-level About or Blog pages. `/docs/about/` already exists.
- Whether to adopt optional UI or geometry libraries after assessing bundle,
  accessibility, export, and styling implications.

Owner-only dashboards, public live feeds, and package-name checking or
reservation automation remain discussion only and are not part of this milestone.

## Exit criteria

- [ ] Atlas and non-WebGL fallback work on desktop, mobile, and with a keyboard.
- [ ] The selected offline scope works after an initial online cache completes,
      including tested updates and direct and client-side navigation.
- [ ] Docs are easier to scan without losing warnings, existing routes, Pagefind,
      or portable Markdown and AI exports.
- [ ] Package metadata distinguishes registries, versions, aliases, relations,
      and snapshot age without implying unverified releases.
- [ ] Navigation and browser tests cover the chosen experience and accessibility.
