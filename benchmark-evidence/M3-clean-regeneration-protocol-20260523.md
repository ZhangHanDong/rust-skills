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
- Added `npm run test:regeneration-compare`.
- Updated the generation contract with the generated artifact boundary.
- Updated generation sources to require stable failure terms and clean
  regeneration.
- Removed the previous hand-tuned focused benchmark evidence from this branch.
- Restored direct leaf skill edits from the previous implementation.

## Verification

```bash
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

## Remaining Evidence Gap

This commit proves the clean-regeneration protocol and gates. A real Agent
comparison still requires actual regenerated main/current roots produced by
their generation sources, then running `test:regeneration-compare` without
`--skip-agent-matrix`.
