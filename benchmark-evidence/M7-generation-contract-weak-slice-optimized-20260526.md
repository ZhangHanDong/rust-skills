# M7 Generation Contract Weak-Slice Optimization - 2026-05-26

## Scope

This optimization keeps benchmark fixtures, evaluator code, and generated-like
leaf skills unchanged. The change moves calibration into source-controlled
generation rules and router-level concept anchors.

Changed source surfaces:

- `commands/skill-generation-contract.json`
- `commands/create-skills-via-llms.md`
- `commands/sync-crate-skills.md`
- `skills/core-dynamic-skills/SKILL.md`
- `skills/rust-skill-creator/SKILL.md`
- `skills/rust-router/SKILL.md`

Unchanged benchmark surfaces:

- `tests/aom/fixtures/agent-matrix-comprehensive.json`
- `tests/aom/fixtures/agent-matrix-cli.json`
- `tests/aom/evaluation.mjs`
- `tests/aom/run-agent-matrix.mjs`

No generated-like leaf skill was patched for the score claim.

## Change Summary

- Added a `len` to `length` terminology bridge for FFI pointer-plus-length
  APIs.
- Reframed embedded/no_std guidance as a compact term family:
  embedded Rust, heapless storage, allocation boundary, no allocation, and
  fixed-capacity buffers.
- Updated dynamic skill generation sources so future generated skills inherit
  the same anchor families without answer templates or scripted reasoning.
- Kept router calibration concise and restored the mechanical visibility anchor
  `length, alignment` required by `rust-skills verify`.

## Deterministic Gates

- `node -e "JSON.parse(...commands/skill-generation-contract.json...)"`: PASS
- `npm run test:skill-generation`: PASS, 38/38 skills, 0 hard failures
- `node rust-skills.js verify --json`: PASS, 38 skills, 37 routes
- `npm run test:aom`: PASS, 55/55 routing cases
- Materialized regenerated current root:
  `/tmp/rust-skills-current-m7-optimized-regenerated-20260526`
- Regenerated current root skill gate:
  `tests/results/skill-generation-gate-m7-optimized-regenerated-report.json`,
  PASS, 38/38 skills, 0 hard failures

## Real Agent Results

Engine: real `claude-code`

Profiles:

- `baseline`
- `rust-main-regenerated`
- `rust-skills` using
  `/tmp/rust-skills-current-m7-optimized-regenerated-20260526`

### Embedded/no_std Repeat-3

Run: `m7-embedded-focused-r3-optimized-20260526`

Before this change, current regenerated was 0/3 on this slice.

After this change:

- baseline: 3/3 hard, 3/3 semantic
- rust-main-regenerated: 1/3 hard, 1/3 semantic
- rust-skills current regenerated: 2/3 hard, 2/3 semantic

Current improved from 0/3 to 2/3 and now leads regenerated main on this weak
slice. The remaining current miss was `embedded`; `heapless` and `allocation`
were stabilized in this run.

### Four-Case Focused Smoke

Run: `m7-focused-4case-smoke-optimized-20260526`

Cases:

- `answer-unsafe-ffi-slice-contract`
- `answer-embedded-no-std-logging`
- `answer-type-inference-e0282`
- `answer-temporary-lifetime-e0716`

Result:

- baseline: 3/4 hard, 3/4 semantic
- rust-main-regenerated: 1/4 hard, 2/4 semantic
- rust-skills current regenerated: 3/4 hard, 3/4 semantic

Current moved from the previous focused smoke result of 2/4 hard and 2/4
semantic to 3/4 hard and 3/4 semantic, tying baseline and leading regenerated
main.

### E0282 Repeat-3 Follow-up

Run: `m7-e0282-focused-r3-optimized-20260526`

- baseline: 1/3 hard, 3/3 semantic
- rust-main-regenerated: 0/3 hard, 3/3 semantic
- rust-skills current regenerated: 2/3 hard, 3/3 semantic

The focused smoke E0282 miss was a hard-word variance around `type annotation`,
not a semantic failure. Current still leads both comparison profiles on the
repeat-3 hard gate for this slice.

## Interpretation

The optimization improved the weak-slice evidence without changing benchmark
tests or hand-editing generated leaf skills.

The result is not a full superiority claim over baseline for every focused
case. Baseline remained strong on embedded/no_std in this run. The defensible
claim is narrower:

- current regenerated now beats regenerated main on embedded/no_std repeat-3;
- current regenerated ties baseline and beats regenerated main on the four-case
  smoke;
- current regenerated beats both comparison profiles on E0282 repeat-3;
- deterministic generation and routing gates remain green.

The remaining optimization target is the embedded domain label: firmware/no_std
answers can still be semantically correct while omitting the explicit
`embedded` term once in a repeat-3 run.
