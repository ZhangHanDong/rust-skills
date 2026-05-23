---
name: unsafe-checker
description: "Use when: reviewing unsafe Rust, FFI, raw pointers, layout-sensitive conversions, or safe wrappers. Keywords: unsafe, raw pointer, pointer, length, alignment, lifetime, aliasing, initialization, FFI, extern, transmute, from_raw_parts, repr(C), MaybeUninit, NonNull, CString, CStr, SAFETY."
globs: ["**/*.rs"]
allowed-tools: ["Read", "Grep", "Glob"]
---

# Unsafe Rust Checker

## When Unsafe is Valid

| Use Case | Example |
|----------|---------|
| FFI | Calling C functions |
| Low-level abstractions | Implementing `Vec`, `Arc` |
| Performance | Measured bottleneck with safe alternative too slow |

**NOT valid:** Escaping borrow checker without understanding why.

## Required Documentation

```rust
// SAFETY: <why this is safe>
unsafe { ... }

/// # Safety
/// <caller requirements>
pub unsafe fn dangerous() { ... }
```

## Calibration Anchors

- For `from_raw_parts` and raw pointer plus length APIs, surface the full
  pointer contract: pointer validity, length bounds, alignment,
  initialization, lifetime, aliasing, allocation bounds, and maximum size.
- Use stable contract terms in the prose summary: `pointer`, `length`,
  `alignment`, and `lifetime`. Code may use `ptr` and `len`, but the review
  should still name the concepts.
- A safe wrapper needs an explicit caller contract before it can be called
  safe. Name what the caller must guarantee and what the wrapper checks.
- Name `alignment` as its own invariant, not only as an adjective on the
  pointer.
- Prefer safe parsing or typed layout helpers when they can preserve behavior
  at acceptable measured cost.

## Quick Reference

| Operation | Safety Requirements |
|-----------|---------------------|
| `*ptr` deref | Valid, aligned, initialized |
| `&*ptr` | + No aliasing violations |
| `transmute` | Same size, valid bit pattern |
| `extern "C"` | Correct signature, ABI |
| `static mut` | Synchronization guaranteed |
| `impl Send/Sync` | Actually thread-safe |

## Common Errors

| Error | Fix |
|-------|-----|
| Null pointer deref | Check for null before deref |
| Use after free | Ensure lifetime validity |
| Data race | Add proper synchronization |
| Alignment violation | Use `#[repr(C)]`, check alignment |
| Invalid bit pattern | Use `MaybeUninit` |
| Missing SAFETY comment | Add `// SAFETY:` |

## Deprecated / Better

| Deprecated | Use Instead |
|------------|-------------|
| `mem::uninitialized()` | `MaybeUninit<T>` |
| `mem::zeroed()` for refs | `MaybeUninit<T>` |
| Raw pointer arithmetic | `NonNull<T>`, `ptr::add` |
| `CString::new().unwrap().as_ptr()` | Store `CString` first |
| `static mut` | `AtomicT` or `Mutex` |
| Manual extern | `bindgen` |

## FFI Crates

| Direction | Crate |
|-----------|-------|
| C → Rust | bindgen |
| Rust → C | cbindgen |
| Python | PyO3 |
| Node.js | napi-rs |

Focus on the soundness contract first, then the smallest unsafe block that can
enforce it.
