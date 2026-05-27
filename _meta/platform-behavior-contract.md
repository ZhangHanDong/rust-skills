# Cross-Platform Rust Behavior Contract

> Shared behavior contract for Claude Code, Codex, and compatible agents.
> This document defines **what** Rust Skills should do across platforms.
> Platform-specific files define **how** that behavior is enforced.

## Purpose

Use this contract to keep `CLAUDE.md`, `AGENTS.md`, hooks, and skill routing aligned.

The goal is **behavior parity**, not identical runtime capabilities.

## Required Shared Workflow

### 1. Route Through `rust-router` First

For any Rust-related question, start with `rust-router` before loading specialized skills.

This includes:
- compiler errors such as `E0xxx`
- design questions
- crate or ecosystem questions
- code-writing requests in Rust
- any question asked inside a Rust project context

### 2. Enable Negotiation When Scope Is Comparative or Ambiguous

Negotiation is required when the prompt includes:
- comparison language such as `compare`, `vs`, `difference`, `best practice`
- domain keyword + compiler/runtime problem
- two or more technologies that need trade-off analysis
- ambiguous synthesis requests

When negotiation is enabled, the response should surface:
- confidence level
- notable gaps
- synthesized recommendation

### 3. Use Dual-Skill Loading for Domain-Qualified Problems

When a prompt contains both:
- a Layer 1 / Layer 2 problem signal
- and a domain signal

load both:
- the mechanics or design skill
- the relevant `domain-*` skill

Examples:
- `Web API` + `Send` error -> `m07-concurrency` + `domain-web`
- `trading` + `E0382` -> `m01-ownership` + `domain-fintech`

### 4. Route Live Data Requests Through `rust-learner`

Use `rust-learner` for:
- Rust versions and release features
- crate versions and metadata
- API documentation lookups
- Clippy lint lookups

When live information tools are available, do not answer these from memory.

## Execution Modes

### Agent Mode

Use background agents, tasks, or equivalent runtime helpers when the platform supports them and the repository ships the needed agent files.

Typical use cases:
- version lookups
- crate metadata
- docs fetching
- parallel analysis helpers

### Inline Mode

Use the same skill routing and reasoning contract, but execute directly with the tools available on the current platform when agent infrastructure is unavailable.

Inline mode should aim to preserve:
- routing behavior
- negotiation behavior
- domain-aware analysis
- live-data fetching priority where possible

Actual behavior depends on the platform's available tools. If live retrieval is unavailable, the response should disclose that limitation instead of implying full parity.

## Output Contract

### Problem Solving / Troubleshooting

For compiler errors, design issues, and domain-qualified Rust problems, answers should include:
- the entry problem or error
- the relevant domain or design constraint when applicable
- the design decision that follows from that constraint

This can be presented as a short reasoning chain.

### Negotiation Responses

When negotiation is enabled, answers should include:
- query type or comparison framing
- confidence
- gaps or missing data
- final recommendation

Suggested structure:

```markdown
## Negotiation Analysis

**Query Type:** [Comparative | Cross-domain | Synthesis | Ambiguous]
**Negotiation:** Enabled

### Source Assessment
- **Confidence:** HIGH | MEDIUM | LOW | UNCERTAIN
- **Gaps:** [What is still missing]

## Synthesized Answer
[Recommendation]
```

### Live Data Responses

For version, crate, and docs queries:
- identify the source or retrieval path when possible
- avoid unsupported guesses when a live source is available
- make fallback behavior explicit when live tools are missing

## Platform Adapters

### Claude Code

Claude Code may enforce this contract proactively through plugin hooks and runtime injection.

Platform-specific instructions live in:
- [`CLAUDE.md`](../CLAUDE.md)
- hook files under `.claude/`

### Codex and Compatible Agents

Codex does not have the Claude plugin hook model. It should still follow the same contract by making the workflow explicit in:
- [`AGENTS.md`](../AGENTS.md)
- [`.codex/INSTALL.md`](../.codex/INSTALL.md)

## Shared Rust Defaults

When creating Rust projects or `Cargo.toml` files, prefer:

```toml
[package]
edition = "2024"
rust-version = "1.85"

[lints.rust]
unsafe_code = "warn"

[lints.clippy]
all = "warn"
pedantic = "warn"
```

## Non-Goals

This contract does not promise:
- identical tool APIs on every platform
- automatic hook behavior outside Claude Code
- equal levels of runtime enforcement

It does require the same reasoning model and routing intent everywhere.
