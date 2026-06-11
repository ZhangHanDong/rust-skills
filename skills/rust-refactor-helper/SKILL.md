---
name: rust-refactor-helper
description: "Use when: refactoring Rust code safely. Keywords: /refactor, rename symbol, move function, extract function, inline, 重构, 重命名, 提取函数, 安全重构"
argument-hint: "<action> <target> [--dry-run]"
allowed-tools: ["Grep", "Read", "Glob", "Edit", "Bash"]
---

# Rust Refactor Helper

Safe refactoring = find every affected site, edit, then prove it with
`cargo check` and tests. No LSP rename tool exists in this environment — do
not attempt to call an `LSP(...)` tool. Grep finds references; the compiler
is the safety net.

## Safety Checks (before editing)

| Check | How |
|-------|-----|
| Reference completeness | `grep -rnw "old_name" .` — include tests/, benches/, examples/, build.rs |
| Name conflicts | `grep -rnw "new_name" src/` must be empty or clearly unrelated scopes |
| Public API change | is the symbol `pub` or re-exported (`grep -rn "pub use"`)? Renaming it is a semver-major break for downstream crates |
| Macro-generated code | uses inside `macro_rules!` or derive output do not all grep; check macro definitions mentioning the name |
| Doc references | doc comments, README, docs/ mentioning the old name — update or flag |
| String references | `stringify!`, log messages, `#[serde(rename = ...)]` may carry the name without compiler protection |
| Affected tests | note which test files hit; run them after |

## Mandatory Verification Gate (after editing)

```bash
cargo check    # must pass before claiming the refactor done
cargo test     # at least the affected tests
```

Never present a refactor as complete without a passing `cargo check`. A
missed rename is not silent: it fails with E0425 (cannot find value/function)
— the compiler completes your grep.

## Rename Workflow

1. `grep -rnw "old_name" .` — list all hits with file:line.
2. Categorize: definition / call sites / imports and re-exports / tests /
   docs / strings.
3. Show the list (this is the `--dry-run` output), then Edit each code hit;
   flag doc and string hits for human judgment.
4. Run the verification gate.

## Extract Function: Variable Classification

Classify every variable touched by the selected block:

| Class | Definition | Becomes |
|-------|------------|---------|
| Input | used in block, defined before it | parameter (`&T`, `&mut T`, or `T` per how the block uses it) |
| Output | assigned in block, used after it | return value (tuple if several) |
| Local | defined and used only inside block | stays local |

Also check: `?` in the block forces a `Result`/`Option` return type;
`return`/`break`/`continue` crossing the block boundary blocks extraction;
`.await` requires the new fn to be `async`.

Example — extracting a file-read block:

```rust
use std::fs::File;
use std::io::Read;
use std::path::Path;

fn read_config_text(path: &Path) -> std::io::Result<String> {
    let mut file = File::open(path)?; // `mut` required: read_to_string takes &mut self
    let mut contents = String::new();
    file.read_to_string(&mut contents)?;
    Ok(contents)
}
```

Input: `path` (only read, so `&Path`). Output: `contents`, wrapped in the
`Result` forced by `?`. Forgetting `mut` on `file` is E0596 (cannot borrow
as mutable) — `cargo check` catches it.

## Move Symbol to Another Module

1. Grep references as for rename; the imports are the blast radius.
2. Move the item plus its private helpers and constants; declare the module
   in the destination's parent (`pub mod user;`).
3. If downstream churn is large, keep a temporary re-export at the old path
   (`pub use crate::services::user::UserService;`) and remove it later.
4. Run the verification gate.

## Related Skills

| When | See |
|------|-----|
| Find references and definitions | rust-code-navigator |
| Call-site impact tracing | rust-call-graph |
| Anti-pattern review while refactoring | m15-anti-pattern |
