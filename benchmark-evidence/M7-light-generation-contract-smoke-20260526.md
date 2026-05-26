# M7 Light Generation Contract Smoke - 2026-05-26

## Scope

This run keeps benchmark cost low while moving benchmark-oriented calibration
out of generated-like leaf skills and into generation/source constraints.

Changed surfaces:

- `commands/skill-generation-contract.json`
- `commands/create-skills-via-llms.md`
- `commands/sync-crate-skills.md`
- `skills/rust-skill-creator/SKILL.md`
- `skills/core-dynamic-skills/SKILL.md`
- `skills/rust-router/SKILL.md`
- `skills/unsafe-checker/SKILL.md`

Unchanged benchmark surfaces:

- `tests/aom/fixtures/agent-matrix-comprehensive.json`
- `tests/aom/fixtures/agent-matrix-cli.json`
- `tests/aom/evaluation.mjs`
- `tests/aom/run-agent-matrix.mjs`

Generated-like leaf benchmark edits were not kept for `skills/m01-*`,
`skills/m04-*`, `skills/m11-*`, or `skills/domain-*`. Calibration intended for
regenerated roots now lives in the generation contract.

## Deterministic Gates

- `node -e "JSON.parse(require('fs').readFileSync('commands/skill-generation-contract.json','utf8')); console.log('json ok')"`: PASS
- `npm run test:skill-generation`: PASS, 38/38 skills, 0 hard failures
- `node rust-skills.js verify --json`: PASS, 38 skills, 37 routes
- `npm run test:aom`: PASS, 55/55 routing cases
- `npm test`: PASS
- Materialized current regenerated root:
  `/tmp/rust-skills-current-m7-light-regenerated-20260526`
- Current regenerated root skill gate:
  `tests/results/skill-generation-gate-m7-light-regenerated-v4-report.json`,
  PASS, 38/38 skills, 0 hard failures

Main regenerated root note:

- `/tmp/rust-skills-main-m7-light-regenerated-20260526` materialized from
  `main`.
- Main has no `commands/skill-generation-contract.json`, so contract overlays
  were skipped.
- The skill-generation gate on this main root failed on four historical
  `core-*` skills missing frontmatter descriptions. This was recorded but not
  used as an Agent benchmark blocker.

## Real Agent Smoke

Engine: real `claude-code`

Focused cases:

- `answer-unsafe-ffi-slice-contract`
- `answer-type-inference-e0282`
- `answer-temporary-lifetime-e0716`
- `answer-embedded-no-std-logging`

### Current Regenerated Smoke

Run:
`m7-light-smoke-current-regenerated-20260526`

Result:

- rust-skills regenerated current: 4/4 hard, 4/4 semantic
- responseGenerationRate: 1
- skipped: 0
- timeout: 0

### Three-Profile Compare, v1

Run:
`m7-light-compare-regenerated-r1-20260526`

Result:

- baseline: 4/4 hard, 4/4 semantic
- rust-main-regenerated: 4/4 hard, 4/4 semantic
- rust-skills regenerated current: 3/4 hard, 3/4 semantic
- current failure: embedded/no_std logging missed `heapless` and `embedded`

### Embedded Follow-Up

Run:
`m7-light-embedded-current-regenerated-v2-20260526`

Result:

- rust-skills regenerated current embedded case: 1/1 hard, 1/1 semantic

### Three-Profile Compare, v2

Run:
`m7-light-compare-regenerated-v2-r1-20260526`

Result:

- baseline: 3/4 hard, 4/4 semantic
- rust-main-regenerated: 4/4 hard, 4/4 semantic
- rust-skills regenerated current: 3/4 hard, 3/4 semantic
- current failure: embedded/no_std logging missed `heapless`
- baseline failure: E0282 missed exact phrase `type annotation` but passed
  semantic

### Embedded Follow-Ups, v3/v4

Runs:

- `m7-light-embedded-current-regenerated-v3-20260526`
- `m7-light-embedded-current-regenerated-v4-20260526`

Result:

- Both generated strong Rust answers but failed exact vocabulary on
  `allocation`.
- Output used semantically equivalent terms such as allocator, allocate, fixed
  capacity, heapless, and no allocator.

## Interpretation

The source/generation changes are structurally safe: deterministic gates pass,
the regenerated current root materializes correctly, and unsafe ASCII-art output
pollution is removed from the canonical unsafe skill.

The lightweight real-Agent benchmark does not support a superiority claim over
main or baseline. The current regenerated root is correct on most focused
cases, but the embedded/no_std logging case remains sensitive to exact wording
(`heapless`, `embedded`, `allocation`) despite semantically correct answers.

This is not enough evidence to say current is better than main. It is evidence
that:

- moving calibration into the generation contract works mechanically;
- direct generated-like leaf edits should not be used as benchmark proof;
- the embedded vocabulary gate is the remaining weak slice for this small
  sample;
- broad M6 evidence remains the stronger comparison surface than this
  repeat-1 smoke.

## Next Optimization

The next useful change should not add more phrase-forcing to the skill. Better
options:

- add a small generated-skill vocabulary bridge reference for embedded Rust;
- run repeat-3 only on `answer-embedded-no-std-logging` before any wider rerun;
- if exact phrase failures continue while answers are semantically correct,
  review whether semantic aliases should cover `allocator` / `allocate` for the
  `allocation` concept in a future evaluator milestone, without changing
  existing benchmark expectations for this milestone.
