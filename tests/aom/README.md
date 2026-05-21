# Agent AOM Evaluation

This directory contains quality gates for measuring rust-skills behavior beyond
ordinary pass/fail unit tests.

## Fast Gate

```bash
npm run test:aom
```

The routing AOM gate checks:

- trigger precision and recall
- false positive rate
- required skill recall
- forbidden skill violations
- over-injection rate
- average context cost

## Real Agent Matrix

```bash
npm run test:agents -- \
  --engines codex,claude-code \
  --repeats 3 \
  --concurrency 2
```

The Agent matrix launches real Codex and Claude Code processes across two
profiles by default:

- `baseline`: original prompt only
- `rust-skills`: same prompt plus routed rust-skills context from `lib/routing.js`

The report includes per-profile metrics and `rust-skills_vs_baseline` deltas.
`npm run test:agents` is strict and requires real Agent execution. For a dry
evidence-shape run that records `SKIP` capsules without quality claims, use:

```bash
npm run test:agents:skip
```

Each run writes an evidence capsule under `tests/results/agent-matrix/` with:

- original and effective prompt file evidence
- stdout/stderr file evidence
- final output file evidence
- workspace diff file evidence
- routed skill metadata and skill file hashes
- generated artifact checks
- verification command results
- machine-readable metrics
