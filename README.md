<!-- Generated from templates/README.md.ejs. Run pixi run readme after editing the template or package metadata. -->
# archont561.github.io

Monorepo for the Archont561 site and its automation. Deployed to GitHub Pages at
`https://archont561.github.io/`. Workspace: `archont561-workspace` (`0.0.0`).

| Workspace | Package | Role |
| --- | --- | --- |
| `apps/github-app` | `@archont561/github-app` | GitHub App: Cloudflare Worker (Hono + OpenAPI) and composite GitHub Action |
| `apps/portfolio` | `@archont561/portfolio` | Archont561 portfolio and docs site (Next.js + Fumadocs, static export) |
| `packages/github-app-client` | `@archont561/github-app-client` | Typed client for the github-app worker API (generated from its OpenAPI document) |
| `packages/tools` | `@archont561/tools` | Repo-internal toolkit: typed package metadata, citty CLI, shared configs |

## Status

M1 tooling and the static portfolio with SEO exports are implemented. The site
uses committed snapshots; the worker and live-client fallback remain planned in
the [backlog](backlog/README.md).

## Quickstart

```bash
pixi install --locked       # locked system tooling, including Vale and Lychee
bun install --frozen-lockfile # workspace dependencies
bun run test                # executable scenarios + unit tests
pixi run tools version
pixi run check-structure    # validate workspace and version contracts
pixi run readme-check       # verify generated README without writing
pixi run agents-check       # verify generated AGENTS.md regions without writing
pixi run tools task --list  # list repository tasks and their source files
pixi run check              # full local and CI quality gate
pixi run bun run --cwd apps/portfolio build    # static site and AI exports
pixi run bun run --cwd apps/portfolio test:seo # exported-site contract
```

Use `pixi run readme` and `pixi run agents` to refresh generated content. Edits
outside the marked AGENTS.md regions remain human-owned.

## Conventions

- Conventional commits (checked by `convco` in the commit-msg hook and CI).
- Biome for JS/TS/JSON/CSS lint + format; Vale for prose; alint for repo structure.
- One Backlog.md task = one PR (`backlog/`).
- Read `AGENTS.md` before changing anything with an agent.

## License

MIT — see [LICENSE](LICENSE).
