# @archont561/github-app-client

Typed client for the github-app worker API — **generated, bunup-built, published
to npm with provenance** (D-004). **Scaffold only** — generation lands in M3
(`backlog/milestones/M3-client.md`).

- Generation pipeline and turbo graph: `backlog/docs/DOC-005-client-pipeline.md`.
- `src/version.ts` reads this package's metadata via `@archont561/tools/package-meta`
  (inlined at build via `noExternal`; explicit export annotations for the
  isolated-declarations dts).
- `src/client/` is generated output — never hand-edit (CI diff gate).
- Build: `bun run build` (bunup → `dist/` ESM + `index.d.ts`, `exports()` keeps
  the exports map in sync). Publish: `publish-client.yml` on version tags.
