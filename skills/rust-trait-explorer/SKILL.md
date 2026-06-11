---
name: rust-trait-explorer
description: "Use when: exploring Rust trait implementations. Keywords: /trait-impl, find implementations, who implements, trait 实现, 谁实现了, 实现了哪些trait"
argument-hint: "<TraitName|StructName>"
allowed-tools: ["Grep", "Read", "Glob"]
---

# Rust Trait Explorer

Find trait/impl relationships with grep. No `goToImplementation` tool exists
in this environment — do not attempt to call an `LSP(...)` tool. Two grep
patterns answer most questions.

## Two Core Patterns

```bash
# Who implements Handler? (also catches generic impls like impl<T> Handler for Vec<T>)
grep -rn "impl.*\bHandler\b.* for " src/

# What traits does User implement?
grep -rn "impl.* for User" src/

# The trait definition itself
grep -rn "trait Handler" src/
```

Read each hit for the impl details (methods, where-clauses).

## What Grep Misses

| Missed | Where to look instead |
|--------|----------------------|
| `#[derive(Debug, Clone, ...)]` impls | the `#[derive]` attribute on the type definition |
| Blanket impls | table below — they apply automatically |
| Auto traits (Send, Sync, Unpin) | never declared in source; see below |
| Macro-generated impls | the macro invocation; `cargo expand` to inspect output |

## Blanket Impls Always in Effect (std)

| Trait | Blanket impl | Consequence |
|-------|--------------|-------------|
| `From` | `impl<T> From<T> for T` | every type is `From` itself |
| `Into` | `impl<T, U> Into<U> for T where U: From<T>` | implement `From`, get `Into` free |
| `ToString` | `impl<T: Display> ToString for T` | implement `Display`, never `ToString` directly |

## "Is X Send + Sync?"

Auto traits are computed from field types, not declared — grepping finds
nothing. Reason over the fields (`Rc`, `RefCell`, raw pointers break
Send/Sync) or prove it at compile time:

```rust
fn assert_send_sync<T: Send + Sync>() {}
```

Call `assert_send_sync::<X>()` anywhere; if it compiles, X is Send + Sync
(E0277 trait-bound error if not). For fixing the bound error itself, see
m07-concurrency.

## Related Skills

| When | See |
|------|-----|
| Definitions and references | rust-code-navigator |
| Trait design, dyn vs impl Trait | m04-zero-cost |
| Send/Sync bound errors | m07-concurrency |
