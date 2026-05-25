# M6 Skill-Standard Calibration Evidence - 2026-05-25

## Scope

M6 calibrated Rust and CLI weak slices through concise skill-standard anchors.
Benchmark fixtures, expected assertions, and evaluator code were not changed.

Changed surface:

- `commands/skill-generation-contract.json`
- `skills/domain-cli/SKILL.md`
- `skills/rust-router/SKILL.md`
- `skills/m01-ownership/SKILL.md`
- `skills/m04-zero-cost/SKILL.md`
- `skills/m11-ecosystem/SKILL.md`
- `skills/unsafe-checker/SKILL.md`
- `skills/domain-embedded/SKILL.md`

## Deterministic Gates

All commands passed after the final patch:

- `npm run test:skill-generation`: PASS, 38/38 skills, 0 hard failures.
- `npm run test:aom`: PASS, 55/55 routing cases, precision 1, recall 1.
- `npm run test:aom:cli-fixtures`: PASS, 14 CLI benchmark cases audited.
- `npm test`: PASS, verify-all including routing, fixture, install, and package safety gates.
- `node rust-skills.js verify --json`: PASS, 38 skills, 37 routes.
- Materialized regenerated root gate:
  - Root: `/private/tmp/rust-skills-regenerated-current-m6-stdpolish-frontmatter-final-20260525`
  - Report: `tests/results/m6-stdpolish-frontmatter-final-materialized-skill-generation-gate-20260525.json`
  - Result: PASS, 38/38 skills, 0 hard failures.

Installed runtime verification also passed:

- `~/.codex/bin/rust-skills verify --json`: PASS.
- `~/.claude/bin/rust-skills verify --json`: PASS.
- `~/.local/bin/rust-skills verify --json`: PASS.

Fixture/evaluator integrity check:

- `git diff -- tests/aom/fixtures/agent-matrix-comprehensive.json tests/aom/fixtures/agent-matrix-cli.json tests/aom/evaluation.mjs`: empty.

## Real Agent Rollups

Engine: real `claude-code`.
Profiles:

- `baseline`: no rust-skills injection.
- `rust-main-regenerated`: regenerated main root at `/private/tmp/rust-skills-regenerated-main-controlled-r3-20260525T141553`.
- `rust-skills`: current branch.

### CLI Full Repeat-3

Report:
`tests/results/agent-matrix/m6-cli-full-stdpolish-claude-r3-20260525/report.json`

126 runnable capsules, 0 skipped, 0 timeout.

| Profile | Hard | Semantic | Concept Coverage |
|---------|------|----------|------------------|
| baseline | 39/42 | 18/21 | 0.9643 |
| rust-main-regenerated | 37/42 | 16/21 | 0.9286 |
| rust-skills | 40/42 | 19/21 | 0.9762 |

Result: current rust-skills leads baseline by +1 hard and +1 semantic pass,
and leads regenerated main by +3 hard and +3 semantic passes.

### Comprehensive Answer Repeat-3

Report:
`tests/results/agent-matrix/m6-comprehensive-answer-stdpolish-claude-r3-20260525/report.json`

99 runnable capsules, 0 skipped, 0 timeout.

| Profile | Hard | Semantic | Concept Coverage |
|---------|------|----------|------------------|
| baseline | 28/33 | 30/33 | 0.9778 |
| rust-main-regenerated | 25/33 | 29/33 | 0.9704 |
| rust-skills | 29/33 | 31/33 | 0.9778 |

Result: current rust-skills leads baseline by +1 hard and +1 semantic pass,
and leads regenerated main by +4 hard and +2 semantic passes.

## Focused Weak-Slice Notes

Focused repeat-3 slices were useful for diagnosis but showed high sample noise.
They were not used alone as the final quality claim.

- CLI secret/config review:
  `m6-focused-stdpolish-cli-secret-r3-20260525`
  - rust-skills 3/3, baseline 2/3, regenerated main 1/3.
- CLI destructive path review:
  `m6-focused-stdpolish-cli-path-r3-20260525`
  - rust-skills 2/3, baseline 2/3, regenerated main 0/3.
  - A later exploratory wording variant degraded rust-skills to 0/3 and was reverted.
- E0716 temporary lifetime:
  `m6-focused-stdpolish-e0716-r3-v2-20260525`
  - rust-skills 2/3, baseline 3/3, regenerated main 2/3.
  - Failures were mostly exact vocabulary misses, not obviously wrong Rust reasoning.
- Unsafe FFI slice contract:
  `m6-focused-stdpolish-unsafe-r3-v2-20260525`
  - rust-skills 2/3, baseline 3/3, regenerated main 2/3.
  - The remaining miss used `aligned` without the invariant noun `alignment`.

## Conclusion

The broad real-Agent evidence supports the M6 claim: current rust-skills is a
net improvement over both no-skill baseline and regenerated main on CLI and
Rust answer-quality rollups, without changing tests or scoring.

Residual risk: single-case focused slices remain noisy. Future work should
prefer broader rollups or repeat counts above 3 before making per-slice claims.
