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

- `@/*` → package root (use `@/src/...`). The shared Next config supplies the
  Turbopack alias because it does not expand the shared tsconfig's
  `${configDir}` paths. Imported source packages must not use their own `@/`
  aliases in public entrypoints; use package self-references or relative imports
  instead, since Next and TypeScript resolve them in the app's context.
- `src/version.ts` reports `name`/`version` via `@archont561/tools/package-meta`.
- `uno.config.ts` consumes the shared custom-rule preset (including `sr-only`);
  use custom rules + handwritten styles, not Tailwind/PostCSS.
