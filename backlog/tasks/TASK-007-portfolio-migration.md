# TASK-007: Portfolio migration into apps/portfolio

**Status:** in progress · **Milestone:** M4 · **Labels:** portfolio

## Acceptance criteria

- [x] Source from `Archont561/Archont561/portfolio` adapted to the monorepo
      (workspace imports, tsconfig/unocss from tools configs)
- [ ] `@archont561/github-app-client` integration with snapshot fallback (D-011)
- [ ] Static export builds in CI; `pages.yml` deploys to the user site

The static site currently uses committed snapshots. The live client and fallback
remain blocked on M2/M3. The root-site Pages workflow is included; final deployment
verification remains outstanding. The old `/Archont561/` project-site URL is a
separate deployment, documented in `docs/guides/deployment.mdx`.
