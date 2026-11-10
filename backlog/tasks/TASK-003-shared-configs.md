# TASK-003: Shared configs in tools (tsconfig, bunup, unocss, biome)

**Status:** done · **Milestone:** M1 · **Labels:** tools

Per D-001/D-002: configs live in `packages/tools/src/configs/` and are
consumed by every workspace (and reusable by future repos by copy).

## Acceptance criteria

- [x] `configs/typescript/{base,app,package,worker}.json`; workspaces extend them
- [x] Base tsconfig carries the `@/*` → package root alias contract (`@/src/...`,
      `@/tests/...`); tools' variant adds `@root/*` (DOC-002) — per-package
      tsconfigs shrink to extends only
- [x] `configs/bunup/base.ts` factory (used by M3 client build) with the same
      `alias: { "@": "." }` parity
- [x] `configs/unocss/base.ts` preset for the portfolio
- [x] Biome base aligned with root `biome.json`
- [x] All typechecks green after migration; no config duplication left

Bun and TypeScript resolve shared paths through workspace-local `.tsconfig`
symlinks; bunup uses a declaration-specific link and detects unresolved aliases
in emitted declarations. See DOC-002 and DOC-005 for details.
