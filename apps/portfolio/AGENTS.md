# @archont561/portfolio

Next.js and Fumadocs static site at the GitHub Pages user-site root.

- Canonical content lives in root `docs/`; data comes from committed snapshots.
  The worker client and live-data fallback are not implemented yet.
- Run `bun run --cwd apps/portfolio build`, then `bun run --cwd apps/portfolio
  test:seo` and the offline exported-site link check before deploying.
- Do not edit `.source/`, `.next/`, `out/`, `next-env.d.ts`, or generated
  `src/app/uno.css`. The shared UnoCSS and Next configs are in `packages/tools`.
- UnoCSS colors, spacing, and radii come from `src/app/tokens.css` through
  `createTokensPreset`; `styles:watch` reloads changes to that file. Keep brand
  aliases and other terrain rules in `uno.config.ts`.
- `src/app/legacy.css` is an unconditional, day-palette baseline loaded before
  modern styles for older WebKit without CSS variables, Grid, or `@supports`.
  Keep its literal colors aligned with the tokens and its Autoprefixer directive
  intact. Its static pages do not promise React-powered search, project filters,
  or theme controls; the package filters use CSS. To run the optional old-engine
  export probe, set
  `PORTFOLIO_LEGACY_WEBKIT_EXECUTABLE` to a PhantomJS 2.1.1 binary and run
  `bun run --cwd apps/portfolio test:browser`. This is not a Tizen device test.
- `public/favicon.ico` is a multi-size raster fallback for
  `public/brand/terrain-a-favicon.svg`; regenerate it when the SVG changes. Keep
  a 64×64 BMP frame first so older WebKit can decode it, followed by the smaller
  BMP frames and the 256×256 PNG frame.
- SEO/Markdown contract: `backlog/decisions/D-008-seo-static.md` and
  `backlog/docs/DOC-010-seo-llm-surface.md`. URLs have no base-path prefix.
