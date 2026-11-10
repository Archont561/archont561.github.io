# M4: portfolio migration + SEO/LLM surface

**Status:** not started · **Depends on:** M3 · **Decisions:** D-008, D-011

## Scope

- Copy `Archont561/Archont561/portfolio` source into `apps/portfolio`
  (Next.js + Fumadocs, static export), adjusted to the monorepo (imports from
  `@archont561/tools`, client integration with snapshot fallback).
- `tools export-ai`: llms.txt, llms-full.txt, per-page `.md` twins, feeds
  (D-008, DOC-010); `app/sitemap.ts` + `app/robots.ts`.
- `pages.yml` deploy to GitHub Pages; `seo.test.ts` contract + snapshots.
- `docs/` content tree migrated; link check via `tools docs-link-check`.

## Exit criteria

- [ ] Site builds and deploys to `https://archont561.github.io/`
- [ ] All DOC-010 artifacts present and snapshot-tested
- [ ] Live client data with snapshot fallback verified
