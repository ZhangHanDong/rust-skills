---
name: m03-mutability
description: "Use when: mutability issues. Triggers: E0596, E0499, E0502, cannot borrow as mutable, already borrowed as immutable, mut, &mut, interior mutability, Cell, RefCell, Mutex, RwLock, 可变性, 内部可变性, 借用冲突"
user-invocable: false
---

# Mutability

> **Layer 1: Language Mechanics**

## Core Question

**Why does this data need to change, and who can change it?**

Before adding interior mutability, understand:
- Is mutation essential or accidental complexity?
- Who should control mutation?
- Is the mutation pattern safe?

---

## Error → Design Question

| Error | Cause | Mechanical Fix | Ask Instead |
|-------|-------|----------------|-------------|
| E0596 | Borrowing immutable as mutable | Add `mut` | Should this really be mutable? |
| E0499 | Two `&mut` at once | Restructure code flow | Is the data structure right? |
| E0502 | `&mut` while `&` exists | Separate borrow scopes | Why do we need both borrows? |
| RefCell panic | Borrow conflict at runtime | `try_borrow` | Is runtime check appropriate? |

---

## Thinking Prompt

Before adding mutability:

1. **Is mutation necessary?**
   - Maybe transform → return new value
   - Maybe builder → construct immutably

2. **Who controls mutation?**
   - External caller → `&mut T`
   - Internal logic → interior mutability
   - Concurrent access → synchronized mutability

---

## Interior Mutability Decision

| Scenario | Choose | Runtime Cost |
|----------|--------|--------------|
| Exclusive access is available | `&mut T` | Zero |
| `T: Copy`, single-thread | `Cell<T>` | Zero |
| `T: !Copy`, single-thread | `RefCell<T>` | Runtime check; panics on conflict |
| Atomic-width Copy primitive (bool, ints, usize, pointers), multi-thread | `AtomicBool`, `AtomicUsize`, ... | Minimal |
| `T: !Copy`, multi-thread | `Mutex<T>` | Lock contention |
| Read-heavy, multi-thread | `RwLock<T>` | Lock contention |
| Shared mutable handle | Single-thread `Rc<RefCell<T>>`; multi-thread `Arc<Mutex<T>>` | See m02-resource |

Larger `Copy` types (e.g. `[u8; 64]`) have no atomic — use a lock.

---

## Trace Up ↑

| Persistent Error | Trace To | Question |
|-----------------|----------|----------|
| Repeated borrow conflicts | m09-domain | Should data be restructured? |
| RefCell in async | m07-concurrency | Is Send/Sync needed? |
| Mutex deadlocks | m07-concurrency | Is the lock design right? |

---

## Anti-Patterns

| Anti-Pattern | Why Bad | Better |
|--------------|---------|--------|
| RefCell everywhere | Runtime panics | Clear ownership design |
| Mutex for single-thread | Unnecessary overhead | RefCell |
| Ignore RefCell panic | Hard to debug | Handle or restructure |
| Lock inside hot loop | Performance killer | Batch operations |

More anti-pattern review: see m15-anti-pattern.

---

## Related Skills

| When | See |
|------|-----|
| Smart pointer choice | m02-resource |
| Thread safety | m07-concurrency |
| Data structure design | m09-domain |
| Anti-patterns | m15-anti-pattern |
