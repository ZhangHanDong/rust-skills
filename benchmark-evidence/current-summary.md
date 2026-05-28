# Current Benchmark Summary

This file is the compact product-repo evidence surface. Raw capsules and
historical run markdown stay outside this repo or under ignored
`tests/results/**`.

## Latest Broad Claim

M6 calibrated Rust and CLI weak slices through concise skill-standard anchors.
Benchmark fixtures, prompts, expected assertions, and evaluator code were not
changed.

Real Agent engine: `claude-code`.
Profiles:

- `baseline`: no Rust Skills context.
- `rust-main-regenerated`: regenerated main-branch runtime root.
- `rust-skills`: current branch runtime root.

### CLI Full Repeat-3

Report:
`tests/results/agent-matrix/m6-cli-full-stdpolish-claude-r3-20260525/report.json`

126 runnable capsules, 0 skipped, 0 timeout.

| Profile | Hard | Semantic | Concept Coverage |
|---------|------|----------|------------------|
| baseline | 39/42 | 18/21 | 0.9643 |
| rust-main-regenerated | 37/42 | 16/21 | 0.9286 |
| rust-skills | 40/42 | 19/21 | 0.9762 |

### Comprehensive Answer Repeat-3

Report:
`tests/results/agent-matrix/m6-comprehensive-answer-stdpolish-claude-r3-20260525/report.json`

99 runnable capsules, 0 skipped, 0 timeout.

| Profile | Hard | Semantic | Concept Coverage |
|---------|------|----------|------------------|
| baseline | 28/33 | 30/33 | 0.9778 |
| rust-main-regenerated | 25/33 | 29/33 | 0.9704 |
| rust-skills | 29/33 | 31/33 | 0.9778 |

## Deterministic Gates

Final M6 verification passed:

- `npm run test:skill-generation`: 38/38 skills, 0 hard failures.
- `npm run test:aom`: 55/55 routing cases.
- `npm run test:aom:cli-fixtures`: 14 CLI cases audited.
- `npm test`: PASS.
- `rust-skills verify --json`: PASS for source, Codex install, Claude install,
  and neutral selector runtimes.

## Integrity Boundary

Benchmark fixtures and evaluator code are not an optimization surface. If a
profile underperforms, fix runtime code, routing data, skill guidance, or
generation sources, then rerun the same prompts and gates.
