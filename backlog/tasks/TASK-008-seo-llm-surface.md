# TASK-008: SEO/LLM surface (export-ai + contract tests)

**Status:** not started · **Milestone:** M4 · **Labels:** portfolio, tools

## Acceptance criteria

- [ ] `tools export-ai` emits llms.txt, llms-full.txt, per-page `.md`, feeds
      (D-008/DOC-010)
- [ ] `app/sitemap.ts` + `app/robots.ts` from the Fumadocs loader
- [ ] `seo.test.ts`: every docs page has sitemap entry, llms row, `.md` twin;
      outputs snapshot-locked
- [ ] Canonical + markdown alternate links verified in HTML head
