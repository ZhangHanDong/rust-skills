---
name: m14-mental-model
description: "Use when learning Rust concepts. Keywords: mental model, how to think about ownership, understanding borrow checker, visualizing memory layout, analogy, misconception, explaining ownership, why does Rust, help me understand, confused about, learning Rust, explain like I'm, ELI5, intuition for, coming from Java, coming from Python, 心智模型, 如何理解所有权, 学习 Rust, Rust 入门, 为什么 Rust"
user-invocable: false
---

# Mental Models

> **Layer 2: Design Choices**

## Core Question

**What's the right way to think about this Rust concept?**

When learning or explaining Rust:
- What's the correct mental model?
- What misconceptions should be avoided?
- What analogies help understanding?

---

## Key Mental Models

| Concept | Mental Model | Analogy |
|---------|--------------|---------|
| Ownership | Unique key | Only one person has the house key |
| Move | Key handover | Giving away your key |
| `&T` | Lending for reading | Lending a book |
| `&mut T` | Exclusive editing | Only you can edit the doc |
| Lifetime `'a` | Valid scope | "Ticket valid until..." |
| `Box<T>` | Heap pointer | Remote control to TV |
| `Rc<T>` | Shared ownership | Multiple remotes, last turns off |
| `Arc<T>` | Thread-safe Rc | Remotes from any room |

---

## Coming From Other Languages

| From | Key Shift |
|------|-----------|
| Java/C# | Values are owned, not references by default |
| C/C++ | Compiler enforces safety rules |
| Python/Go | No GC, deterministic destruction |
| Functional | Mutability is safe via ownership |
| JavaScript | No null, use Option instead |

---

## Diagnostic Workflow

When a user is confused about a Rust concept:

1. **Identify ownership** — Who owns this data? How long does it live?
   - Checkpoint: Can you name the owning variable and its scope?
2. **Identify the safety rule** — Which guarantee is the compiler enforcing?
   - No data races, no dangling pointers, no use-after-free
   - Checkpoint: Can you match the error code (E0382, E0502, etc.) to a rule?
3. **Read the compiler message** — Error = violation of a safety rule
   - Checkpoint: Does the compiler's suggestion fix the issue?
4. **Choose the pattern** — Work with the rules, not against them
   - Clone for simplicity, refactor ownership for performance, use `Rc`/`Arc` for shared access
   - Checkpoint: Does the fix compile and preserve the intended semantics?

---

## Concrete Examples

### Ownership and Move

```rust
fn main() {
    let s1 = String::from("hello");
    let s2 = s1;          // s1 is MOVED to s2
    // println!("{s1}");   // ERROR E0382: value used after move
    println!("{s2}");      // OK — s2 owns the data now
}
```

### Borrowing Rules

```rust
fn main() {
    let mut data = vec![1, 2, 3];

    // Multiple immutable borrows — OK
    let r1 = &data;
    let r2 = &data;
    println!("{r1:?} {r2:?}");

    // Mutable borrow — OK only when no immutable borrows are active
    data.push(4);

    // This would fail — can't hold &data across a mutation:
    // let r3 = &data;
    // data.push(5);       // ERROR E0502: cannot borrow as mutable
    // println!("{r3:?}");
}
```

### Lifetime Annotation

```rust
// 'a means: returned reference lives as long as the shorter of x or y
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() { x } else { y }
}

fn main() {
    let result;
    let s1 = String::from("long string");
    {
        let s2 = String::from("hi");
        result = longest(&s1, &s2);
        println!("{result}"); // OK — s2 still alive here
    }
    // println!("{result}"); // ERROR E0597: s2 doesn't live long enough
}
```

---

## Common Misconceptions

| Error | Wrong Model | Correct Model |
|-------|-------------|---------------|
| E0382 use after move | GC cleans up | Ownership = unique key transfer |
| E0502 borrow conflict | Multiple writers OK | Only one writer at a time |
| E0499 multiple mut borrows | Aliased mutation | Exclusive access for mutation |
| E0106 missing lifetime | Ignoring scope | References have validity scope |
| E0507 cannot move from `&T` | Implicit clone | References don't own data |

## Related Skills

| When | See |
|------|-----|
| Ownership errors | m01-ownership |
| Smart pointers | m02-resource |
| Concurrency | m07-concurrency |
| Anti-patterns | m15-anti-pattern |
