---
name: meta-cognition-parallel
internal: true
description: "EXPERIMENTAL: launches three parallel analyzers (language mechanics, design choices, domain constraints) and synthesizes a cross-layer answer. Use when explicitly invoked as /meta-cognition-parallel for cross-domain Rust questions. Keywords: meta-cognition, parallel analysis, three-layer analysis, cross-layer synthesis."
argument-hint: "<rust_question>"
---

# Meta-Cognition Parallel Analysis (Experimental)

Runs the three cognitive layers (L1 language mechanics, L2 design choices,
L3 domain constraints) as parallel subagents, then synthesizes the results.

Scope note: this skill is not registered in index/routes.json, so the router
never selects it automatically - invoke it explicitly as
`/meta-cognition-parallel <question>`. Routine cross-domain questions are
already handled by rust-router's layered routing plus the negotiation
protocol; use this only when you deliberately want three independent
parallel analyses of one question.

## Execution Mode Detection

Try to read the layer analyzer files:
`../../agents/layer1-analyzer.md`, `../../agents/layer2-analyzer.md`,
`../../agents/layer3-analyzer.md`.
All three exist -> Agent Mode (parallel). Missing -> Inline Mode (sequential).

## Agent Mode (Plugin Install) - Parallel Execution

Extract from `$ARGUMENTS`: the question, any code snippets, and domain hints
(trading, web, embedded, ...). Then launch all three Tasks in a SINGLE
message so they run in parallel:

```
Task(
  subagent_type: "general-purpose",
  run_in_background: true,
  prompt: <content of ../../agents/layer1-analyzer.md>
          + "\n\n## User Query\n" + $ARGUMENTS
)
Task( ...same shape with ../../agents/layer2-analyzer.md... )
Task( ...same shape with ../../agents/layer3-analyzer.md... )
```

Wait for all three to complete, then synthesize per the template below.

## Inline Mode (Skills-only Install) - Sequential Execution

Produce the three layer analyses yourself, in order, each ending with a
confidence rating (HIGH | MEDIUM | LOW) and the reasoning for it:

- **L1 Language Mechanics**: error code (E0XXX) and pattern identified,
  root cause in terms of ownership/borrowing/lifetimes, language-level
  solutions.
- **L2 Design Choices**: current pattern and why it conflicts with Rust's
  rules; alternatives compared (smart pointers, interior mutability,
  ownership transfer vs sharing, clone vs reference) with trade-offs and a
  recommendation.
- **L3 Domain Constraints**: identified domain; MUST / SHOULD / AVOID
  requirements covering performance, safety, concurrency, auditability;
  domain best practices that constrain the solution.

The full per-layer prompts live in `../../agents/layer1-analyzer.md`,
`layer2-analyzer.md`, and `layer3-analyzer.md` - read them if available
rather than improvising the layer structure.

## Cross-Layer Synthesis (both modes)

```markdown
## Cross-Layer Synthesis

| Layer | Key Finding | Confidence |
|-------|-------------|------------|
| L1 (Mechanics) | [summary] | [level] |
| L2 (Design) | [summary] | [level] |
| L3 (Domain) | [summary] | [level] |

Reasoning chain: L3 domain constraint -> implies L2 design pattern
-> implemented via L1 mechanism.

**Problem:** [restated with full context]
**Solution:** [domain-correct architectural recommendation, with code if useful]
**Don't:** [what to avoid in this domain]
**Overall confidence:** [lowest layer's level] - limiting factor: [which layer and why]
```

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| Agent files not found | Skills-only install | Use inline mode (sequential) |
| Agent timeout / incomplete layer | Complex analysis | Fill in that layer inline |
