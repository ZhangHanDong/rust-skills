# Agent Execution Modes Follow-Up

- Date: 2026-05-24
- Scope: API-mode support, local Claude Code smoke, and remote Claude Code
  execution on `hongdachen`.
- Boundary: benchmark prompts, fixtures, expected assertions, and scoring were
  unchanged.

## Local Runtime Health

- Codex CLI health check did not complete a trivial prompt within 90 seconds and
  printed reconnect attempts. The failed long clean-regeneration answer run was
  therefore treated as infrastructure noise, not skill quality evidence.
- Claude Code local health check returned `ok`.
- `OPENAI_API_KEY` and `ANTHROPIC_API_KEY` were not present locally, so API
  engines were validated for configuration, skip behavior, and reporting only.

## Implemented Execution Surfaces

- `run-agent-matrix.mjs` supports CLI engines:
  - `codex`
  - `claude-code`
- It now also supports API engines:
  - `openai-api`, requiring `OPENAI_API_KEY` and `--openai-model` or
    `AOM_OPENAI_MODEL`
  - `anthropic-api`, requiring `ANTHROPIC_API_KEY` and `--anthropic-model` or
    `AOM_ANTHROPIC_MODEL`
- API keys are not written to reports.
- `run-validation-harvest.mjs` now bootstraps remote PATH for `$HOME/.local/bin`
  and Homebrew paths before readiness checks and matrix execution.

## Real Agent Evidence

### Local Claude Code Smoke

- Report:
  `tests/results/agent-matrix/clean-regeneration-local-claude-smoke-20260524-agent-matrix/report.json`
- Summary:
  `benchmark-evidence/clean-regeneration-local-claude-smoke-20260524-agent-matrix.md`
- Result: 3 runnable, 0 skipped, 0 timeout, 3/3 PASS across baseline,
  regenerated main, and current.

### Remote Claude Code Smoke

- Remote: `hongdachen`
- Engine: Claude Code 2.1.145
- Report:
  `tests/results/agent-matrix/clean-regeneration-remote-claude-smoke-20260524c-remote-hongdachen/report.json`
- Summary:
  `benchmark-evidence/clean-regeneration-remote-claude-smoke-20260524-agent-matrix.md`
- Result: 3 runnable, 0 skipped, 0 timeout, 3/3 PASS.

### Remote Claude Code Full Matrix

- Remote: `hongdachen`
- Engine: Claude Code 2.1.145
- Report:
  `tests/results/agent-matrix/clean-regeneration-remote-claude-full-20260524-remote-hongdachen/report.json`
- Summary:
  `benchmark-evidence/clean-regeneration-remote-claude-full-20260524-agent-matrix.md`
- Result: 78 runnable, 0 skipped, 0 timeout.

Profile results:

| Profile | Pass | Quality |
|---------|------|---------|
| baseline | 24/26 | 92.31% |
| rust-main-regenerated | 25/26 | 96.15% |
| rust-skills | 26/26 | 100.00% |

Pairwise deltas:

- `rust-skills` vs baseline: +7.69 percentage points.
- `rust-skills` vs `rust-main-regenerated`: +3.85 percentage points.

Failure distribution:

- `rust-main-regenerated`: `answer-msrv-api-evolution` missed `release notes`.
- `baseline`: `answer-msrv-api-evolution` missed `release notes`.
- `baseline`: `review-debug-cli-error-automation` missed `exit status`.

## Interpretation

The remote Claude Code full matrix is the strongest evidence in this batch
because it ran all 26 product-neutral fixtures, all three profiles, and all
categories with no skips or timeouts. It shows the current regenerated
rust-skills profile outperforming both regenerated main and no-skill baseline
without changing the benchmark suite.
