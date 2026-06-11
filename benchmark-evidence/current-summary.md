# Current Benchmark Summary

This file is the compact product-repo evidence surface. Claims are split into
two tiers: reproducible-from-repo (run the gates yourself) and historical
(raw reports live under gitignored `tests/results/**` and cannot be verified
from this repo).

## Reproducible Claims (run `node tests/verify-all.mjs`, ~12s)

### Routing precision on a held-out corpus

`tests/fixtures/heldout-corpus.json` holds 71 queries authored blind against
the router (it did not co-evolve with `index/routes.json`). The gate
`tests/routing-heldout-test.mjs` enforces floor thresholds, not exact matches.

| Metric | Legacy regex hook (main) | Current CLI router |
|--------|--------------------------|--------------------|
| Accuracy | 0.592 | 0.944 |
| Recall | — | 1.000 |
| Precision | — | 0.900 |
| False-positive rate | 0.80 | 0.114 |

The legacy `UserPromptSubmit` matcher injected Rust context on roughly 89% of
ALL prompts, Rust-related or not. The honest headline of this branch is not
answer quality — it is eliminating that indiscriminate injection while keeping
recall at 1.000 on the held-out set.

### Pinned-corpus A/B (regression gate, not a benchmark)

`tests/routing-ab-test.mjs` scores legacy 0.679 vs current 1.000 on
`tests/routing-corpus.json`. That corpus co-evolved with the router, so 1.000
is a regression pin that must not decay — it is NOT evidence of generalization.
Use the held-out numbers above for any external claim.

### Context cost

Per matched Rust prompt the hook injects a compact auto-route section
(~2.5 skills on average) instead of a static context blob on ~89% of all
prompts. Non-Rust prompts get nothing: the hook spawns the CLI once
(~30-70ms) and exits silently.

### Deterministic gates

`node tests/verify-all.mjs` runs cargo build/test, registry verify (regex
compile checks, duplicate-id and unreachable-skill detection), CLI parity,
routing AOM, evaluator self-test, fixture audits, routing A/B, held-out
routing, hook routing, install e2e, and package safety. It must end
`verify all: PASS`.

## Content Effectiveness A/B (2026-06-11, frontier-model agents)

Blind-judged A/B of skills-injected vs no-skills answers, run after the
calibration-anchor removal. 5 cargo-test-gated codegen tasks + 12 expert QA
prompts, 3 judge lenses each (correctness / constraint coverage / signal
density), arms blinded and order-swapped.

- Codegen: 5/5 pass in BOTH arms (ceiling on correctness), but the
  skills-injected arm produced cleaner code in 4/5 (clippy pedantic clean,
  better error docs, CLI conventions like `--` separators and idempotent
  flags).
- Expert QA, pre-optimization content: baseline won 25 of 36 judge votes
  (avg 8.86 vs 8.47). Skills only won where they carried specific guardrails
  (MutexGuard-across-await, stdout/stderr contracts). Template scaffolding
  measurably anchored answers into shallower coverage.
- After the content optimization (47% line cut, 158 code blocks
  compile-verified, all flagged wrong examples fixed) the 4 worst cases
  improved from 0:12 to 2:9:1 — better, still net-negative for open-ended QA
  against a frontier model's own knowledge.

Honest conclusion: with frontier-model agents, skill injection earns its keep
on codegen polish, guardrail-matching questions, and routing precision — not
on open-ended expert QA depth. The injected routing contract is therefore
advisory ("your own expertise takes precedence"), not mandatory. Effectiveness
for smaller/older models is untested and plausibly higher.

## Historical Agent-Quality Tables (UNVERIFIABLE FROM REPO)

The tables below cite `report.json` paths under `tests/results/**`, which is
gitignored — none of those files exist in this repo. Additional caveats:

- Deltas are within sampling noise: ±1 case out of 33-42, repeat-3, with no
  statistical significance treatment.
- The `rust-main-regenerated` comparator was an uncommitted regenerated
  artifact, not the actual main branch.
- Runs predate removal of the "Calibration Anchors" (see integrity note), so
  rust-skills profile numbers are inflated.

Honest reading: main's always-inject runtime slightly HURT agent quality
versus no skills at all; the current runtime is neutral-to-slightly-positive
on these runs. Do not cite these tables as proof of answer-quality gains.

### CLI Full Repeat-3 (historical, claude-code engine, 126 capsules)

| Profile | Hard | Semantic | Concept Coverage |
|---------|------|----------|------------------|
| baseline (no skills) | 39/42 | 18/21 | 0.9643 |
| rust-main-regenerated | 37/42 | 16/21 | 0.9286 |
| rust-skills (branch) | 40/42 | 19/21 | 0.9762 |

### Comprehensive Answer Repeat-3 (historical, 99 capsules)

| Profile | Hard | Semantic | Concept Coverage |
|---------|------|----------|------------------|
| baseline (no skills) | 28/33 | 30/33 | 0.9778 |
| rust-main-regenerated | 25/33 | 29/33 | 0.9704 |
| rust-skills (branch) | 29/33 | 31/33 | 0.9778 |

## Evidence Integrity Note

The "Calibration Anchors" previously added to `SKILL.md` files were benchmark
answer-key leakage: they encoded evaluator rubric terms into skill content,
inflating past agent-quality numbers. They are being rewritten without rubric
leakage. Benchmark fixtures and evaluator code are not an optimization
surface: if a profile underperforms, fix runtime code, routing data, skill
guidance, or generation sources — never the fixtures, the evaluator, or the
held-out corpus.
