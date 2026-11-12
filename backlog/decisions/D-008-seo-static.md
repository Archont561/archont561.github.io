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
| `sitemap.xml` | `app/sitemap.ts` (Next metadata route, from the Fumadocs loader; `lastModified` from frontmatter when declared; omitted otherwise to keep exports reproducible across checkouts) |
| `robots.txt` | `app/robots.ts` (allow + `Sitemap:` line; explicit AI-crawler policy) |
| `feed.xml` / `feed.rss` + `feed.atom` + `feed.json` | build-time generation (`tools export-ai`), discovery `<link>`s rendered manually in the layout (relative hrefs — `metadata.alternates` would emit absolute URLs that break link-check pre-deploy) |
| `/seo/feed/`, `/seo/robots/`, `/seo/sitemap/` | static pages fetch the raw local artifacts for rendered, source, or combined browser views; raw files remain available without JavaScript |
| `/seo/pages/` | static inspector reads the HTML head of a known local page and shows metadata and an illustrative Open Graph card |
| `llms.txt` / `llms-full.txt` | build-time via Fumadocs processed-markdown (`includeProcessedMarkdown` + `getLLMText`) |
| `docs/<slug>.md` twins | physical files written into the export by `tools export-ai` |
| per-page SEO | `generateMetadata`: canonical, OG/Twitter card (page-level `openGraph` replaces the inherited one), markdown alternate links |

- `metadataBase` = `https://archont561.github.io/` (user site at domain root;
  no base-path prefix).
- Runtime rewrites (`proxy.ts`, `beforeFiles`) are **not** used — they do not
  survive static hosting. Query strings on raw files cannot select a preview;
  dedicated static preview routes preserve their machine-readable responses.
  JSON-LD (`WebSite`, `ProfilePage`, `SoftwareSourceCode`) ships in page data.
- Atom requires `updated` on the feed and every entry. For undated pages it uses
  the explicit feed edition date, not an invented document date; advance that
  edition when changing undated entries. RSS, JSON Feed, and the sitemap omit
  unknown page dates.

## Consequences

- `seo.test.ts` (M4) pins the contract: every docs page appears in sitemap and
  llms.txt and has a non-empty `.md` twin, with snapshot-locked outputs.
