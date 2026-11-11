# TASK-017: Package directory filters and accurate registry details

**Status:** not started · **Milestone:** M5 · **Labels:** portfolio, packages, data

## Acceptance criteria

- [ ] Keep `/packages/` as a static, useful directory using the committed npm,
      PyPI, and Prefix.dev snapshot. Retain its capture date and external links.
- [ ] Add accessible filters or search by registry, project family, and relation;
      keep an unfiltered, navigable result available on mobile and without
      JavaScript. Do not infer a family when the curated data does not supply one.
- [ ] Show versions per registry and distinguish authored packages, aliases,
      reserved names, upstream recipes, and unreviewed channel entries. Do not
      imply that an alias or upstream recipe is a separately authored project.
- [ ] Investigate and accurately present the existing discrepancy between
      `reserved` records with `0.0.0` registry artifacts and the current
      "no release" copy. Separate curated intent from verified registry facts.
- [ ] Keep counts and installation guidance consistent with the evidence and
      relation labels; link to package-specific docs only when they exist.
- [ ] Verify keyboard/mobile behavior, static export, and browser regression
      tests without introducing request-time registry calls.

This task changes the presentation of existing data only. Package-name checking,
registration, and reservation automation remain discussion only.
