# TASK-013: Interactive portfolio atlas and project cards

**Status:** in progress · **Milestone:** M5 · **Labels:** portfolio, accessibility, 3d

## Goal

Present project domains as continents and projects or package families as
clickable countries, without making the globe the only way to explore the site.
Use the committed project and registry snapshots as the data source.

## Acceptance criteria

- [ ] Lazy-load `react-globe.gl` in a client component while retaining static
      export. Provide project-specific regions and stable mappings to existing
      curated project and package records; do not invent docs or registry links.
- [ ] Show the full-screen loader until an actual globe frame is visible, fade
      it out, and only then start the entrance animation. Verify first-frame
      timing; the library readiness callback alone is not proof of a painted frame.
- [ ] Offer a usable project-list escape during loading and switch to that list
      on WebGL errors or a reasonable timeout. The list remains usable with a
      keyboard, on mobile, and without working WebGL or JavaScript.
- [ ] Select a project or family to open an original trading-card-style
      showcase with its available docs, registry, and source links. Provide
      accessible names, focus management, close behavior, and keyboard controls.
- [ ] Retain filters for the existing Geospatial, Environments, Testing, Agents,
      and Developer tools domains. Preserve registry-specific versions and
      distinguish aliases and reserved, upstream, and unreviewed relationships.
- [ ] Respect reduced motion, disable unwanted auto-rotation, limit rendering
      cost on smaller devices, and pause unnecessary work when hidden. Verify
      performance rather than assuming a package makes rendering smooth.
- [ ] Offline cache preparation never holds the loader open. Exercise slow-load,
      failure, reduced-motion, touch, and keyboard paths with browser tests.

## Progress

The homepage opens with a full-viewport, clearly labeled static globe
placeholder. A preview remains at `/#work` and links to the complete project
list at `/projects/`, which also works without JavaScript. The interactive globe,
loader, project-card selection, and WebGL failure handling remain to be
implemented.

## Notes

The optional Motion, Radix, and spherical-geometry packages are not selected by
this task. Existing routes and the static SEO/Markdown contract must survive.
See [M5](../milestones/M5-portfolio-experience.md) and
[TASK-016](TASK-016-portfolio-browser-tests.md).
