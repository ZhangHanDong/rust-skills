---
name: m02-resource
description: "CRITICAL: Guides smart pointer selection, implements RAII patterns, and debugs ownership issues for Rust resource management. Use when the user asks about choosing between Box, Rc, Arc, Weak, RefCell, or Cell, or needs help with heap allocation, reference counting, or resource cleanup. Triggers: smart pointer, heap allocation, reference counting, RAII, Drop, should I use Box or Rc, when to use Arc vs Rc, 智能指针, 引用计数, 堆分配"
user-invocable: false
---

# Resource Management

> **Layer 1: Language Mechanics**

## Core Question

**What ownership pattern does this resource need?**

Before choosing a smart pointer, understand:
- Is ownership single or shared?
- Is access single-threaded or multi-threaded?
- Are there potential cycles?

---

## Error → Design Question

| Error | Don't Just Say | Ask Instead |
|-------|----------------|-------------|
| "Need heap allocation" | "Use Box" | Why can't this be on stack? |
| Rc memory leak | "Use Weak" | Is the cycle necessary in design? |
| RefCell panic | "Use try_borrow" | Is runtime check the right approach? |
| Arc overhead complaint | "Accept it" | Is multi-thread access actually needed? |

---

## Thinking Prompt

Before choosing a smart pointer:

1. **What's the ownership model?**
   - Single owner → Box or owned value
   - Shared ownership → Rc/Arc
   - Weak reference → Weak

2. **What's the thread context?**
   - Single-thread → Rc, Cell, RefCell
   - Multi-thread → Arc, Mutex, RwLock

3. **Are there cycles?**
   - Yes → One direction must be Weak
   - No → Regular Rc/Arc is fine

---

## Trace Up ↑

When pointer choice is unclear, trace to design:

```
"Should I use Arc or Rc?"
    ↑ Ask: Is this data shared across threads?
    ↑ Check: m07-concurrency (thread model)
    ↑ Check: domain-* (performance constraints)
```

| Situation | Trace To | Question |
|-----------|----------|----------|
| Rc vs Arc confusion | m07-concurrency | What's the concurrency model? |
| RefCell panics | m03-mutability | Is interior mutability right here? |
| Memory leaks | m12-lifecycle | Where should cleanup happen? |

---

## Trace Down ↓

From design to implementation:

```
"Need single-owner heap data"
    ↓ Use: Box<T>

"Need shared immutable data (single-thread)"
    ↓ Use: Rc<T>

"Need shared immutable data (multi-thread)"
    ↓ Use: Arc<T>

"Need to break reference cycle"
    ↓ Use: Weak<T>

"Need shared mutable data"
    ↓ Single-thread: Rc<RefCell<T>>
    ↓ Multi-thread: Arc<Mutex<T>> or Arc<RwLock<T>>
```

---

## Quick Reference

| Type | Ownership | Thread-Safe | Use When |
|------|-----------|-------------|----------|
| `Box<T>` | Single | Yes | Heap allocation, recursive types |
| `Rc<T>` | Shared | No | Single-thread shared ownership |
| `Arc<T>` | Shared | Yes | Multi-thread shared ownership |
| `Weak<T>` | Weak ref | Same as Rc/Arc | Break reference cycles |
| `Cell<T>` | Single | No | Interior mutability (Copy types) |
| `RefCell<T>` | Single | No | Interior mutability (runtime check) |

## Code Examples

### Box: Recursive type

```rust
// Box enables recursive types that would otherwise have unknown size
enum List<T> {
    Cons(T, Box<List<T>>),
    Nil,
}

let list = List::Cons(1, Box::new(List::Cons(2, Box::new(List::Nil))));
```

### Rc + Weak: Breaking cycles in a tree

```rust
use std::cell::RefCell;
use std::rc::{Rc, Weak};

struct Node {
    value: i32,
    parent: RefCell<Weak<Node>>,       // Weak avoids cycle
    children: RefCell<Vec<Rc<Node>>>,   // Strong owns children
}

let parent = Rc::new(Node {
    value: 1,
    parent: RefCell::new(Weak::new()),
    children: RefCell::new(vec![]),
});

let child = Rc::new(Node {
    value: 2,
    parent: RefCell::new(Rc::downgrade(&parent)),
    children: RefCell::new(vec![]),
});
parent.children.borrow_mut().push(Rc::clone(&child));
// When parent is dropped, child.parent.upgrade() returns None
```

### Arc + Mutex: Thread-safe shared state

```rust
use std::sync::{Arc, Mutex};
use std::thread;

let counter = Arc::new(Mutex::new(0));
let mut handles = vec![];

for _ in 0..5 {
    let counter = Arc::clone(&counter);
    handles.push(thread::spawn(move || {
        let mut num = counter.lock().unwrap();
        *num += 1;
    }));
}
for h in handles { h.join().unwrap(); }
assert_eq!(*counter.lock().unwrap(), 5);
```

## Decision Flowchart

```
Need heap allocation?
├─ Yes → Single owner?
│        ├─ Yes → Box<T>
│        └─ No → Multi-thread?
│                ├─ Yes → Arc<T>
│                └─ No → Rc<T>
└─ No → Stack allocation (default)

Have reference cycles?
├─ Yes → Use Weak for one direction
└─ No → Regular Rc/Arc

Need interior mutability?
├─ Yes → Thread-safe needed?
│        ├─ Yes → Mutex<T> or RwLock<T>
│        └─ No → T: Copy? → Cell<T> : RefCell<T>
└─ No → Use &mut T
```

---

## Common Errors and Anti-Patterns

| Problem | Cause | Fix |
|---------|-------|-----|
| Rc cycle leak | Mutual strong refs | Use `Weak` for one direction |
| RefCell panic | Borrow conflict at runtime | Use `try_borrow` or redesign ownership |
| RefCell everywhere | Hiding ownership issues | Design clear ownership boundaries first |
| Arc in single-thread code | Unnecessary atomic overhead | Use `Rc` when `Send`/`Sync` not needed |
| Box for small `Copy` types | Unnecessary heap allocation | Keep on stack |

---

## Related Skills

| When | See |
|------|-----|
| Ownership errors | m01-ownership |
| Interior mutability details | m03-mutability |
| Multi-thread context | m07-concurrency |
| Resource lifecycle | m12-lifecycle |
