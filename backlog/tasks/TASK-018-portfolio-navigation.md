# TASK-018: Shared portfolio navigation and page structure

**Status:** in progress · **Milestone:** M5 · **Labels:** portfolio, navigation, accessibility

## Acceptance criteria

- [x] Provide consistent, discoverable navigation for Atlas (`/`), Projects
      (`/projects/`), Packages (`/packages/`), Docs (`/docs/`), Search
      (`/search/`), and GitHub across the existing pages, with suitable mobile
      and keyboard behavior.
- [x] Preserve all existing public URLs, documentation links, Markdown/AI
      exports, and useful access to the project-list fallback.
- [x] Keep the docs sidebar grouping in
      [TASK-015](TASK-015-docs-navigation.md); do not flatten it into the shared
      top-level navigation.
- [ ] Decide separately whether top-level About or Blog pages are wanted before
      adding them. `/docs/about/` already exists; neither new page is approved.
- [x] Check focus states, accessible link names, small screens, direct loads,
      static export, and existing SEO/link contracts.

The shared header and a full-viewport static atlas placeholder are in place.
The homepage retains a preview at `/#work`, while `/projects/` contains the full
project list. Search opens a keyboard-accessible palette backed by the Pagefind
documentation index, with a direct search-page link and browse fallback when
JavaScript is not available. Native disclosure navigation also works without
JavaScript; the About and Blog decision remains open.
