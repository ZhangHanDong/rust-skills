---
name: m15-anti-pattern
description: "Use when reviewing code for anti-patterns. Keywords: anti-pattern, common mistake, pitfall, code smell, bad practice, code review, is this an anti-pattern, better way to do this, common mistake to avoid, why is this bad, idiomatic way, beginner mistake, fighting borrow checker, clone everywhere, unwrap in production, should I refactor, 反模式, 常见错误, 代码异味, 最佳实践, 地道写法"
user-invocable: false
---

# Anti-Patterns

> **Layer 2: Design Choices**

## Core Question

**Is this pattern hiding a design problem?** Treat the anti-pattern as a symptom: clone-to-escape-borrows means the ownership design is wrong (E0382 root cause), unwrap-"because it can't fail" means an unhandled case, fighting lifetimes means the data structure should change.

## Anti-Pattern -> Fix

| Anti-Pattern | Signal | Fix |
|--------------|--------|-----|
| `.clone()` everywhere | Ownership design unclear | Borrow or restructure ownership (m01) |
| `.unwrap()` in libraries | Panics reach users | `?`, `expect` with context, or handle (m06) |
| `Rc`/`Arc` when single owner | Memory bloat, unclear design | Plain ownership tree |
| Fighting lifetimes | Reference-heavy structs | Restructure to own the data (m14 escape patterns) |
| `unsafe` for convenience | UB risk | Find the safe pattern first (unsafe-checker) |
| OOP inheritance via `Deref` | Misleading API | Composition, traits |
| `String` parameters/fields everywhere | Forced allocations | `&str` params, `Cow<str>` (m10) |
| Index loops over `vec[i]` | Bounds checks, off-by-one | Iterators, `.enumerate()` |
| Lock held across `.await` | Deadlock / not-Send future | Drop the `MutexGuard` before `.await`: scope it in a block, clone out the data (m07) |
| `pub` fields with invariants | Invariants violated externally | Private fields + validated constructor |
| Giant match arms / long functions | Unmaintainable | Extract methods |
| Giant enums doing many jobs | Missing abstraction | Trait + per-case types |
| Ignoring `#[must_use]` | Lost errors | Handle or explicit `let _ =` |
| Boolean parameters | Unreadable call sites | Options struct or enums |

Worked examples (type-system smells, API design, macros): `patterns/common-mistakes.md`.

## Deprecated -> Better

| Deprecated | Better |
|------------|--------|
| Index-based loops | `.iter()`, `.enumerate()` |
| `collect::<Vec<_>>()` then iterate | Chain iterators |
| Manual unsafe cell | `Cell`, `RefCell` |
| `mem::transmute` for casts | `as` or `TryFrom` |
| Custom linked list | `Vec`, `VecDeque` |
| `lazy_static!` | `std::sync::OnceLock` / `LazyLock` (canonical: m12-lifecycle) |

## Quick Review Checklist

- [ ] No `.clone()` without justification
- [ ] No `.unwrap()` in library code
- [ ] No `pub` fields with invariants
- [ ] No index loops when iterator works
- [ ] No `String` where `&str` suffices
- [ ] No `MutexGuard` alive across `.await`
- [ ] No ignored `#[must_use]` warnings
- [ ] No `unsafe` without SAFETY comment
- [ ] No giant functions (>50 lines)

## Related Skills

| When | See |
|------|-----|
| Clone/borrow mechanics, E0382 | m01-ownership |
| unwrap/panic policy | m06-error-handling |
| Lock-across-await, blocking-in-async (correct code) | m07-concurrency |
| Perf-motivated versions (string concat, collect, spawn_blocking) | m10-performance |
| Borrow-checker escape patterns | m14-mental-model |
