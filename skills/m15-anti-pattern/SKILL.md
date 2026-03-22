---
name: m15-anti-pattern
description: "Use when reviewing code for anti-patterns. Keywords: anti-pattern, common mistake, pitfall, code smell, bad practice, code review, is this an anti-pattern, better way to do this, common mistake to avoid, why is this bad, idiomatic way, beginner mistake, fighting borrow checker, clone everywhere, unwrap in production, should I refactor, 反模式, 常见错误, 代码异味, 最佳实践, 地道写法"
user-invocable: false
---

# Anti-Patterns

> **Layer 2: Design Choices**

## Core Question

**Is this pattern hiding a design problem?**

When reviewing code:
- Is this solving the symptom or the cause?
- Is there a more idiomatic approach?
- Does this fight or flow with Rust?

---

## Anti-Pattern → Better Pattern

| Anti-Pattern | Why Bad | Better |
|--------------|---------|--------|
| `.clone()` everywhere | Hides ownership issues | Proper references or ownership |
| `.unwrap()` in production | Runtime panics | `?`, `expect`, or handling |
| `Rc` when single owner | Unnecessary overhead | Simple ownership |
| `unsafe` for convenience | UB risk | Find safe pattern |
| OOP via `Deref` | Misleading API | Composition, traits |
| Giant match arms | Unmaintainable | Extract to methods |
| `String` everywhere | Allocation waste | `&str`, `Cow<str>` |
| Ignoring `#[must_use]` | Lost errors | Handle or `let _ =` |
| Index loops | Off-by-one, not idiomatic | `.iter()`, `.enumerate()` |

### Concrete Examples

**Clone to fix borrow checker (bad) → references (good):**

```rust
// BAD: cloning to satisfy borrow checker
fn process(data: &Vec<String>) {
    let copy = data.clone();
    for item in &copy {
        println!("{item}");
    }
}

// GOOD: borrow directly
fn process(data: &[String]) {
    for item in data {
        println!("{item}");
    }
}
```

**Unwrap in production (bad) → propagate errors (good):**

```rust
// BAD: panics if file missing
let config = std::fs::read_to_string("config.toml").unwrap();

// GOOD: propagate with context
let config = std::fs::read_to_string("config.toml")
    .map_err(|e| AppError::Config(format!("Failed to read config: {e}")))?;
```

**String everywhere (bad) → borrowed str (good):**

```rust
// BAD: unnecessary allocation
fn greet(name: String) -> String {
    format!("Hello, {name}")
}

// GOOD: accept borrowed, allocate only when needed
fn greet(name: &str) -> String {
    format!("Hello, {name}")
}
```

---

## Review Workflow

When seeing suspicious code, follow these steps:

1. **Identify: symptom or cause?**
   - Clone to avoid borrow? → Ownership design issue
   - Unwrap "because it won't fail"? → Unhandled error case
   - **Checkpoint:** Can you name the root cause, not just the surface fix?

2. **Propose idiomatic alternative**
   - References instead of clones
   - Iterators instead of index loops
   - Pattern matching instead of boolean flags
   - **Checkpoint:** Does the alternative compile without new `unsafe` or `.clone()`?

3. **Validate: does the fix flow with Rust?**
   - Fighting borrow checker → restructure data ownership
   - Excessive unsafe → find safe abstraction
   - **Checkpoint:** Run `cargo clippy -- -W clippy::pedantic` — are warnings reduced?

---

## Trace Up ↑

To design understanding:

```
"Why does my code have so many clones?"
    ↑ Ask: Is the ownership model correct?
    ↑ Check: m09-domain (data flow design)
    ↑ Check: m01-ownership (reference patterns)
```

| Anti-Pattern | Trace To | Question |
|--------------|----------|----------|
| Clone everywhere | m01-ownership | Who should own this data? |
| Unwrap everywhere | m06-error-handling | What's the error strategy? |
| Rc everywhere | m09-domain | Is ownership clear? |
| Fighting lifetimes | m09-domain | Should data structure change? |

---

## Trace Down ↓

To implementation (Layer 1):

```
"Replace clone with proper ownership"
    ↓ m01-ownership: Reference patterns
    ↓ m02-resource: Smart pointer if needed

"Replace unwrap with proper handling"
    ↓ m06-error-handling: ? operator
    ↓ m06-error-handling: expect with message
```

---

## Code Smell → Refactoring

| Smell | Indicates | Refactoring |
|-------|-----------|-------------|
| Many `.clone()` | Ownership unclear | Clarify data flow |
| Many `.unwrap()` | Error handling missing | Add proper handling |
| Many `pub` fields | Encapsulation broken | Private + accessors |
| Deep nesting | Complex logic | Extract methods |
| Long functions | Multiple responsibilities | Split |
| Giant enums | Missing abstraction | Trait + types |

---

## Compiler Error → Anti-Pattern Diagnosis

| Error Code | Likely Anti-Pattern | Fix Direction |
|------------|-------------------|---------------|
| E0382 (use after move) | Cloning to work around ownership | Redesign who owns the data |
| E0502 (borrow conflict) | Holding references too long | Narrow borrow scopes |
| E0597 (lifetime too short) | Wrong data structure | Restructure to own data |

---

## Deprecated → Modern Replacement

| Deprecated | Better |
|------------|--------|
| `collect::<Vec<_>>()` then iterate | Chain iterators directly |
| Manual unsafe cell | `Cell`, `RefCell` |
| `mem::transmute` for casts | `as` or `TryFrom` |
| Custom linked list | `Vec`, `VecDeque` |
| `lazy_static!` | `std::sync::OnceLock` (1.70+) |

---

## Quick Review Checklist

- [ ] No `.clone()` without justification
- [ ] No `.unwrap()` in library code
- [ ] No `pub` fields with invariants
- [ ] No index loops when iterator works
- [ ] No `String` where `&str` suffices
- [ ] No ignored `#[must_use]` warnings
- [ ] No `unsafe` without SAFETY comment
- [ ] No giant functions (>50 lines)

---

## Related Skills

| When | See |
|------|-----|
| Ownership patterns | m01-ownership |
| Error handling | m06-error-handling |
| Mental models | m14-mental-model |
| Performance | m10-performance |
