# @archont561/portfolio

Next.js and Fumadocs static portfolio for `https://archont561.github.io/`.
Run commands from the repository root in the locked Pixi environment:

```sh
pixi run bun run --cwd apps/portfolio dev
pixi run bun run --cwd apps/portfolio build
pixi run bun run --cwd apps/portfolio test:seo
pixi run tools docs-link-check --offline --site-dir apps/portfolio/out
```

`build` compiles the root `docs/` MDX, exports static HTML, runs
`tools export-ai` on Fumadocs-processed Markdown, and creates the Pagefind
index. It writes `out/` at the site root without a base path. Generated
`.source/`, `.next/`, `out/`, `next-env.d.ts`, and `src/app/uno.css` are ignored.
See [AI access](../../docs/ai-access.mdx) and
[deployment](../../docs/guides/deployment.mdx) for the export contract and
old project-site URL caveat.

The documentation sidebar renders the Fumadocs page tree, including the
project-domain separators and ordering in `docs/projects/meta.json`. It uses
native disclosure controls, so navigation also works without JavaScript. Legacy
heading fragments are retained when reorganizing existing pages. The homepage
opens with a full-viewport static globe placeholder and a project preview at
`/#work`. The complete filterable project directory lives at `/projects/`; its
full list remains available without JavaScript. `/docs/projects/` remains the
documentation index. The interactive atlas is not implemented yet.

Search opens a palette from the header or documentation sidebar. Use Ctrl+K or
Command+K to open it, the arrow keys and Enter to select a result, and Escape to
close it. Quick links cover the main site sections; search results come from the
built Pagefind documentation index. The direct `/search/` page remains available,
and the search links lead there without JavaScript; its fallback links to the
documentation and project list.

The packages page reads the committed `data/packages.json`. Choose npm, PyPI,
or Prefix.dev to filter its directory, or choose All registries to reset it;
these controls work without JavaScript. Each registry heading retains a link to
its external registry. Project cards use curated `src/lib/projects.json` and
matching docs. No live worker call or client fallback is implemented yet: M2/M3
must land first (D-011).

`@/*` maps to this package root. The shared Next and TypeScript configs support
that alias; cross-workspace imports use package names. UnoCSS consumes the
shared preset; handwritten CSS supplies the visual identity.
