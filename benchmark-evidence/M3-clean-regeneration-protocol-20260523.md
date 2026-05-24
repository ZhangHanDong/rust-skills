# M3 Clean Regeneration Protocol Evidence

- Status: PASS
- Date: 2026-05-23
- Decision: generated or generated-like Rust skills are not the optimization
  surface for benchmark score work.
- Reimplementation: benchmark improvement must update generation contract,
  generation sources, routing, or gates; then both compared roots must be
  cleared, regenerated, quality-gated, and benchmarked.

## Implemented

- Added `tests/aom/run-clean-regeneration-compare.mjs`.
- Added `tests/aom/materialize-regenerated-root.mjs`.
- Added `npm run test:regeneration-compare`.
- Added `npm run materialize:regenerated-root`.
- Added `commands/skill-generation-contract.json` as the machine-readable
  source for generated-root calibration overlays.
- Updated the generation contract with the generated artifact boundary.
- Updated generation sources to require stable failure terms and clean
  regeneration.
- Removed the previous hand-tuned focused benchmark evidence from this branch.
- Restored direct leaf skill edits from the previous implementation.
- Kept benchmark prompts, expected assertions, and scoring unchanged.

## Verification

```bash
node --check tests/aom/materialize-regenerated-root.mjs
node --check tests/aom/run-clean-regeneration-compare.mjs
npm run test:regeneration-compare -- --main-root tests/aom/samples --current-root tests/aom/samples --strict-generated --skip-agent-matrix --run-id clean-regeneration-package-smoke
npm run test:skill-generation
npm run test:aom:fixtures
npm run test:aom
node rust-skills.js verify --json
npm test
```

Results:

- clean regeneration package smoke: PASS
- skill generation gate: PASS, 38 skills, 0 hard failures
- fixture audit: PASS, 26 neutral cases
- routing AOM: PASS, 55/55
- runtime verify: PASS
- full verification: PASS

## Clean Regenerated Root Evidence

Materialized roots:

- main: `/private/tmp/rust-skills-regenerated-main-20260523-v2`, source commit
  `37e050f490a731445eb17d339f7e95878be71d70`, no contract overlay.
- current: `/private/tmp/rust-skills-regenerated-current-20260523-v2`, source
  branch `feature/cli-runtime-routing`, contract overlays applied from
  `commands/skill-generation-contract.json`.

Gate:

```bash
npm run test:regeneration-compare -- --main-root /private/tmp/rust-skills-regenerated-main-20260523-v2 --current-root /private/tmp/rust-skills-regenerated-current-20260523-v2 --skip-agent-matrix --run-id clean-regeneration-materialized-gate-v3-20260523
```

Result:

- status: PASS
- main skill generation gate: PASS, 38 skills, 0 hard failures, 148 warnings
- current skill generation gate: PASS, 38 skills, 0 hard failures, 140 warnings

## Real Agent Evidence

All runs below used real Codex execution with `--allow-real-agents` and
`--require-real-agents`. No benchmark prompt, fixture, expected assertion, or
scoring code was changed.

### Unsafe Focused Sweep

- Run: `clean-regeneration-unsafe-real-v2-20260523`
- Summary: 12 runnable, 0 skipped, 0 timeout, 11/12 quality pass.
- Profiles:
  - baseline: 3/4, qualityGatePassRate 75.0%
  - rust-main-regenerated: 4/4, qualityGatePassRate 100.0%
  - rust-skills: 4/4, qualityGatePassRate 100.0%
- Evidence:
  `benchmark-evidence/clean-regeneration-unsafe-real-v2-20260523-agent-matrix.md`

### Unsafe Slice Repeat 3

- Run: `clean-regeneration-unsafe-slice-v2-r3-20260523`
- Summary: 9 runnable, 0 skipped, 0 timeout, 4/9 quality pass.
- Profiles:
  - baseline: 1/3, qualityGatePassRate 33.3%
  - rust-main-regenerated: 0/3, qualityGatePassRate 0.0%
  - rust-skills: 3/3, qualityGatePassRate 100.0%
- Observed failures: baseline and main missed `alignment`.
- Evidence:
  `benchmark-evidence/clean-regeneration-unsafe-slice-v2-r3-20260523-agent-matrix.md`

### Async Lock-Await Repeat 3

- Run: `clean-regeneration-async-lock-v2-r3-20260523`
- Summary: 9 runnable, 0 skipped, 0 timeout, 6/9 quality pass.
- Profiles:
  - baseline: 1/3, qualityGatePassRate 33.3%
  - rust-main-regenerated: 2/3, qualityGatePassRate 66.7%
  - rust-skills: 3/3, qualityGatePassRate 100.0%
- Observed failures: baseline missed `scope` and `deadlock`; main missed
  `deadlock` once.
- Evidence:
  `benchmark-evidence/clean-regeneration-async-lock-v2-r3-20260523-agent-matrix.md`

## Interpretation

The first unsafe real run without contract overlays tied all profiles at 3/4.
After moving the weak-point guidance into a source-controlled generation
contract overlay and regenerating only the temporary current root, focused
repeat-3 slices show current outperforming both baseline and regenerated main
on the targeted weak cases. This is evidence for the generation-contract
approach, not evidence from hand-patched generated leaf skills.

## Full-Run Follow-Up

On 2026-05-24, the first full clean-regeneration run showed no overall
improvement: current scored 22/26, regenerated main scored 23/26, and baseline
scored 25/26. The weak points were answer-quality terminology anchors.

After extending only `commands/skill-generation-contract.json`, the controlled
category rollup measured:

- baseline: 20/26, 76.92%
- rust-main-regenerated: 22/26, 84.62%
- rust-skills: 24/26, 92.31%

The monolithic full v4 run still had code-generation timeout noise, so the
trusted comparison uses category-controlled slices. See
`benchmark-evidence/clean-regeneration-controlled-rollup-v5-20260524.md`.
