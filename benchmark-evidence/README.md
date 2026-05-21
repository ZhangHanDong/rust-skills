# Agent Benchmark Evidence

This directory stores compact, reviewable summaries generated from local
`tests/results/agent-matrix/**/report.json` files. It is intentionally outside
`docs/` so local run identifiers and workflow evidence do not ship in the npm
package.

Raw evidence capsules stay under `tests/results/**` and are ignored by Git
because they are large. Commit concise summaries here when a benchmark run is
used as release evidence. Harvest manifests stay in
`tests/results/agent-harvest/**/manifest.json` and can be regenerated or copied
into a report summary when needed.

Generate a summary:

```bash
node tests/aom/summarize-agent-report.mjs \
  --report tests/results/agent-matrix/<run-id>/report.json \
  --out benchmark-evidence/<run-id>.md
```
