---
name: m09-domain
description: "Use when: domain modeling. Keywords: domain model, DDD, domain-driven design, entity, value object, aggregate, repository pattern, business rules, validation, invariant, 领域模型, 领域驱动设计, 业务规则"
user-invocable: false
---

# Domain Modeling

> **Layer 2: Design Choices**

## Core Question

**What is this concept's role in the domain?** Identity matters -> Entity. Interchangeable by value -> Value Object. Then ask: what invariants must hold, and who owns the data?

## Domain Concept -> Rust Pattern

| Domain Concept | Rust Pattern | Ownership Implication | Example |
|----------------|--------------|----------------------|---------|
| Entity | struct + newtype Id | Owned, identity equality (compare Id only) | `struct User { id: UserId, ... }` |
| Value Object | struct + Clone/Copy | Shareable, immutable, validated at construction | `struct Email(String);` |
| Aggregate Root | struct owns children | Parent owns `Vec<Child>`; mutate via root methods | `struct Order { items: Vec<OrderItem> }` |
| Repository | trait | Abstracts persistence | `trait UserRepo { fn find(...); }` |
| Domain Event | enum | Captures state changes | `enum OrderEvent { Created, ... }` |
| Service | impl block / free fn | Stateless operations | `fn transfer(from, to, amount)` |

Invariant rules: always-valid -> private fields + validated constructor; state transition rules -> type state pattern (m05). Shared within aggregate -> consider `Rc`/`Weak` (m02), but prefer a plain ownership tree.

## Pattern Templates

### Value Object

```rust
struct Email(String);

impl Email {
    pub fn new(s: &str) -> Result<Self, ValidationError> {
        validate_email(s)?;
        Ok(Self(s.to_string()))
    }
}
```

### Entity

```rust
#[derive(PartialEq)]
struct UserId(Uuid);

struct User {
    id: UserId,
    email: Email,
    // ... other fields
}

impl PartialEq for User {
    fn eq(&self, other: &Self) -> bool {
        self.id == other.id  // Identity equality
    }
}
```

### Aggregate

```rust
mod order {
    pub struct Order {
        id: OrderId,
        items: Vec<OrderItem>,  // Owned children
        // ...
    }

    impl Order {
        pub fn add_item(&mut self, item: OrderItem) {
            // Enforce aggregate invariants
        }
    }
}
```

## Common Mistakes

| Mistake | Why Wrong | Better |
|---------|-----------|--------|
| Primitive obsession | No type safety | Newtype wrappers |
| Public fields with invariants | Invariants violated | Private + accessor |
| Leaked aggregate internals | Broken encapsulation | Methods on root |
| String for semantic types | No validation | Validated newtype |

## Related Skills

| When | See |
|------|-----|
| Newtype, type state, validated construction | m05-type-driven |
| Ownership tree, Rc/Weak for shared children | m01-ownership, m02-resource |
| Domain error handling | m13-domain-error |
| Domain-specific rules (fintech audit, web latency, ...) | domain-* |
