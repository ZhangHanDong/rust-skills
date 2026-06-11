---
name: m04-zero-cost
description: "Use when: generics, traits, or zero-cost abstraction. Triggers: E0277, E0282, E0308, E0599, generic, trait, impl, dyn, where, monomorphization, static dispatch, dynamic dispatch, impl Trait, trait bound not satisfied, type inference, 泛型, 特征, 零成本抽象, 单态化"
user-invocable: false
---

# Zero-Cost Abstraction

> **Layer 1: Language Mechanics**

## Core Question

**Do we need compile-time or runtime polymorphism?**

Before choosing between generics and trait objects:
- Is the type known at compile time?
- Is a heterogeneous collection needed?
- What's the performance priority?

---

## Error → Design Question

| Error | Cause | Mechanical Fix | Ask Instead |
|-------|-------|----------------|-------------|
| E0277 | Type doesn't impl trait | Add impl or change bound | Is this abstraction at the right level? |
| E0282 | Inference ran out of constraints | Annotation or turbofish | Where should the type boundary be explicit? |
| E0308 | Type mismatch | Check generic params | Should types be unified or distinct? |
| E0599 | No method found | Import trait with `use` | Is the trait the right abstraction? |
| E0038 | Trait not dyn-compatible | Use generics or redesign | Do we really need dynamic dispatch? |

## Inference Guidance

E0282 means inference ran out of constraints. Add the explicit type at the
boundary that best communicates intent: a binding annotation, turbofish
(`::<...>`) on the call, the channel's item type, or the collection/error
type, rather than wherever the compiler happens to point.

---

## Thinking Prompt

Before adding trait bounds:

1. **What abstraction is needed?**
   - Same behavior, different types → trait
   - Different behavior, same type → enum
   - No abstraction needed → concrete type

2. **When is type known?**
   - Compile time → generics (static dispatch)
   - Runtime → trait objects (dynamic dispatch)

3. **What's the trade-off priority?**
   - Performance → generics
   - Compile time → trait objects
   - Flexibility → depends

---

## Trace Up ↑

When type system fights back:

```
E0277 (trait bound not satisfied)
    ↑ Ask: Is the abstraction level correct?
    ↑ Check: m09-domain (what behavior is being abstracted?)
    ↑ Check: m05-type-driven (should use newtype?)
```

| Persistent Error | Trace To | Question |
|-----------------|----------|----------|
| Complex trait bounds | m09-domain | Is the abstraction right? |
| Dyn compatibility issues | m05-type-driven | Can typestate help? |
| Type explosion | m10-performance | Accept dyn overhead? |

---

## Trace Down ↓

From design to implementation:

```
"Need to abstract over types with same behavior"
    ↓ Types known at compile time → impl Trait or generics
    ↓ Types determined at runtime → dyn Trait

"Need collection of different types"
    ↓ Closed set → enum
    ↓ Open set → Vec<Box<dyn Trait>>

"Need to return different types"
    ↓ Same type → impl Trait
    ↓ Different types → Box<dyn Trait>
```

---

## Quick Reference

| Pattern | Dispatch | Code Size | Runtime Cost |
|---------|----------|-----------|--------------|
| `fn foo<T: Trait>()` | Static | +bloat | Zero |
| `fn foo(x: &dyn Trait)` | Dynamic | Minimal | vtable lookup |
| `impl Trait` return | Static | +bloat | Zero |
| `Box<dyn Trait>` | Dynamic | Minimal | Allocation + vtable |

## Syntax Comparison

```rust
use std::fmt::Display;

// Static dispatch - type known at compile time
fn show(x: impl Display) { println!("{x}"); }            // argument position
fn show_generic<T: Display>(x: T) { println!("{x}"); }   // explicit generic
fn answer() -> impl Display { 42 }                       // return position

// Dynamic dispatch - type determined at runtime
fn show_ref(x: &dyn Display) { println!("{x}"); }        // reference
fn show_boxed(x: Box<dyn Display>) { println!("{x}"); }  // owned
```

---

## Decision Guide

| Scenario | Choose | Why |
|----------|--------|-----|
| Performance critical | Generics | Zero runtime cost |
| Heterogeneous collection | `dyn Trait` | Different types at runtime |
| Plugin architecture | `dyn Trait` | Unknown types at compile |
| Reduce compile time | `dyn Trait` | Less monomorphization |
| Small, known type set | `enum` | No indirection |

---

## Dyn Compatibility (formerly "Object Safety")

A trait is dyn-compatible (usable as `dyn Trait`) when:
- The trait itself doesn't require `Self: Sized`
- No method returns `Self` or takes generic type parameters —
  UNLESS that method is opted out with `where Self: Sized`
  (the escape hatch: such methods just aren't callable on `dyn Trait`)
- `async fn` and `-> impl Trait` methods (RPITIT) are NOT dyn-compatible —
  the most common E0038 trap since their stabilization; for dyn dispatch
  return `Pin<Box<dyn Future<...>>>` or use the `async-trait` crate

---

## Anti-Patterns

| Anti-Pattern | Why Bad | Better |
|--------------|---------|--------|
| Over-generic everything | Compile time, complexity | Concrete types when possible |
| `dyn` for known types | Unnecessary indirection | Generics |
| Complex trait hierarchies | Hard to understand | Simpler design |
| Ignore dyn compatibility | Limits flexibility | Plan for dyn if needed |

---

## Related Skills

| When | See |
|------|-----|
| Type-driven design | m05-type-driven |
| Domain abstraction | m09-domain |
| Performance concerns | m10-performance |
| Send/Sync bounds | m07-concurrency |
