# Agent Benchmark Evidence

This directory stores compact, reviewable summaries generated from local
`tests/results/agent-matrix/**/report.json` files. It is the committed evidence
layer for native local and optional SSH remote Agent harvests.

Raw evidence capsules stay under `tests/results/**` and are ignored by Git
because they are large. Commit concise summaries here when a benchmark run is
used as release evidence. Harvest manifests stay in
`tests/results/agent-harvest/**/manifest.json` and can be regenerated or copied
into a report summary when needed.

Generate a summary:

```bash
node tests/aom/summarize-agent-report.mjs \
  --report tests/results/agent-matrix/<run-id>/report.json \
  --out docs/benchmark-evidence/<run-id>.md
```
