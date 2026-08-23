# Borrow-Checker Escape Patterns

Three named patterns for when the borrow checker rejects a design. Mechanics of
the underlying errors live in m01-ownership; type-driven redesign in m05-type-driven.

## 1. Clone-Escape

Clone to end a borrow before mutating. Valid as a first step, but always ask:
"is there a better design?" — pervasive cloning usually means ownership should
be restructured (see m15-anti-pattern).

```rust
use std::collections::HashMap;

fn rebuild(map: &mut HashMap<String, i32>) {
    // Double borrow -- does NOT compile:
    // for key in map.keys() {
    //     map.insert(key.clone(), process(key));  // E0502: map borrowed twice
    // }

    // Clone the keys so the immutable borrow ends before mutation:
    let keys: Vec<String> = map.keys().cloned().collect();
    for key in keys {
        let value = process(&key);
        map.insert(key, value);
    }
}
```

## 2. Make-It-Own

When struct lifetimes infect every signature, store owned data plus indices
instead of references:

```rust
// Complex: lifetime parameter spreads to every user of the type
struct ParserView<'a> {
    input: &'a str,
    current: &'a str,
}

// Simpler: owns its data, no lifetime parameter
struct Parser {
    input: String,
    position: usize,
}
```

Trade-off: one extra allocation at construction buys lifetime-free APIs.

## 3. Split-the-Borrow

Borrowing two fields through `&mut self` conflicts; destructure so the
compiler sees disjoint field borrows:

```rust
struct Data {
    field_a: Vec<i32>,
    field_b: Vec<i32>,
}

impl Data {
    fn process(&mut self) {
        // for a in &self.field_a {
        //     self.field_b.push(*a);  // E0502: cannot borrow self twice
        // }

        // Destructure: separate borrows per field
        let Data { field_a, field_b } = self;
        for a in field_a.iter() {
            field_b.push(*a);
        }
    }
}
```

Same idea applies to slices (`split_at_mut`) and to extracting a field method
into a free function that takes only the fields it needs.
