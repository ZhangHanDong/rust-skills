# Agent Benchmark Evidence

This directory stores the compact, PR-ready benchmark summary for this product
repo. The full historical evidence set belongs in the separate bench repository
or in ignored local `tests/results/**` outputs.

Benchmark claims should describe the native Rust CLI runtime. JavaScript files
are compatibility launcher glue for npm and hook integration.

Raw evidence capsules stay under `tests/results/**` and are ignored by Git
because they are large. Commit only a current summary here when a benchmark run
is used as release evidence. Harvest manifests stay in
`tests/results/agent-harvest/**/manifest.json` and can be regenerated or copied
into the current summary when needed.

Generate or refresh the local summary:

```bash
node tests/aom/summarize-agent-report.mjs \
  --report tests/results/agent-matrix/<run-id>/report.json \
  --out benchmark-evidence/current-summary.md
```

Generate a controlled category rollup from real Agent reports:

```bash
npm run test:controlled-rollup -- \
  --category-report answer-quality=tests/results/agent-matrix/<answer-run>/report.json \
  --category-report review-debugging=tests/results/agent-matrix/<review-run>/report.json \
  --category-report artifact-generation=tests/results/agent-matrix/<artifact-run>/report.json \
  --category-report code-generation=tests/results/agent-matrix/<codegen-run>/report.json \
  --out benchmark-evidence/current-summary.md \
  --json-out tests/results/controlled-rollup/<rollup>.json
```

Keep this directory small. If the comparison needs many historical run files,
put them in `rust-skills-bench` and link the summarized result from here.
