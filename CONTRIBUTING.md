# Contributing

1. Pick a task from [`backlog/tasks/`](backlog/tasks/) — one task, one PR.
2. Branch from `main`; write [conventional commits](https://www.conventionalcommits.org/)
   (`convco check` runs in the commit-msg hook and CI).
3. Run `pixi run check` (or `bun run check` inside Pixi) before pushing. It includes
   biome, typecheck, tests, maintenance checks, offline Lychee, Vale, and alint.
   Coverage: `bun run coverage` writes lcov for the Codecov upload.
4. Keep PRs focused; update `backlog/` docs when a decision changes.

## Development setup

```bash
pixi install --locked
bun install --frozen-lockfile
pixi run hooks-install   # lefthook git hooks
```

## Repository rules

- `packages/tools` is private to this repository.
- Generated files (`scripts/restore.sh`, sandbox workflows after `pixi-sandbox init`)
  must be regenerated via their tool, never hand-edited.
- New shared behaviour needs an executable `test.scenario` Given/When/Then spec
  in `packages/tools/features/*.test.ts` first.
- Edit `templates/README.md.ejs` or package metadata, then run `pixi run readme`;
  `README.md` is generated. Run `pixi run agents` to refresh marked `AGENTS.md`
  regions, keeping project-specific guidance outside those markers. Pre-commit
  checks report drift without changing or staging either file. Regenerate the
  backlog index with `pixi run tools task docs:index` after editing backlog status.

## Clean code standard

TypeScript Clean Code Guide — machine-enforced limits live in `biome.json`
(linter rules) and every workspace `tsconfig.json` (strict flags). Both run in
`bun run check` (the CI gate), so violations fail the build, not review.

| Metric | Limit | Enforced by |
| --- | --- | --- |
| Function lines | 40 | `complexity/noExcessiveLinesPerFunction` |
| Parameters | 3 | `complexity/useMaxParams` |
| Cognitive complexity | 15 | `complexity/noExcessiveCognitiveComplexity` |
| Callback nesting | 3 | `complexity/noExcessiveNestedCallbacks` |
| Type safety | no `any`, no `!`, no needless assertions | `preset: recommended` + human review |
| Compiler | `strict`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `noUncheckedIndexedAccess`, `noImplicitReturns` | `tsc --noEmit` |

When a function exceeds a limit, refactor (extract cohesive helpers, separate
validation from execution, early returns) — do not suppress. Test suites split
into focused `describe` blocks for the same reason.

Suppressions are last resort: a local `// biome-ignore lint/<rule>: <reason>`
with a concrete justification (e.g. an external protocol signature). Never
disable a rule globally for a handful of cases.

Human-review principles (no lint rule): one responsibility per function,
discriminated unions over boolean flags, explicit side effects, typed errors
with context, small public interfaces, no circular dependencies, names that
explain intent.

### PCC policy (polyglot-clean-code)

Structural, prose, and security rules come from
[`Archont561/polyglot-clean-code`](https://github.com/Archont561/polyglot-clean-code),
vendored flat at `vendor/clean-code-presets` with the pin recorded in
`UPSTREAM.pin` (currently `v0.1.0`). Never edit the vendored tree — update by
re-copying at a new pin.

- Tier **Recommended** runs in `pixi run policy` and in CI (`policy-vale`,
  `policy-ast-grep`, `policy-semgrep` tasks; per-tool overrides are the place
  for our path excludes, not the vendored files).
- **Alint** keeps the hand-authored local `.alint.yml` (adoption guide path 2):
  the upstream Alint presets require the doit harness that D-010 excludes here.
- Suppress a PCC finding only with a local, reasoned ignore comment at the
  site; record legacy exceptions in a baseline file, never by weakening the
  vendored preset.
- Rollout to Strict/Pedantic is tracked in `backlog/tasks/TASK-012`.
