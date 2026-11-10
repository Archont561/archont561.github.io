# M3: github-app-client — generation & publish

**Status:** not started · **Depends on:** M2 · **Decisions:** D-004

## Scope

- `openapi.json` committed; `openapi-ts.config.ts` generating `src/client/`
  (hey-api, post-0.73 bundled runtime).
- Hand-written `src/index.ts` (`createClient` + package-meta version export).
- Turbo graph verified live: a contract change flows into
  `src/client/*.gen.ts` before `dev`/`test` without manual runs (DOC-005).
- CI regenerate + diff gate (generated code committed, reviewable).
- Consumed in-repo via `dist/` (turbo `^build`), published to npm with
  provenance (bunup build + `publish-client.yml`) — D-004. The portfolio
  installs the published artifact.

## Exit criteria

- [ ] `bunx openapi-ts` output is deterministic and CI-checked
- [ ] `bun run test` / `bun run dev` regenerate the client first (turbo graph
      proven with a contract edit)
- [ ] Portfolio (M4) imports the package and builds with the generated SDK
- [ ] Version export reports the package version via package-meta
