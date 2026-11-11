# TASK-007: Portfolio migration into apps/portfolio

**Status:** in progress · **Milestone:** M4 · **Labels:** portfolio

## Acceptance criteria

- [x] Source from `Archont561/Archont561/portfolio` adapted to the monorepo
      (workspace imports, tsconfig/unocss from tools configs)
- [ ] `@archont561/github-app-client` integration with snapshot fallback (D-011)
- [x] Static export builds in CI; `pages.yml` deploys to the user site

The static site uses committed snapshots. The live client and fallback remain
blocked on M2/M3. The [root-site Pages deployment](https://github.com/Archont561/archont561.github.io/actions/runs/42999921253)
was verified after the migration merged. The old `/Archont561/` project-site URL
is a separate deployment, documented in `docs/guides/deployment.mdx`.
