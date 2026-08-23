---
name: rust-symbol-analyzer
description: "Use when: inventorying Rust project structure or symbols. Keywords: /symbols, project structure, list structs, list traits, list functions, 符号分析, 项目结构, 列出所有, 有哪些struct"
argument-hint: "[file.rs] [--type struct|trait|fn|mod]"
allowed-tools: ["Grep", "Read", "Glob", "Bash"]
---

# Rust Symbol Analyzer

Inventory a Rust project's modules and symbols with text search and cargo
metadata. No `documentSymbol`/`workspaceSymbol` tool exists in this
environment — do not attempt to call an `LSP(...)` tool.

## Recipes

```bash
# Public API inventory
grep -rEn "^ *pub (struct|enum|trait|fn|mod|type|const) " src/

# All structs / traits, including private
grep -rEn "^ *(pub )?struct " src/
grep -rEn "^ *(pub )?trait " src/

# Async functions
grep -rn "async fn" src/

# Workspace members and targets (machine-readable)
cargo metadata --format-version=1 --no-deps
```

Module layout: `Glob("**/*.rs")` plus the `mod` statements in
`lib.rs`/`main.rs` (a `mod foo;` maps to `foo.rs` or `foo/mod.rs`).

Notes:
- Items with restricted visibility (`pub(crate)`, `pub(super)`) need the
  pattern extended: `^ *pub(\([a-z]+\))? `.
- Macro- and derive-generated symbols never appear in source grep.
- For per-file detail, just Read the file; most Rust source files are small
  enough to read whole.

## Honest Metrics Only

Do not fabricate "complexity scores". If asked about complexity or hotspots,
report concrete proxies and name them as such: lines per file (`wc -l src/*.rs`),
function count per file (`grep -c "fn " file.rs`), and `cargo clippy` warnings
(`clippy::cognitive_complexity` fires only if configured).

## Related Skills

| When | See |
|------|-----|
| Find a specific definition or its references | rust-code-navigator |
| Trait/impl relationships | rust-trait-explorer |
| Dependency tree | rust-deps-visualizer |
