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

The packages page reads the committed `data/packages.json`; project cards use
curated `src/lib/projects.json` and matching docs. No live worker call or
client fallback is implemented yet: M2/M3 must land first (D-011).

`@/*` maps to this package root. The shared Next and TypeScript configs support
that alias; cross-workspace imports use package names. UnoCSS consumes the
shared preset; handwritten CSS supplies the visual identity.
