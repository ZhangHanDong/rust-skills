# Cross-Platform Parity Scenarios

These scenarios validate the intended behavior parity between Claude Code and Codex.

The platforms do not share the same runtime enforcement model. They should still follow the same behavior contract from [`_meta/platform-behavior-contract.md`](../../_meta/platform-behavior-contract.md).

## Scenario 1: Compiler Error Routing

**Prompt:** `E0382 use of moved value`

**Expected Shared Behavior:**
- Route through `rust-router` first
- Identify Layer 1 ownership problem
- Load `m01-ownership`

**Expected Response Elements:**
- problem framing for the moved-value error
- ownership-oriented explanation
- context-aware fix patterns instead of a blind surface answer

## Scenario 2: Domain + Error Dual Loading

**Prompt:** `Web API config sharing error: Rc cannot be sent`

**Expected Shared Behavior:**
- Route through `rust-router` first
- Detect concurrency issue
- Detect web domain context
- Load both `m07-concurrency` and `domain-web`

**Expected Response Elements:**
- reasoning chain or equivalent structure
- explicit domain constraint for web handlers
- design recommendation that reflects the domain

## Scenario 3: Negotiation Query

**Prompt:** `compare tokio vs async-std`

**Expected Shared Behavior:**
- Route through `rust-router` first
- Enable negotiation flow before specialized crate discussion

**Expected Response Elements:**
- comparison framing
- confidence and gaps
- synthesized recommendation instead of isolated facts

## Scenario 4: Live Rust Data Query

**Prompt:** `What's the latest version of tokio?`

**Expected Shared Behavior:**
- Route live-data handling through `rust-learner`
- Prefer `Agent Mode` when supported
- Fall back to `Inline Mode` when agents are unavailable

**Expected Response Elements:**
- clear crate/version answer
- retrieval path or source awareness when available
- no unsupported answer from memory when live retrieval exists

## Review Checklist

- [ ] Claude and Codex reference the same shared contract
- [ ] Codex guidance documents the lack of hooks without changing the workflow
- [ ] Claude guidance focuses on hook-based enforcement, not duplicated core logic
- [ ] The four scenarios remain valid under both platform adapters
