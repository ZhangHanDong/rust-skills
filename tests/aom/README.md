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

## Comprehensive Agent Benchmark

```bash
npm run test:aom:fixtures
npm run test:agents:comprehensive -- \
  --engines codex,claude-code \
  --profiles baseline,rust-skills \
  --repeats 3 \
  --concurrency 2
```

The comprehensive fixture suite is product-neutral by design. Prompts must not
mention rust-skills, baseline profiles, this repository, or any instruction to
favor one profile over another. The fixture audit also enforces breadth across:

- answer quality
- artifact generation
- code generation with `cargo test --quiet`
- review and debugging
- ownership, async, concurrency, unsafe, error handling, performance, CLI, web,
  embedded, and no-std cases
- clean Rust fixture workspaces with `/target/` ignored, so build cache changes
  cannot inflate patch-generation metrics

`test:agents:comprehensive` is a strict gate: expected files, expected text, and
verification commands must pass for every real Agent run.

For comparative data collection without turning model quality failures into a
process failure, use benchmark mode:

```bash
npm run test:agents:comprehensive:benchmark
```

In benchmark mode, model quality failures produce report status `MEASURED`
instead of `PASS`. Infrastructure requirements still fail when real Agent
execution is required but skipped. This keeps the benchmark fair: collection
does not bake in a claim that any profile must already win every hard case.

For a dry evidence-shape run over the same broad fixture set:

```bash
npm run test:agents:comprehensive:skip
```
