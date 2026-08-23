---
name: m02-resource
description: "Use when: smart pointers and resource management. Keywords: Box, Rc, Arc, Weak, RefCell, Cell, smart pointer, heap allocation, reference counting, RAII, Drop, should I use Box or Rc, when to use Arc vs Rc, 智能指针, 引用计数, 堆分配"
user-invocable: false
---

# Resource Management

> **Layer 1: Language Mechanics**

## Core Question

**What ownership pattern does this resource need?**

Three axes decide the pointer: single vs shared ownership,
single-thread vs multi-thread access, and whether cycles are possible.

---

## Decision Table

| Need | Use | Thread-safe? |
|------|-----|--------------|
| Single owner on heap (recursive type, unsized, large move) | `Box<T>` | `Send`/`Sync` only if `T` is |
| Shared ownership, single-thread | `Rc<T>` | No (`!Send`, `!Sync`) |
| Shared ownership, multi-thread | `Arc<T>` | Only if `T: Send + Sync` |
| Reference cycle (parent/child) | `Weak<T>` for one direction | Same as its `Rc`/`Arc` |
| Shared + mutable, single-thread | `Rc<RefCell<T>>` | No |
| Shared + mutable, multi-thread | `Arc<Mutex<T>>` or `Arc<RwLock<T>>` | Yes |

`Arc<T>` does not make `T` thread-safe — it only shares it. Interior
mutation across threads needs `Mutex`/`RwLock`/atomics inside the `Arc`.
Cell vs RefCell vs Mutex selection: see m03-mutability.

---

## Error → Design Question

| Error | Don't Just Say | Ask Instead |
|-------|----------------|-------------|
| "Need heap allocation" | "Use Box" | Why can't this be on stack? |
| Rc memory leak | "Use Weak" | Is the cycle necessary in design? |
| RefCell panic | "Use try_borrow" | Is runtime check the right approach? |
| Arc overhead complaint | "Accept it" | Is multi-thread access actually needed? |

---

## Pitfalls

| Problem | Cause | Fix |
|---------|-------|-----|
| Rc cycle leak | Mutual strong refs | `Weak` for the back-edge |
| RefCell panic ("already borrowed") | Borrow conflict at runtime | `try_borrow` or restructure ownership |
| Arc overhead in hot path | Atomic ref count traffic | `Rc` if single-threaded; pass `&T` instead of cloning the Arc |
| Box for small types | Unnecessary allocation | Plain stack value |

More anti-pattern review: see m15-anti-pattern.

---

## Trace Up ↑

| Situation | Trace To | Question |
|-----------|----------|----------|
| Rc vs Arc confusion | m07-concurrency | What's the concurrency model? |
| RefCell panics | m03-mutability | Is interior mutability right here? |
| Memory leaks | m12-lifecycle | Where should cleanup happen? |

---

## Related Skills

| When | See |
|------|-----|
| Ownership errors | m01-ownership |
| Interior mutability details | m03-mutability |
| Multi-thread context | m07-concurrency |
| Resource lifecycle | m12-lifecycle |
