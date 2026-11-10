# archont561.github.io

Monorepo for the Archont561 site and its automation. Deployed to GitHub Pages at
`https://archont561.github.io/`.

| Workspace | Package | Role |
| --- | --- | --- |
| `apps/portfolio` | `@archont561/portfolio` | Next.js + Fumadocs static site (scaffold only) |
| `apps/github-app` | `@archont561/github-app` | Cloudflare Worker (Hono + OpenAPI) + GitHub Action (scaffold only) |
| `packages/tools` | `@archont561/tools` | Repo-internal toolkit: typed package metadata (implemented), citty CLI (design only) |
| `packages/github-app-client` | `@archont561/github-app-client` | Generated OpenAPI client (bunup build, published to npm with provenance) |

## Status

Scaffold. Everything except the **package metadata helper** is design-only —
the proposed design lives in [`backlog/`](backlog/). Milestones: `backlog/milestones/`.

## Quickstart

```bash
pixi install          # system tooling (bun, actionlint, convco, vale, lefthook, ...)
bun install           # workspace dependencies
bun run test          # package-meta tests (tools/features + tools/tests)
pixi run tools version
```

## Conventions

- Conventional commits (checked by `convco` in the commit-msg hook and CI).
- Biome for JS/TS/JSON/CSS lint + format; Vale for prose; alint for repo structure.
- One Backlog.md task = one PR (`backlog/`).
- Read `AGENTS.md` before changing anything with an agent.

## License

MIT — see [LICENSE](LICENSE).
