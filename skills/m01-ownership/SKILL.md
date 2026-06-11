---
name: m01-ownership
description: "Use when: ownership, borrowing, or lifetime issues. Triggers: E0382, E0597, E0506, E0507, E0515, E0716, E0106, value moved, borrowed value does not live long enough, cannot move out of, use of moved value, ownership, borrow, lifetime, 'a, 'static, move, clone, Copy, 所有权, 借用, 生命周期"
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

## Design Guidance

- A reference must never outlive the value it points into. When the compiler
  says a value does not live long enough, find the owner whose scope ends too
  early instead of reaching for a lifetime annotation first.
- E0382 in a public API is often a contract issue: did the callee need to
  consume the value, or should it borrow it?
- For read-only helpers, prefer borrowed access (`&T`) so the caller keeps
  ownership for later use.
- For mutation, choose between exclusive borrow (`&mut T`), ownership transfer,
  or a redesigned return value instead of reflexive cloning.
- Clone only when intentional. Avoid clone-everywhere fixes that hide an API
  contract problem.
- E0716 (temporary dropped while borrowed, e.g. `&format!(...)`) usually means
  the data deserves a real owner: bind the temporary to a variable, or store
  it as an owned `String` when formatted data becomes long-lived state.

---

## Error → Design Question

| Error | Cause | Mechanical Fix | Ask Instead |
|-------|-------|----------------|-------------|
| E0382 | Value moved | Clone, borrow | Who should own this data? |
| E0597 | Reference outlives owner | Extend owner scope | Is the scope boundary correct? |
| E0506 | Assign while borrowed | End borrow first | Should mutation happen elsewhere? |
| E0507 | Move out of borrowed | Clone or `mem::take` | Why are we moving from a reference? |
| E0515 | Return local reference | Return owned value | Should caller own the data? |
| E0716 | Temporary dropped | Bind to variable | Why is this temporary? |
| E0106 | Missing lifetime | Add `'a` annotation | What is the actual lifetime relationship? |

## Deep Dives (load on demand)

- Verified error patterns and fix options per code (E0382/E0597/E0499/E0502/E0507/E0515/E0716): see `patterns/common-errors.md`
- Lifetime annotation, elision rules, `'static`, HRTB, outlives bounds, variance: see `patterns/lifetime-patterns.md`
- Ownership-aware API design (borrow vs own, `impl Into<String>`, `AsRef`, `Cow`, builder): see `examples/best-practices.md`

---

## Thinking Prompt

Before fixing an ownership error, ask:

1. **What is this data's domain role?**
   - Entity (unique identity) → owned
   - Value Object (interchangeable) → clone/copy OK
   - Temporary (computation result) → maybe restructure

2. **Is the ownership design intentional?**
   - By design → work within constraints
   - Accidental → consider redesign

3. **Fix symptom or redesign?**
   - If the 3rd fix attempt on the same error still fails, stop patching:
     treat it as a design problem and trace up (m02-resource, m09-domain)

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

## Quick Reference

| Pattern | Ownership | Cost | Use When |
|---------|-----------|------|----------|
| Move | Transfer | Zero | Caller doesn't need data |
| `&T` | Borrow | Zero | Read-only access |
| `&mut T` | Exclusive borrow | Zero | Need to modify |
| `clone()` | Duplicate | Alloc + copy | Actually need a copy |
| `Rc`/`Arc`/`Cow` | Shared / clone-on-write | Ref count / lazy alloc | Sharing needed → see m02-resource |

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
