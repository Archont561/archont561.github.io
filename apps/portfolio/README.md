# @archont561/portfolio

Archont561 portfolio and docs site — Next.js 16 + Fumadocs, static export to
GitHub Pages. **Scaffold only** — migration lands in M4
(`backlog/milestones/M4-portfolio-seo.md`).

## Responsibilities (D-008, D-011)

- Static site with build-time SEO/LLM surface: sitemap, robots, feeds,
  `llms.txt`, per-page `.md` twins (`backlog/docs/DOC-010-seo-llm-surface.md`).
- Repository/package data from committed snapshots, refreshed live via
  `@archont561/github-app-client` with snapshot fallback (build never depends
  on the worker).

## Conventions

- `@/*` → `src/*` (tsconfig paths; Next.js honours them natively).
- `src/version.ts` reports `name`/`version` via `@archont561/tools/package-meta`.
- UnoCSS custom rules + handwritten styles (no Tailwind/PostCSS).
