# Milestones — scope note

**These milestones are scoped to this repository only.** `packages/tools` (the
citty CLI) is repo-internal (`private: true`); it is not a platform for other
`Archont561/*` repositories, and cross-repo rollout is **not** a milestone.
Other repos may copy patterns; they are not consumers.

The automation port is **not** a late migration milestone — it is part of
building `tools` itself (M1), per D-010.

| Milestone | Scope |
| --- | --- |
| [M0](M0-scaffold.md) | Scaffold + package-meta helper (done 2026-11-10) |
| [M1](M1-tools.md) | tools: CLI autodiscovery, shared configs, automation port, task kernel |
| [M2](M2-github-app.md) | Worker: Hono + OpenAPI + Neon + KV + webhooks |
| [M3](M3-client.md) | github-app-client: codegen + bunup + npm publish |
| [M4](M4-portfolio-seo.md) | Portfolio migration + SEO/LLM surface |
| [M5](M5-portfolio-experience.md) | Portfolio atlas, documentation, and offline experience |
