# TASK-008: SEO/LLM surface (export-ai + contract tests)

**Status:** done · **Milestone:** M4 · **Labels:** portfolio, tools

## Acceptance criteria

- [x] `tools export-ai` emits llms.txt, llms-full.txt, per-page `.md`, feeds
      (D-008/DOC-010)
- [x] `app/sitemap.ts` + `app/robots.ts` from the Fumadocs loader
- [x] `seo.test.ts`: every docs page has sitemap entry, llms row, `.md` twin;
      outputs snapshot-locked
- [x] Canonical + markdown alternate links verified in HTML head

The static build runs Fumadocs processed-Markdown export and Pagefind. Contract
tests compare the source tree with the export, inspect HTML heads, exercise search,
and snapshot artifact hashes.
