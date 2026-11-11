# TASK-015: Scannable documentation and grouped navigation

**Status:** in progress · **Milestone:** M5 · **Labels:** docs, accessibility, portfolio

## Goal

Reduce visible prose and make the documentation faster to scan while retaining
necessary warnings, verified instructions, and the existing public URLs.
Project repositories remain the authoritative sources for their behavior.

## Acceptance criteria

- [x] Replace the flat docs sidebar with grouped navigation based on the content
      tree. Keep current routes and provide keyboard and mobile access.
- [x] Group project pages without moving their URLs: Geospatial
      (`qgis-agent-harness`, `qgis-sdk`, `cloudcompare-conda`, `odm-conda`);
      Environments (`pixi-sandbox`, `universe`, `staged-recipes-submit`);
      Testing (`bun-test-utils`, `playtest`); Agents (`artifactspec`, `skills`,
      `pyshellforge`); and Developer tools (`clifacet`).
- [x] Provide a concise docs landing page and clear paths to project pages,
      task-oriented guides, concepts and reference, architecture, contributing,
      and resources. Use cards, steps, or tabs only where they improve scanning.
- [ ] Remove repeated introductory prose. Add quick starts and examples only
      after verifying them against the relevant project repository; retain
      essential prerequisites, limitations, and safety warnings.
- [x] Keep Pagefind indexing, per-page Markdown, AI exports, links, metadata,
      and sitemap behavior working. Verify that content within any interactive
      component remains available to search and portable exports.
- [x] Run the static build, SEO contract, offline link checks, and keyboard and
      mobile checks for the revised docs.

## Progress

The sidebar renders the Fumadocs content tree with native disclosures, including
project-domain separators. The landing and project directory are grouped, and
repeated project overviews were removed while keeping legacy heading fragments,
source links, snapshot dates, and caveats. No unverified quick starts were added;
further editorial review and the browser-suite decision remain open. Static export
and SEO regressions, source and export link checks, and Chromium keyboard, mobile,
no-JavaScript, and accessibility smoke checks passed. Local link checks used
Lychee 0.24.2 with a compatibility shim rather than the pinned 0.23.0.

`fumadocs-core`, `fumadocs-mdx`, and Pagefind are already present. Fumadocs UI
is optional, not installed as a direct dependency; if selected later, check its
exact core peer version, styling integration, and Markdown export behavior.
