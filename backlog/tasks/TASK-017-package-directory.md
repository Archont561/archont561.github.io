# TASK-017: Package directory filters and accurate registry details

**Status:** done · **Milestone:** M5 · **Labels:** portfolio, packages, data

## Acceptance criteria

- [x] Keep `/packages/` as a static, useful directory using the committed npm,
      PyPI, and Prefix.dev snapshot. Retain its capture date and external links.
- [x] Add accessible filters or search by registry, project family, and relation;
      keep an unfiltered, navigable result available on mobile and without
      JavaScript. Do not infer a family when the curated data does not supply one.
- [x] Show versions per registry and distinguish authored packages, aliases,
      reserved names, upstream recipes, and unreviewed channel entries. Do not
      imply that an alias or upstream recipe is a separately authored project.
- [x] Investigate and accurately present the existing discrepancy between
      `reserved` records with `0.0.0` registry artifacts and the current
      "no release" copy. Separate curated intent from verified registry facts.
- [x] Keep counts and installation guidance consistent with the evidence and
      relation labels; link to package-specific docs only when they exist.
- [x] Verify keyboard/mobile behavior, static export, and browser regression
      tests without introducing request-time registry calls.

## Implementation and evidence

The static export combines native radio controls and CSS for registry, family,
and relation; a native reset restores all entries. Empty combinations have a
message. Families derive only from the manifest's explicit repositories or
same-registry alias targets; entries without a mapping stay unmapped. Family
links are labeled as project overviews and are emitted only for existing pages.
The page counts all captured registry entries, separately from authored
projects and from the CLI's relation-based `published` metric.

The 2026-11-10 snapshot records `0.0.0` versions and publication dates for all
six reserved npm names. An npm registry API check also returned `0.0.0` as the
latest version, a version record, and a tarball URL for each name. Reservation
is still the curated intent, not evidence of an absent artifact. The manifest
and snapshot retain a stale `@archont561/playtest` note saying nothing is
published; the presentation omits reservation notes rather than repeating that
claim, shows the captured artifact and date, and does not suggest installing a
reserved name. This task did not change or refresh the underlying data.

The production export and 24 SEO tests passed. Chromium tests covered all 192
registry/family/relation combinations with JavaScript disabled, keyboard focus
and reset, a 320px viewport, horizontal table scrolling, and no automatic
registry requests. The 33-test browser suite also included 25 PhantomJS 2.1.1
old-WebKit checks; PhantomJS is a proxy, not a physical Tizen device. The
offline exported-site link check passed with Lychee 0.24.2 and a temporary
configuration compatibility shim, not the Pixi-pinned 0.23.0. `bun run check`
passed locally using the same Lychee shim, a scripts-disabled frozen install,
and a staged alint 0.22.0 binary; browser tests were run separately with the
executables above. The Pixi-locked CI environment has not been run for this task.

This task changes the presentation of existing data only. Package-name checking,
registration, and reservation automation remain discussion only.
