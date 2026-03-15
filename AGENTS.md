# Rust Skills - Agent Instructions

> Codex and compatible-agent adapter for the shared Rust behavior contract.
> If this repository is available locally, also read [`_meta/platform-behavior-contract.md`](_meta/platform-behavior-contract.md).
> If `AGENTS.md` is copied standalone into another project, the required Codex workflow is summarized here.

## Codex Operating Model

Codex does not use the Claude plugin hook model from this repository.

That means behavior parity with Claude comes from following the same contract explicitly:
- route through `rust-router` first
- enable negotiation when comparison or synthesis is required
- load both mechanics/design skills and `domain-*` skills when domain context matters
- use `rust-learner` for live Rust/crate/docs questions

## Required Codex Workflow

### 1. Start With `rust-router`

For any Rust-related question, invoke `rust-router` before jumping to specialized skills.

This includes:
- compiler errors such as `E0382`, `E0277`, `E0597`
- design and best-practice questions
- crate and ecosystem questions
- code-writing requests in Rust

### 2. Trigger Negotiation Explicitly

When the user asks for:
- comparisons
- trade-offs
- best practices
- domain + error synthesis

Codex should treat the prompt as a negotiation query and follow the shared output contract for confidence, gaps, and recommendation.

### 3. Load Both Domain and Mechanics Skills When Needed

Do not stop at the first technical keyword when domain context changes the correct answer.

Examples:
- `Web API` + `Send` -> `m07-concurrency` + `domain-web`
- `trading` + `E0382` -> `m01-ownership` + `domain-fintech`

### 4. Use `rust-learner` for Live Information

For:
- Rust version features
- crate versions and metadata
- API docs
- Clippy lint lookups

prefer `rust-learner` and its agent or inline workflows over answering from memory.

## Codex Expectations

### Behavior Parity

Codex should aim for the same reasoning behavior as Claude:
- same routing intent
- same negotiation triggers
- same dual-skill loading rules
- same output expectations

### Capability Difference

Codex does not automatically receive the plugin hook injection that Claude gets from `.claude/hooks/`.

So Codex parity is achieved through:
- these instructions
- the shared contract
- the skill files themselves

## Shared Rust Defaults

When creating Rust projects or `Cargo.toml` files, use:

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

## Standalone Quick Reference

This section intentionally duplicates a small amount of guidance so the documented "copy `AGENTS.md` only" install path remains useful.

### Routing Summary

- ownership / borrow / lifetime / `E0382` / `E0597` -> `m01-ownership`
- `Box` / `Rc` / `Arc` / smart pointers -> `m02-resource`
- `Result` / `panic` / error handling -> `m06-error-handling`
- `async` / `await` / `Send` / `Sync` -> `m07-concurrency`
- versions / crate info / docs -> `rust-learner`
- `unsafe` / FFI / raw pointers -> `unsafe-checker`

### Common Error Fixes

| Error | Cause | Fix Direction |
|---|---|---|
| `E0382` | use of moved value | borrow, clone intentionally, or redesign ownership |
| `E0597` | lifetime too short | extend lifetime or restructure borrows |
| `E0502` | borrow conflict | split borrows or change borrowing pattern |
| `E0499` | multiple mutable borrows | restructure to one mutable borrow at a time |
| `E0277` | missing trait bound | add the right bound or use the correct thread-safe type |

### Practical Rust Rules

- Use `?` instead of `unwrap()` in library-style code.
- Every `unsafe` block needs a `// SAFETY:` comment.
- Prefer `Arc<T>` over `Rc<T>` when state may cross threads.
- For read-only functions, prefer `&T` over taking ownership.

## Key Skill Entry Points

If the repository is available locally:

- `skills/rust-router/SKILL.md` - master routing
- `skills/rust-learner/SKILL.md` - live Rust/crate/docs queries
- `skills/coding-guidelines/SKILL.md` - style and conventions
- `skills/unsafe-checker/SKILL.md` - unsafe and FFI guidance

## Practical Rule

If Claude would rely on hooks to force the Rust Skills workflow, Codex should apply that workflow deliberately from these instructions instead.
