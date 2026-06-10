# Rust Skills Tests

## Entry Point

```bash
node tests/verify-all.mjs   # or: npm test
```

Runs every deterministic gate against the release binary in about 12 seconds
(it builds `target/release/rust-skills` first, then `cargo test`). It must end
with `verify all: PASS`.

## Current Suites (all run by verify-all)

| Suite | File | What it checks |
|-------|------|----------------|
| registry verify | `rust-skills verify --json` | Compile-checks every registry regex, reports duplicate skill ids and unreachable skills |
| rust-cli-parity | `tests/rust-cli-parity-test.mjs` | Native CLI and JS wrapper agree on detect/route output |
| routing-ab | `tests/routing-ab-test.mjs` | Legacy regex hook baseline vs CLI router on the pinned corpus `tests/routing-corpus.json` (regression pin — this corpus co-evolved with the router, so its score is not a benchmark) |
| routing-heldout | `tests/routing-heldout-test.mjs` | Generalization floors (accuracy/recall/precision/FP-rate) on `tests/fixtures/heldout-corpus.json`, authored blind against the router. Do NOT edit this corpus to make the router pass — if the gate fails, the router lost generalization; fix the router |
| hook-routing | `tests/hook-routing-test.mjs` | Hook scripts inject on Rust prompts and stay silent otherwise |
| install-e2e | `tests/install-e2e.mjs` | `install.js` end-to-end into temp Codex/Claude homes |
| package-safety | `tests/package-safety-test.mjs` | npm tarball contains required files, no tests/internal state, no internal terms |

## tests/aom/ Runners

Also wired into verify-all:

- `tests/aom/run-routing-aom.mjs` — routing AOM gate (expected skill ids per prompt).
- `tests/aom/run-evaluator-self-test.mjs` — evaluator self-test.
- `tests/aom/run-agent-fixture-audit.mjs` — fixture audits (default set plus the
  CLI set `tests/aom/fixtures/agent-matrix-cli.json` with `--profile cli`).

Not run by verify-all:

- `tests/aom/run-agent-matrix.mjs` — real-agent benchmark matrix. Spawns live
  agents only with `--allow-real-agents`; reports land under gitignored
  `tests/results/**` and are therefore not reproducible evidence from the repo
  alone (see `benchmark-evidence/README.md`).

## Removed Suites

- `tests/hook-matcher-test.mjs` — deleted; the `hooks.json` matcher it tested
  was removed (gating now happens inside the hook script itself).
- `tests/routing-eval-test.mjs` — deleted; subsumed by routing-ab.
- `tests/hook-matcher-test.py` — deleted orphan.

## Legacy Manual Material (not run by any gate)

`tests/scenarios/`, `tests/pressure-scenarios/`, and `tests/validation/` are
legacy manual prompt collections and a shell script from the pre-runtime era.
They are kept for reference; no automated gate executes them.

## Adding New Tests

1. Prefer extending an existing suite or `tests/aom/fixtures/`.
2. For routing behavior, add cases to `tests/routing-corpus.json` (pinned
   regression set) — never to `tests/fixtures/heldout-corpus.json`.
3. Wire new suites into `tests/verify-all.mjs` so `npm test` covers them.
