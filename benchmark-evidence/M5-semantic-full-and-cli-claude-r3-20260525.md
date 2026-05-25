# M5 Semantic Full + CLI Claude R3 Evidence

Date: 2026-05-25

## Scope

This evidence reruns the main benchmark families after M5 semantic scoring:

- comprehensive benchmark: 26 cases x 3 profiles x repeat-3 = 234 real Agent samples;
- CLI benchmark: 14 cases x 3 profiles x repeat-3 = 126 real Agent samples;
- engine: real Claude Code CLI;
- profiles: no-skill `baseline`, `rust-main-regenerated`, current
  `rust-skills`;
- benchmark fixtures, prompts, exact hard gates, and verification commands were
  unchanged.

Total: 360 real Agent samples, 0 skipped, 0 timeout.

## Comprehensive R3

Command:

```bash
node tests/aom/run-agent-matrix.mjs \
  --benchmark-mode \
  --allow-real-agents \
  --require-real-agents \
  --cases tests/aom/fixtures/agent-matrix-comprehensive.json \
  --profiles baseline,rust-main-regenerated,rust-skills \
  --profile-root rust-main-regenerated=/private/tmp/rust-skills-regenerated-main-controlled-r3-20260525T141553 \
  --engines claude-code \
  --repeats 3 \
  --concurrency 6 \
  --timeout-ms 600000 \
  --run-id m5-semantic-claude-full-r3-20260525
```

Result: MEASURED, 234 runnable, 0 skipped, 0 timeout.

| Profile | Hard pass | Hard rate | Semantic pass | Semantic rate | Concept coverage | Skill harm |
|---|---:|---:|---:|---:|---:|---|
| baseline | 70/78 | 89.74% | 44/48 | 91.67% | 97.98% | n/a |
| rust-main-regenerated | 64/78 | 82.05% | 39/48 | 81.25% | 95.45% | WARN |
| rust-skills | 72/78 | 92.31% | 46/48 | 95.83% | 98.99% | PASS |

Deltas:

- `rust-skills` vs baseline: hard +2.57 pp, semantic +4.16 pp, concept coverage +1.01 pp.
- `rust-skills` vs `rust-main-regenerated`: hard +10.26 pp, semantic +14.58 pp, concept coverage +3.54 pp.
- `rust-main-regenerated` vs baseline: hard -7.69 pp, semantic -10.42 pp, so the skill-harm detector correctly marks it harmful in this run.

Category notes:

- answer-quality: 77/99 hard PASS, 85/99 semantic PASS.
- artifact-generation: 45/45 PASS.
- code-generation: 45/45 PASS.
- review-debugging: 39/45 hard PASS, 44/45 semantic PASS.

## CLI R3

Command:

```bash
node tests/aom/run-agent-matrix.mjs \
  --benchmark-mode \
  --allow-real-agents \
  --require-real-agents \
  --cases tests/aom/fixtures/agent-matrix-cli.json \
  --profiles baseline,rust-main-regenerated,rust-skills \
  --profile-root rust-main-regenerated=/private/tmp/rust-skills-regenerated-main-controlled-r3-20260525T141553 \
  --engines claude-code \
  --repeats 3 \
  --concurrency 6 \
  --timeout-ms 600000 \
  --run-id m5-semantic-claude-cli-r3-20260525
```

Result: MEASURED, 126 runnable, 0 skipped, 0 timeout.

| Profile | Hard pass | Hard rate | Semantic pass | Semantic rate | Concept coverage | Skill harm |
|---|---:|---:|---:|---:|---:|---|
| baseline | 33/42 | 78.57% | 12/21 | 57.14% | 85.71% | n/a |
| rust-main-regenerated | 36/42 | 85.71% | 15/21 | 71.43% | 92.86% | PASS |
| rust-skills | 37/42 | 88.10% | 16/21 | 76.19% | 91.67% | PASS |

Deltas:

- `rust-skills` vs baseline: hard +9.53 pp, semantic +19.05 pp, concept coverage +5.96 pp.
- `rust-skills` vs `rust-main-regenerated`: hard +2.39 pp, semantic +4.76 pp, concept coverage -1.19 pp.

Category notes:

- answer-quality: 35/36 PASS.
- artifact-generation: 18/18 PASS.
- code-generation: 45/45 PASS.
- review-debugging: 8/27 PASS. This is the weak CLI slice for all profiles.

## Combined Profile View

| Profile | Hard pass | Hard rate | Semantic pass | Semantic rate |
|---|---:|---:|---:|---:|
| baseline | 103/120 | 85.83% | 56/69 | 81.16% |
| rust-main-regenerated | 100/120 | 83.33% | 54/69 | 78.26% |
| rust-skills | 109/120 | 90.83% | 62/69 | 89.86% |

Current `rust-skills` leads both comparison profiles on combined hard quality
and combined semantic quality.

## What M5 Changed In Interpretation

The semantic scorer did not weaken exact gates. It made wording sensitivity
visible:

- comprehensive hard FAIL but semantic PASS: baseline 4 samples, main 5 samples,
  current 4 samples;
- CLI hard FAIL but semantic PASS: 0 samples in this run.

That means the comprehensive benchmark had some exact-phrase false negatives,
but the current branch still leads after semantic scoring.

## Remaining Optimization Targets

Do not modify benchmark prompts or expected assertions for these. If we choose
to optimize, change generation contract, routing, or skill guidance.

High-signal current failures:

- comprehensive `answer-temporary-lifetime-e0716`: one current semantic miss on
  lifetime wording;
- comprehensive `answer-unsafe-ffi-slice-contract`: one current semantic miss
  on alignment wording;
- CLI `cli-review-config-env-secret-leak`: two current misses on explicit
  `error` handling;
- CLI `cli-review-destructive-path-safety`: three current misses on explicit
  `dry run` and `error` handling.

The CLI review-debugging failures are the best next optimization target because
they are real semantic misses rather than exact wording false negatives.

## Source Reports

- `tests/results/agent-matrix/m5-semantic-claude-full-r3-20260525/report.json`
- `tests/results/agent-matrix/m5-semantic-claude-cli-r3-20260525/report.json`
