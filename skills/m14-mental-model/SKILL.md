---
name: m14-mental-model
description: "Use when learning Rust concepts. Keywords: mental model, how to think about ownership, understanding borrow checker, visualizing memory layout, analogy, misconception, explaining ownership, why does Rust, help me understand, confused about, learning Rust, explain like I'm, ELI5, intuition for, coming from Java, coming from Python, 心智模型, 如何理解所有权, 学习 Rust, Rust 入门, 为什么 Rust"
user-invocable: false
---

# Mental Models

**What's the right way to think about this Rust concept?** Diagnose which wrong model produced the confusion, then give the correct one.

## Common Misconceptions

| Error | Wrong Model | Correct Model |
|-------|-------------|---------------|
| E0382 use after move | GC cleans up | Ownership = unique key transfer |
| E0502 borrow conflict | Multiple writers OK | Only one writer at a time |
| E0499 multiple mut borrows | Aliased mutation | Exclusive access for mutation |
| E0106 missing lifetime | Ignoring scope | References have validity scope |
| E0507 cannot move from `&T` | Implicit clone | References don't own data |

## Deprecated Thinking

| Deprecated | Better |
|------------|--------|
| "Rust is like C++" | Different ownership model |
| "Lifetimes are GC" | Compile-time validity scope |
| "Clone solves everything" | Restructure ownership |
| "Fight the borrow checker" | Work with the compiler |
| "`unsafe` to avoid rules" | Understand safe patterns first |

## Coming From Other Languages

| From | Key Shift |
|------|-----------|
| Java/C# | Values are owned, not references by default |
| C/C++ | Compiler enforces what conventions only suggested |
| Python/Go | No GC; destruction is deterministic at scope end |
| Functional | Mutability is safe via exclusive ownership |
| JavaScript | No null; absence is `Option<T>` |

## Move Visualization

A move transfers ownership of the SAME heap allocation; nothing is copied:

```
Before move:                       After `let s2 = s1;`:
Stack            Heap              Stack            Heap
+-----------+                      +-----------+
| s1 --------+--> "hello"          | s1 (dead) |    "hello"
+-----------+    (one alloc)       | s2 --------+--> (same alloc,
                                   +-----------+     new owner)
```

The heap data never moves or duplicates; only the owner changes. `s1` is
statically invalidated (E0382 if used). One owner means exactly one `drop`.

## Borrow Rules in One Line

At any moment: either any number of `&T` readers, or exactly one `&mut T` writer — never both. Lifetimes are the compiler tracking how long each borrow is valid, not a runtime mechanism.

See `patterns/thinking-in-rust.md` for the three borrow-checker escape patterns (clone-escape, make-it-own, split-the-borrow).

## Related Skills

| When | See |
|------|-----|
| Ownership error mechanics (E0382/E0597/...) | m01-ownership |
| Box/Rc/Arc choice | m02-resource |
| Send/Sync, async mental models | m07-concurrency |
| Newtype, invalid-states-unrepresentable | m05-type-driven |
| Anti-patterns when "fighting" Rust | m15-anti-pattern |
