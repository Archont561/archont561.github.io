# DOC-010: SEO & LLM surface

**Status:** implemented · **Milestone:** M4 · **Decisions:** D-008

Static, build-time artifacts (GitHub Pages serves files only):

| URL | Content | Producer |
| --- | --- | --- |
| `/sitemap.xml` | all indexable pages | `app/sitemap.ts` |
| `/robots.txt` | crawl rules + sitemap ref + AI-bot policy | `app/robots.ts` |
| `/feed.xml`, `/feed.json` | RSS + JSON Feed | `tools export-ai` |
| `/llms.txt` | page outline (titles, urls, summaries) | `tools export-ai` |
| `/llms-full.txt` | full corpus dump | `tools export-ai` |
| `/docs/<slug>.md` | per-page Markdown twin | `tools export-ai` |

## Rules

- Markdown bodies come from Fumadocs processed markdown
  (`includeProcessedMarkdown` + `getLLMText`) — never a hand-rolled converter.
- Each page exposes canonical URL + `<link rel="alternate" type="text/markdown">`;
  `llms.txt` lists the `.md` twin URLs.
- `metadataBase = https://archont561.github.io/` (domain root, no base path).
- Contract tests (M4): every docs page has sitemap entry, llms.txt row, and a
  non-empty `.md` twin; outputs snapshot-locked.

The portfolio build writes `ai-manifest.json` from Fumadocs processed Markdown,
then invokes `tools export-ai` and Pagefind. `bun run --cwd apps/portfolio
test:seo` checks the built files and snapshot-locks their hashes. Undated pages
omit timestamps rather than using checkout-dependent modification times.
