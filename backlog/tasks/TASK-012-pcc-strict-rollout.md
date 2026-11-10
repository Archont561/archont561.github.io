# TASK-012 — PCC strict rollout (polyglot-clean-code)

Status: todo · Depends on: — · Blocks: — · Reference: [Archont561/polyglot-clean-code](https://github.com/Archont561/polyglot-clean-code) `docs/guides/adopting-presets.md`

Recommended tier adopted 2026-11-10 (vendored `vendor/clean-code-presets`,
pin `v0.1.0`; `pixi run policy` gated in CI). This task tracks the staged
rollout beyond Recommended.

## Acceptance criteria

- [ ] Measure false positives on Strict per tool; move **one tool at a time**
      from `recommended` to `strict` in the `policy-*` pixi tasks (Vale first —
      smallest surface, then ast-grep, then Semgrep).
- [ ] Vale actually covers `.mdx` (the preset ini globs `*.md` only — our
      `docs/` is `.mdx`): local wrapper config mapping `mdx → md`, outside the
      vendored tree.
- [ ] Decide the Alint PCC path for real: fold applicable `PCC-R0*` shape
      checks into the local `.alint.yml` (guide path 2), or adopt the upstream
      harness files where they don't conflict with D-010 (no doit).
- [ ] Pedantic only after FP counts are recorded; heuristics become warnings
      there.
- [ ] Legacy findings (if any accumulate) go in a `clean_code_budget.json`-style
      baseline with reasons — never a lowered severity in the vendored preset.

## Notes

- Semgrep pin lives below latest (`==1.120.*` in pixi.toml): the 1.18x sdist
  builds a `manylinux_2_34` wheel that uv rejects against conda-forge Python's
  manylinux baseline. Re-attempt newer pins on dependency sweeps.
- Semgrep rule IDs are prefixed with the config path — capture with
  `semgrep --json` before writing baseline entries.
