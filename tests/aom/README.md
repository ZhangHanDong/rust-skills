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
5. run the strict generation gate on both regenerated roots,
6. runtime install,
7. run deterministic gates and real Agent before/after evidence.

Do not hand-edit generated leaf skills to improve metrics. If a regenerated
skill misses a benchmark concept, update the generation contract, generation
source, or routing source and regenerate.

For a deterministic comparison preflight over regenerated roots:

```bash
npm run test:regeneration-compare -- \
  --main-root /tmp/rust-skills-main-regenerated \
  --current-root /tmp/rust-skills-current-regenerated \
  --main-prepare-command 'rm -rf "$REGENERATION_ROOT" && <main generation command>' \
  --current-prepare-command 'rm -rf "$REGENERATION_ROOT" && <current generation command>' \
  --strict-generated \
  --skip-agent-matrix
```

Prepare commands are optional. When supplied, the script records them and runs
them before the strict generation gates. `REGENERATION_ROOT` and
`REGENERATION_PROFILE` are available to each prepare command.

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

The report includes per-profile metrics and pairwise deltas such as
`rust-skills_vs_baseline`.

To compare the current branch against another rust-skills checkout, add a
profile root. When the external checkout has `lib/routing.js` and
`index/routes.json`, that profile uses its own runtime and routed skill files.
For legacy main checkouts without the new runtime, the runner uses the current
router selector over that checkout's skill files and records
`routingMode=current-router-profile-skills` in each capsule:

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
