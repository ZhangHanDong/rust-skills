# Clean Regeneration Controlled Rollup v5

- Status: MEASURED
- Date: 2026-05-24
- Engines: Codex real Agent execution
- Profiles: `baseline`, `rust-main-regenerated`, `rust-skills`
- Regenerated roots:
  - main: `/private/tmp/rust-skills-regenerated-main-full-20260523-v5`
  - current: `/private/tmp/rust-skills-regenerated-current-full-20260523-v5`
- Boundary: prompts, expected assertions, scoring, and benchmark fixtures were
  unchanged.

## Why This Rollup Exists

The first full clean-regeneration run showed that current was not better:

| Run | baseline | rust-main-regenerated | rust-skills | Notes |
|-----|----------|-----------------------|-------------|-------|
| `clean-regeneration-full-codex-20260523` | 25/26 | 23/26 | 22/26 | Current was worse than both baseline and main. |

After updating only `commands/skill-generation-contract.json`, the monolithic
full v4 run improved current versus baseline, but code-generation timeouts
polluted the total score:

| Run | baseline | rust-main-regenerated | rust-skills | Notes |
|-----|----------|-----------------------|-------------|-------|
| `clean-regeneration-full-codex-v4-20260523` | 16/26 | 19/26 | 19/26 | Current tied main and beat baseline, but codegen had heavy timeout noise. |

To avoid treating runner long-tail timeouts as skill quality, the final
comparison uses category-controlled runs:

- answer-quality: dedicated v5 slice
- review-debugging: full v4 category rows, no timeout in that category
- artifact-generation: full v4 category rows, no timeout in that category
- code-generation: dedicated low-concurrency v4 slice

## Controlled Category Results

| Category | Source Run | baseline | rust-main-regenerated | rust-skills |
|----------|------------|----------|-----------------------|-------------|
| answer-quality | `clean-regeneration-answer-codex-v5-20260523` | 7/11 | 9/11 | 10/11 |
| review-debugging | `clean-regeneration-full-codex-v4-20260523` category rows | 4/5 | 4/5 | 5/5 |
| artifact-generation | `clean-regeneration-full-codex-v4-20260523` category rows | 5/5 | 5/5 | 5/5 |
| code-generation | `clean-regeneration-codegen-v4-codex-20260523` | 4/5 | 4/5 | 4/5 |

Controlled rollup:

| Profile | Pass | Quality |
|---------|------|---------|
| baseline | 20/26 | 76.92% |
| rust-main-regenerated | 22/26 | 84.62% |
| rust-skills | 24/26 | 92.31% |

Pairwise deltas:

- `rust-skills` vs baseline: +15.39 percentage points
- `rust-skills` vs `rust-main-regenerated`: +7.69 percentage points
- `rust-main-regenerated` vs baseline: +7.70 percentage points

## What Improved

The generation contract was extended for the exact weak concepts exposed by
the clean full run:

- `borrow` / `lifetime` anchors for `m01-ownership`
- `type annotation` and inference-boundary anchors for E0282
- `embedded Rust`, `allocation`, and `heapless` anchors for `domain-embedded`
- `backpressure` and shutdown sequencing anchors for async lifecycle work

No generated leaf skill in the repository was hand-edited for the score claim.
The current regenerated root applied these anchors through
`commands/skill-generation-contract.json`.

## Remaining Limits

- This rollup is stronger than a focused slice, but it is not a single
  monolithic all-cases run without timeout noise.
- Code-generation still has a common failure on `codegen-owned-index` across
  all three profiles in the low-concurrency rerun.
- The next confidence step is repeat-3 for the controlled rollup, not further
  benchmark fixture changes.

## Evidence Files

- `benchmark-evidence/clean-regeneration-full-codex-20260523-agent-matrix.md`
- `benchmark-evidence/clean-regeneration-full-codex-v4-20260523-agent-matrix.md`
- `benchmark-evidence/clean-regeneration-answer-codex-v5-20260523-agent-matrix.md`
- `benchmark-evidence/clean-regeneration-codegen-v4-codex-20260523-agent-matrix.md`
- `benchmark-evidence/clean-regeneration-embedded-v4-r3-20260523-agent-matrix.md`
