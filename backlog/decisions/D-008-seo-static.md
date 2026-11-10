# D-008: SEO / AI surface (build-time, static-export safe)

**Status:** accepted · **Date:** 2026-11-10

## Context

The portfolio is a Next.js + Fumadocs `output: export` site served by GitHub
Pages — no runtime server, no server-dependent routes (repo policy). SEO and
LLM discoverability need: sitemap, robots, feeds, `llms.txt`, and a plain
Markdown twin per page.

## Decision

All artifacts are generated **at build time** into the static export:

| Artifact | Mechanism |
| --- | --- |
| `sitemap.xml` | `app/sitemap.ts` (Next metadata route, from the Fumadocs loader; `lastModified` from frontmatter/file mtime) |
| `robots.txt` | `app/robots.ts` (allow + `Sitemap:` line; explicit AI-crawler policy) |
| `feed.xml` + `feed.json` | build-time generation (`tools export-ai`), discovery `<link>`s rendered manually in the layout (relative hrefs — `metadata.alternates` would emit absolute URLs that break link-check pre-deploy) |
| `llms.txt` / `llms-full.txt` | build-time via Fumadocs processed-markdown (`includeProcessedMarkdown` + `getLLMText`) |
| `docs/<slug>.md` twins | physical files written into the export by `tools export-ai` |
| per-page SEO | `generateMetadata`: canonical, OG/Twitter card (page-level `openGraph` replaces the inherited one), markdown alternate links |

- `metadataBase` = `https://archont561.github.io/` (user site at domain root;
  no base-path prefix).
- Runtime rewrites (`proxy.ts`, `beforeFiles`) are **not** used — they do not
  survive static hosting. JSON-LD (`WebSite`, `ProfilePage`,
  `SoftwareSourceCode`) ships in page data.

## Consequences

- `seo.test.ts` (M4) pins the contract: every docs page appears in sitemap and
  llms.txt and has a non-empty `.md` twin, with snapshot-locked outputs.
