---
name: rust-code-navigator
description: "Use when: navigating Rust code. Keywords: /navigate, go to definition, find references, where is defined, who uses this, find implementations, call sites, project structure, 跳转定义, 查找引用, 定义在哪, 谁用了这个"
argument-hint: "<symbol> [in file.rs:line]"
allowed-tools: ["Grep", "Read", "Glob", "Bash"]
---

# Rust Code Navigator

Code intelligence for Rust codebases using text search (Grep/Glob/Read) and
cargo. No LSP tool is available in this environment by default — the recipes
below work everywhere. If the user's environment provides a
rust-analyzer-backed MCP tool, prefer it for precise reference lookup;
otherwise do not attempt to call any `LSP(...)` tool — it does not exist.

## Intent to Recipe

| User asks | Recipe |
|-----------|--------|
| "Where is X defined?" | grep keyword + name (see Definitions) |
| "Who uses X?" | `grep -rnw "X" src/ tests/` (whole-word) |
| "What type is X?" | Read the definition and its impl blocks |
| "Who calls X?" | `grep -rn "X(" src/` minus the `fn X(` definition line |
| "What does X call?" | Read the fn body; each `name(...)` / `.method(...)` is a callee |
| "What's in this project?" | symbol inventory + `cargo metadata` (below) |
| "Who implements trait T?" | trait impl greps (below) |

## Definitions

Rust definitions are introduced by a keyword, so search keyword + name:

```bash
grep -rn "fn parse_config" src/
grep -rn "struct Config" src/      # also: enum, trait, type, mod, const, static
grep -rn "macro_rules! my_macro" src/
```

Caveats:
- The hit may be a `pub use` re-export — follow it to the original module.
- Macro-generated items have no source-text definition; find the macro
  invocation instead (`cargo expand` shows generated code if installed).

## References

```bash
grep -rnw "parse_config" src/ tests/ examples/ benches/
```

`-w` avoids substring hits (`parse_config_v2`). Doc comments and strings
also match — review hits before treating them as code references.

## Callers and Callees

| Direction | Recipe |
|-----------|--------|
| Incoming ("who calls X") | `grep -rn "X(" src/` then drop the `fn X(` definition line |
| Outgoing ("what does X call") | Read X's body |

Repeat per discovered caller to build depth. Method calls need
`grep -rn ".method_name(" src/`; the receiver type is not in the call-site
text, so confirm by reading. Trait-object and generic dispatch call the
trait method — find concrete callees via the trait-impl grep below.
See rust-call-graph for deeper tracing guidance.

## Project Structure / Symbol Inventory

```bash
grep -rEn "^ *pub (struct|enum|trait|fn|mod|type|const) " src/   # public API
cargo metadata --format-version=1 --no-deps   # workspace members and targets
```

Add `pub(crate)`/`pub(super)` variants to the pattern if the crate uses
restricted visibility. Module layout: `Glob("**/*.rs")` plus the `mod`
statements in `lib.rs`/`main.rs`. See rust-symbol-analyzer for more
inventory recipes.

## Trait Implementations

```bash
grep -rn "impl.*\bHandler\b.* for " src/   # who implements Handler (incl. impl<T> ... for)
grep -rn "impl.* for User" src/            # what traits does User implement
```

Grep misses `#[derive(...)]` impls (check the type's derive attribute),
blanket impls, and auto traits (Send/Sync are never declared in source).
See rust-trait-explorer for the blanket-impl table and the Send/Sync
compile-time assertion.

## Related Skills

| When | See |
|------|-----|
| Deep call tracing | rust-call-graph |
| Symbol/structure inventory | rust-symbol-analyzer |
| Trait impl details | rust-trait-explorer |
| Rename/extract/move safely | rust-refactor-helper |
