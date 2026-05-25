# M5 Evaluation Reliability Evidence

Date: 2026-05-25

## Scope

M5 adds deterministic evaluator reliability gates for the Agent matrix:

- exact hard gates remain unchanged;
- semantic concept scoring is additive report evidence;
- skill-harm detection compares skill profiles against the no-skill baseline;
- benchmark mode keeps comparative failures as `MEASURED` unless
  `--enforce-skill-harm` is explicitly supplied.

## Deterministic Verification

| Command | Result |
|---|---|
| `node --check tests/aom/evaluation.mjs` | PASS |
| `node --check tests/aom/run-evaluator-self-test.mjs` | PASS |
| `node --check tests/aom/run-agent-matrix.mjs` | PASS |
| `node --check tests/aom/run-agent-fixture-audit.mjs` | PASS |
| `npm run test:aom:evaluator` | PASS |
| `npm run test:aom:fixtures` | PASS, 26 cases |
| `npm run test:aom:cli-fixtures` | PASS, 14 cases |
| `npm test` | PASS |
| `node rust-skills.js verify --json` | PASS, 38 skills, 37 routes |
| `~/.codex/bin/rust-skills verify --json` | PASS, 38 skills, 37 routes |
| `~/.claude/bin/rust-skills verify --json` | PASS, 38 skills, 37 routes |
| `cargo test --workspace` | PASS, 2 tests |

## Evidence Shape

Command:

```bash
node tests/aom/run-agent-matrix.mjs \
  --benchmark-mode \
  --cases tests/aom/fixtures/agent-matrix-smoke.json \
  --profiles baseline,rust-skills \
  --engines codex \
  --run-id m5-skip-smoke
```

Result: PASS. The dry run wrote skipped capsules and the report summary
included `semanticGatePassRate`, `conceptCoverageRate`, and `skillHarm`.

## Real Agent Smoke

Command:

```bash
node tests/aom/run-agent-matrix.mjs \
  --benchmark-mode \
  --allow-real-agents \
  --require-real-agents \
  --cases tests/aom/fixtures/agent-matrix-comprehensive.json \
  --case-filter answer-library-error-boundary \
  --profiles baseline,rust-skills \
  --engines claude-code \
  --repeats 1 \
  --concurrency 1 \
  --timeout-ms 300000 \
  --run-id m5-real-claude-semantic-smoke
```

Result: MEASURED.

| Profile | Hard pass rate | Semantic pass rate | Concept coverage | Skill harm |
|---|---:|---:|---:|---|
| baseline | 0/1 | 0/1 | 0.0 | n/a |
| rust-skills | 1/1 | 1/1 | 1.0 | PASS |

The real-Agent smoke is evidence that the new report fields work under actual
Claude Code execution. It is not a full statistical superiority claim.

## Local Aragorn QA

Local Aragorn evidence was written under ignored `doc/**` paths:

- `doc/test-reports/gate-decision.json`
- `doc/qa/test-history.json`
- `doc/checkpoint/m5/`

`aragorn checkpoint verify-report --task M5 --json` returned PASS. `aragorn qa
run --target M5 --profile qa-mvp --allow-binding-drift --write --json` reached
ready evidence and PASS checkpoint validation, then the gateway blocked only on
`missing_commit_lineage` because Aragorn local evidence is intentionally not
committed in this repository.
