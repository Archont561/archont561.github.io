# TASK-003: Shared configs in tools (tsconfig, bunup, unocss, biome)

**Status:** not started · **Milestone:** M1 · **Labels:** tools

Per D-001/D-002: configs live in `packages/tools/src/configs/` and are
consumed by every workspace (and reusable by future repos by copy).

## Acceptance criteria

- [ ] `configs/typescript/{base,app,package,worker}.json`; workspaces extend them
- [ ] Base tsconfig carries the `@/*` → package root alias contract (`@/src/...`,
      `@/tests/...`); tools' variant
      adds `@root/*` (DOC-002) — per-package tsconfigs shrink to extends only
- [ ] `configs/bunup/base.ts` factory (used by M3 client build) with the same
      `alias: { "@": "." }` parity
- [ ] `configs/unocss/base.ts` preset for the portfolio
- [ ] Biome base aligned with root `biome.json`
- [ ] All typechecks green after migration; no config duplication left
