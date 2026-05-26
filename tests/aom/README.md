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

## Skill Generation Gate

```bash
npm run test:skill-generation
node tests/aom/run-skill-generation-gate.mjs --skills /tmp/generated-rust-skills --strict-generated --json
```

The skill generation gate enforces the skill generation contract in two layers:

- hard failures for missing frontmatter, missing `name` or `description`, hard
  size limits, and missing referenced local files
- soft warnings for legacy style, verbose descriptions, non-ASCII text,
  prompt-like phrases, and missing early calibration anchors

Use `--strict-generated` for newly generated sample skills; it promotes soft
warnings to hard failures. This lets the repository keep legacy skills visible
while making regenerated skills prove that they follow the new contract. The
regeneration protocol is:

1. freeze benchmark prompts and scoring,
2. update generation sources,
3. delete both compared generated output roots,
4. regenerate main and current roots from their own generation sources,
5. run the strict generation gate on generated-only roots, or the normal gate
   on full runtime roots that also contain legacy/core skills,
6. runtime install,
7. run deterministic gates and real Agent before/after evidence.

Do not hand-edit generated leaf skills to improve metrics. If a regenerated
skill misses a benchmark concept, update the generation contract, generation
source, or routing source and regenerate.

To materialize a clean runtime root for benchmark comparison:

```bash
npm run materialize:regenerated-root -- \
  --source-root /path/to/rust-skills-checkout \
  --out-root /tmp/rust-skills-regenerated \
  --force \
  --label rust-skills-regenerated
```

The materializer clears `--out-root`, copies the runtime/generation surface,
and writes `generation-manifest.json` with source commit, status, copied paths,
file hashes, and any applied generation contract overlays. If the source
checkout contains `commands/skill-generation-contract.json`, overlays are
applied only inside the temporary regenerated root. The repository's generated
leaf skills are not patched by hand.

For a deterministic comparison preflight over regenerated roots:

```bash
npm run test:regeneration-compare -- \
  --main-root /tmp/rust-skills-main-regenerated \
  --current-root /tmp/rust-skills-current-regenerated \
  --skip-agent-matrix
```

Prepare commands are optional. When supplied, the script records them and runs
them before the strict generation gates. `REGENERATION_ROOT` and
`REGENERATION_PROFILE` are available to each prepare command. Add
`--strict-generated` only when each compared root is a generated-only skill
directory or contains no legacy/core warnings.

To run the same regenerated roots through real Agents:

```bash
npm run test:regeneration-compare -- \
  --main-root /tmp/rust-skills-main-regenerated \
  --current-root /tmp/rust-skills-current-regenerated \
  --strict-generated \
  --allow-real-agents \
  --require-real-agents \
  --engines codex,claude-code
```

Use `--category-filter <category>` for category-controlled evidence slices
without changing the fixture file:

```bash
npm run test:regeneration-compare -- \
  --main-root /tmp/rust-skills-main-regenerated \
  --current-root /tmp/rust-skills-current-regenerated \
  --allow-real-agents \
  --require-real-agents \
  --engines codex \
  --category-filter answer-quality
```

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
- `rust-skills`: same prompt plus context routed by the native `rust-skills`
  CLI through the compatibility launcher

The report includes per-profile metrics and pairwise deltas such as
`rust-skills_vs_baseline`, plus injected context bytes and final prompt bytes.
Use these cost fields to catch over-injection even when quality passes.

### Scoring Model

Agent reports keep the original hard gate intact. `hardGate` still evaluates
exact `mustMention` phrases, forbidden phrases, expected files, verification
commands, and Agent process status. M5 adds an additive `semanticGate` for text
quality cases so exact-phrase misses can be separated from real concept misses.

`semanticGate` evaluates the same required concepts plus a compact alias
registry for recurring Rust terms. For example, `typed public errors` can cover
the `typed errors` concept, and `critical section` / `drop the guard` can cover
the `scope` concept. A hard FAIL with semantic PASS is reported as likely
wording sensitivity; a semantic FAIL remains a real quality miss to triage.
Fixtures may add `expected.concepts` for case-specific semantic concepts
without removing hard `mustMention` checks.

When `baseline` is part of a run, the summary also includes `skillHarm`. This
compares each skill profile to the no-skill baseline on hard quality,
semantic quality, artifact generation, patch generation, and timeout rate.
Harm is report-only by default:

```bash
node tests/aom/run-agent-matrix.mjs \
  --benchmark-mode \
  --profiles baseline,rust-skills \
  --skill-harm-threshold 0
```

Add `--enforce-skill-harm` only when a CI or release gate should fail if a
skill profile falls below baseline beyond the configured threshold.

The matrix also supports direct API engines for environments where CLI agents
are unavailable or unstable:

```bash
node tests/aom/run-agent-matrix.mjs \
  --cases tests/aom/fixtures/agent-matrix-comprehensive.json \
  --benchmark-mode \
  --engines openai-api,anthropic-api \
  --openai-model "$AOM_OPENAI_MODEL" \
  --anthropic-model "$AOM_ANTHROPIC_MODEL" \
  --allow-real-agents \
  --require-real-agents
```

`openai-api` requires `OPENAI_API_KEY` and `--openai-model` or
`AOM_OPENAI_MODEL`. `anthropic-api` requires `ANTHROPIC_API_KEY` and
`--anthropic-model` or `AOM_ANTHROPIC_MODEL`. API keys are not written to
reports; missing credentials or models are recorded as skipped runs.

To compare the current branch against another rust-skills checkout, add a
profile root. When the external checkout has `lib/routing.js` and
`index/routes.json`, that profile uses its own runtime and routed skill files.
For roots without a compatibility router, the runner uses the subject router
against that root's skill files and records the routing mode in each capsule:

```bash
node tests/aom/run-agent-matrix.mjs \
  --cases tests/aom/fixtures/agent-matrix-comprehensive.json \
  --benchmark-mode \
  --profiles baseline,rust-main,rust-skills \
  --profile-root rust-main=/path/to/rust-skills-main \
  --allow-real-agents \
  --require-real-agents
```

This makes the comparison three-way:

- `baseline`: no injected skill context
- `rust-main`: routed context from the main checkout passed by `--profile-root`
- `rust-skills`: routed context from the current branch

For benchmark claims about generated skill quality, prefer
`test:regeneration-compare` and pass regenerated roots. Direct profile-root
comparison against hand-edited source trees is diagnostic only.

`npm run test:agents` is strict and requires real Agent execution. For a dry
evidence-shape run that records `SKIP` capsules without quality claims, use:

```bash
npm run test:agents:skip
```

Codex runs default to `--ignore-user-config` and `--ignore-rules` so local
project hooks or user-level instructions cannot contaminate isolated benchmark
workspaces. To intentionally compare against the user's ambient Codex setup,
pass `--codex-use-user-config` or `--codex-use-rules`.

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
  --profiles baseline,rust-main,rust-skills \
  --profile-root rust-main=/path/to/rust-skills-main \
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

## CLI-Focused Benchmark

```bash
npm run test:aom:cli-fixtures
npm run test:agents:cli:benchmark -- \
  --engines codex,claude-code \
  --profiles baseline,rust-skills \
  --repeats 3 \
  --concurrency 2
```

The CLI fixture suite is separate from the broad comprehensive suite so it can
grow aggressively without changing the historical 26-case benchmark shape. It
focuses on Rust command line behavior that tends to decide whether generated
tools are usable in automation:

- exit code and stderr contracts
- stable `--json` output and schema compatibility
- config file, environment, and command line precedence
- destructive filesystem guardrails
- cross-platform path and UTF-8 boundaries
- Cargo-verified code generation for CLI helpers

The deterministic audit profile is stricter for this suite:

```bash
node tests/aom/run-agent-fixture-audit.mjs \
  --cases tests/aom/fixtures/agent-matrix-cli.json \
  --profile cli
```

For local plus optional SSH collection over the CLI suite:

```bash
npm run test:harvest:cli -- \
  --remote-host user@linux-host \
  --remote-root /tmp
```

## Native Validation Harvest

The harvest entrypoint is a script-only wrapper around the same Agent matrix. It
does not invoke Aragorn workflow commands.

```bash
npm run test:harvest -- \
  --run-id M2.3-full-native \
  --engines codex,claude-code \
  --profiles baseline,rust-main,rust-skills \
  --profile-root rust-main=/path/to/rust-skills-main \
  --repeats 3 \
  --concurrency 4 \
  --timeout-ms 600000
```

For a focused local smoke:

```bash
npm run test:harvest:focused -- --run-id M2.3-native-focused
```

Optional remote execution is enabled only when an SSH host is supplied:

```bash
npm run test:harvest -- \
  --run-id M2.3-linux-compare \
  --remote-host user@linux-host \
  --remote-root /tmp
```

Remote readiness checks for `node`, `npm`, `git`, `cargo`, `tmux`, `rsync`, and
the selected Agent binaries. If no host is provided, or the host is not ready,
the remote leg is recorded as `SKIP`; add `--require-remote` to make that a hard
failure. Multiple hosts may be passed as a comma-separated list.
`--remote-root` is treated as a parent directory; the script creates a controlled
`rust-skills-harvest-<run-id>/` child and runs `rsync --delete` only inside that
child.
External `--profile-root` paths are passed through to the remote matrix. Use
remote-absolute paths when running a main-checkout comparison on SSH hosts.

The harvest writes `tests/results/agent-harvest/<run-id>/manifest.json` and
copies remote `report.json` files back under `tests/results/agent-matrix/`.
Raw capsules stay ignored. Commit concise summaries instead:

```bash
npm run test:agents:report -- \
  --report tests/results/agent-matrix/<run-id>/report.json \
  --out benchmark-evidence/<run-id>.md
```
