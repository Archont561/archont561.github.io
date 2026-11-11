# @archont561/portfolio

Next.js and Fumadocs static site at the GitHub Pages user-site root.

- Canonical content lives in root `docs/`; data comes from committed snapshots.
  The worker client and live-data fallback are not implemented yet.
- Run `bun run --cwd apps/portfolio build`, then `bun run --cwd apps/portfolio
  test:seo` and the offline exported-site link check before deploying.
- Do not edit `.source/`, `.next/`, `out/`, `next-env.d.ts`, or generated
  `src/app/uno.css`. The shared UnoCSS and Next configs are in `packages/tools`.
- SEO/Markdown contract: `backlog/decisions/D-008-seo-static.md` and
  `backlog/docs/DOC-010-seo-llm-surface.md`. URLs have no base-path prefix.
