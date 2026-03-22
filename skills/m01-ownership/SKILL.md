---
name: m01-ownership
description: "Use when diagnosing or fixing Rust ownership, borrowing, or lifetime errors. Triggers: E0382, E0597, E0506, E0507, E0515, E0716, E0106, value moved, borrowed value does not live long enough, cannot move out of, use of moved value, ownership, borrow, lifetime, 'a, 'static, move, clone, Copy, 所有权, 借用, 生命周期"
user-invocable: false
---

# Ownership & Lifetimes

> **Layer 1: Language Mechanics**

## Core Question

**Who should own this data, and for how long?**

Before fixing ownership errors, understand the data's role:
- Is it shared or exclusive?
- Is it short-lived or long-lived?
- Is it transformed or just read?

---

## Error → Design Question

| Error | Don't Just Say | Ask Instead |
|-------|----------------|-------------|
| E0382 | "Clone it" | Who should own this data? |
| E0597 | "Extend lifetime" | Is the scope boundary correct? |
| E0506 | "End borrow first" | Should mutation happen elsewhere? |
| E0507 | "Clone before move" | Why are we moving from a reference? |
| E0515 | "Return owned" | Should caller own the data? |
| E0716 | "Bind to variable" | Why is this temporary? |
| E0106 | "Add 'a" | What is the actual lifetime relationship? |

---

## Workflow

1. **Identify the error** — Read the compiler error code (E0382, E0597, etc.) and locate the offending line.
2. **Determine data role** — Is the data an entity (unique identity → owned), a value object (interchangeable → clone/copy OK), or a temporary (computation result → restructure)?
3. **Choose a fix strategy** — Consult the Error → Design Question table above. Pick the lowest-cost pattern from the Quick Reference.
4. **Apply and verify** — Make the change, run `cargo check`, confirm the error is resolved and no new errors appear.
5. **Escalate if stuck** — If this is the 3rd attempt, trace up to the design layer (m02-resource, m03-mutability, or m09-domain).

---

## Examples

### E0382: Use of moved value

```rust
// BAD: s is moved into greet(), then used again
fn greet(name: String) { println!("Hello, {name}"); }

let s = String::from("Alice");
greet(s);
println!("{s}"); // ERROR: value used after move
```

```rust
// FIX A: Borrow instead of moving
fn greet(name: &str) { println!("Hello, {name}"); }

let s = String::from("Alice");
greet(&s);
println!("{s}"); // OK
```

### E0597: Borrowed value does not live long enough

```rust
// BAD: reference outlives the data it points to
let r;
{
    let x = 5;
    r = &x; // ERROR: x dropped here while still borrowed
}
println!("{r}");
```

```rust
// FIX: Extend the owner's scope
let x = 5;
let r = &x;
println!("{r}"); // OK — x lives long enough
```

---

## Trace Up ↑

When errors persist, trace to design layer:

```
E0382 (moved value)
    ↑ Ask: What design choice led to this ownership pattern?
    ↑ Check: m09-domain (is this Entity or Value Object?)
    ↑ Check: domain-* (what constraints apply?)
```

| Persistent Error | Trace To | Question |
|-----------------|----------|----------|
| E0382 repeated | m02-resource | Should use Arc/Rc for sharing? |
| E0597 repeated | m09-domain | Is scope boundary at right place? |
| E0506/E0507 | m03-mutability | Should use interior mutability? |

---

## Trace Down ↓

From design decisions to implementation:

```
"Data needs to be shared immutably"
    ↓ Use: Arc<T> (multi-thread) or Rc<T> (single-thread)

"Data needs exclusive ownership"
    ↓ Use: move semantics, take ownership

"Data is read-only view"
    ↓ Use: &T (immutable borrow)
```

---

## Quick Reference

| Pattern | Ownership | Cost | Use When |
|---------|-----------|------|----------|
| Move | Transfer | Zero | Caller doesn't need data |
| `&T` | Borrow | Zero | Read-only access |
| `&mut T` | Exclusive borrow | Zero | Need to modify |
| `clone()` | Duplicate | Alloc + copy | Actually need a copy |
| `Rc<T>` | Shared (single) | Ref count | Single-thread sharing |
| `Arc<T>` | Shared (multi) | Atomic ref count | Multi-thread sharing |
| `Cow<T>` | Clone-on-write | Alloc if mutated | Might modify |

## Error Code Reference

| Error | Cause | Quick Fix |
|-------|-------|-----------|
| E0382 | Value moved | Clone, reference, or redesign ownership |
| E0597 | Reference outlives owner | Extend owner scope or restructure |
| E0506 | Assign while borrowed | End borrow before mutation |
| E0507 | Move out of borrowed | Clone or use reference |
| E0515 | Return local reference | Return owned value |
| E0716 | Temporary dropped | Bind to variable |
| E0106 | Missing lifetime | Add `'a` annotation |

---

## Anti-Patterns

| Anti-Pattern | Why Bad | Better |
|--------------|---------|--------|
| `.clone()` everywhere | Hides design issues | Design ownership properly |
| Fight borrow checker | Increases complexity | Work with the compiler |
| `'static` for everything | Restricts flexibility | Use appropriate lifetimes |
| Leak with `Box::leak` | Memory leak | Proper lifetime design |

---

## Related Skills

| When | See |
|------|-----|
| Need smart pointers | m02-resource |
| Need interior mutability | m03-mutability |
| Data is domain entity | m09-domain |
| Learning ownership concepts | m14-mental-model |
