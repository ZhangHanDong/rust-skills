---
name: coding-guidelines
description: "Use when asking about Rust code style or best practices. Keywords: naming, formatting, comment, clippy, rustfmt, lint, code style, best practice, P.NAM, G.FMT, code review, naming convention, variable naming, function naming, type naming, 命名规范, 代码风格, 格式化, 最佳实践, 代码审查, 怎么命名"
source: https://rust-coding-guidelines.github.io/rust-coding-guidelines-zh/
user-invocable: false
---

# Rust Coding Guidelines (50 Core Rules)

## Naming (Rust-Specific)

| Rule | Guideline |
|------|-----------|
| No `get_` prefix | `fn name()` not `fn get_name()` |
| Iterator convention | `iter()` / `iter_mut()` / `into_iter()` |
| Conversion naming | `as_` (cheap &), `to_` (expensive), `into_` (ownership) |
| Static var prefix | Upstream source uses `G_` prefix for `static`; std and the API guidelines use plain `SCREAMING_SNAKE_CASE` for both `static` and `const` (do not flag the plain form) |

## Data Types

| Rule | Guideline |
|------|-----------|
| Use newtypes | `struct Email(String)` for domain semantics |
| Prefer slice patterns | `if let [first, .., last] = slice` |
| Pre-allocate | `Vec::with_capacity()`, `String::with_capacity()` |
| Avoid Vec abuse | Use arrays for fixed sizes |

## Strings

| Rule | Guideline |
|------|-----------|
| Prefer bytes | `s.bytes()` over `s.chars()` when ASCII |
| Use `Cow<str>` | When might modify borrowed data |
| Use `format!` | Over string concatenation with `+` |
| Many substring searches | `str::contains` is O(n+m) (Two-Way); for many patterns in one pass use `aho-corasick` |

## Error Handling

| Rule | Guideline |
|------|-----------|
| Use `?` propagation | Bubble errors up; `try!()` is a hard error since edition 2018 |
| `expect()` over `unwrap()` | When value guaranteed |
| Assertions for invariants | `assert!` at function entry |

## Memory

| Rule | Guideline |
|------|-----------|
| Meaningful lifetimes | `'src`, `'ctx` not just `'a` |
| `try_borrow()` for RefCell | Avoid panic |
| Shadowing for transformation | `let x = x.parse()?` |

## Concurrency

| Rule | Guideline |
|------|-----------|
| Identify lock ordering | Prevent deadlocks |
| Atomics for primitives | Not Mutex for bool/usize |
| Choose memory order carefully | Relaxed/Acquire/Release/SeqCst |

## Async

| Rule | Guideline |
|------|-----------|
| Sync for CPU-bound | Async is for I/O |
| Don't hold locks across await | Use scoped guards |

## Macros

| Rule | Guideline |
|------|-----------|
| Avoid unless necessary | Prefer functions/generics |
| Follow Rust syntax | Macro input should look like Rust |

## Deprecated → Better

| Deprecated | Better | Since |
|------------|--------|-------|
| `lazy_static!` | `std::sync::OnceLock` | 1.70 |
| `once_cell::Lazy` | `std::sync::LazyLock` | 1.80 |
| `failure`/`error-chain` | `thiserror`/`anyhow` | - |

Do NOT blanket-recommend `crossbeam::channel` over `std::sync::mpsc` (std was
rewritten on crossbeam's algorithm in 1.67; crossbeam is for `select!` or
multi-consumer) or `parking_lot::Mutex` over `std::sync::Mutex` (std is
futex-based and competitive since ~1.62; add parking_lot only under measured
contention).

## Quick Reference

```
Naming: snake_case (fn/var), CamelCase (type), SCREAMING_CASE (const)
Format: rustfmt (just use it)
Docs: /// for public items, //! for module docs
Lint: #![warn(clippy::all)]
```

Claude knows Rust conventions well. These are the non-obvious Rust-specific rules.
