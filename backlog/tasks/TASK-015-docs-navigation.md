# TASK-015: Scannable documentation and grouped navigation

**Status:** not started · **Milestone:** M5 · **Labels:** docs, accessibility, portfolio

## Goal

Reduce visible prose and make the documentation faster to scan while retaining
necessary warnings, verified instructions, and the existing public URLs.
Project repositories remain the authoritative sources for their behavior.

## Acceptance criteria

- [ ] Replace the flat docs sidebar with grouped navigation based on the content
      tree. Keep current routes and provide keyboard and mobile access.
- [ ] Group project pages without moving their URLs: Geospatial
      (`qgis-agent-harness`, `qgis-sdk`, `cloudcompare-conda`, `odm-conda`);
      Environments (`pixi-sandbox`, `universe`, `staged-recipes-submit`);
      Testing (`bun-test-utils`, `playtest`); Agents (`artifactspec`, `skills`,
      `pyshellforge`); and Developer tools (`clifacet`).
- [ ] Provide a concise docs landing page and clear paths to project pages,
      task-oriented guides, concepts and reference, architecture, contributing,
      and resources. Use cards, steps, or tabs only where they improve scanning.
- [ ] Remove repeated introductory prose. Add quick starts and examples only
      after verifying them against the relevant project repository; retain
      essential prerequisites, limitations, and safety warnings.
- [ ] Keep Pagefind indexing, per-page Markdown, AI exports, links, metadata,
      and sitemap behavior working. Verify that content within any interactive
      component remains available to search and portable exports.
- [ ] Run the static build, SEO contract, offline link checks, and keyboard and
      mobile checks for the revised docs.

`fumadocs-core`, `fumadocs-mdx`, and Pagefind are already present. Fumadocs UI
is optional, not installed as a direct dependency; if selected later, check its
exact core peer version, styling integration, and Markdown export behavior.
