---
name: rust-call-graph
description: "Use when: tracing Rust function call relationships. Keywords: /call-graph, call hierarchy, who calls, what calls, callers, callees, 调用图, 调用关系, 谁调用了, 调用了谁"
argument-hint: "<function_name> [--depth N] [--direction in|out|both]"
allowed-tools: ["Grep", "Read", "Glob"]
---

# Rust Call Graph

Trace call relationships with text search. No call-hierarchy tool exists in
this environment — do not attempt to call an `LSP(...)` tool. Grep finds call
sites reliably enough for impact analysis.

## Direction Semantics

| Question | Direction | Recipe |
|----------|-----------|--------|
| "Who calls X?" | incoming | `grep -rn "X(" src/ tests/` then drop the `fn X(` definition line |
| "What does X call?" | outgoing | Read X's body; each `name(...)` / `.method(...)` is a callee |
| "Trace main to X" | outgoing, repeated | start at `fn main`, follow callees toward X |

Build depth by repeating: each discovered caller becomes the next grep target.

## Blind Spots of Text-Based Call Tracing

- Method calls: search `grep -rn ".method_name(" src/` — the receiver type is
  not in the call-site text, so same-named methods on different types collide;
  confirm by reading the receiver.
- Trait-object / generic dispatch: the call site names the trait method, not
  the impl. Find impls with `grep -rn "impl.*\bTraitName\b.* for " src/` and
  treat each as a potential callee.
- Macros: calls inside `macro_rules!` bodies or derive-generated code do not
  match; `cargo expand` shows generated code (needs `cargo install cargo-expand`).
- Functions passed as values (callbacks, iterator adapters): grep the name
  without `(` using `grep -rnw` to find where it is passed.

## Reporting

After tracing, summarize what matters: entry points (`main`, `#[test]`,
`pub` API), high fan-out functions (many callees — refactor candidates), and
functions called from many places (high blast radius for changes). Present as
a short indented list using cargo-tree-style `├──`/`└──` lines; do not
hand-draw box diagrams.

## Related Skills

| When | See |
|------|-----|
| Definitions, references, symbols | rust-code-navigator |
| Pre-refactor impact analysis | rust-refactor-helper |
