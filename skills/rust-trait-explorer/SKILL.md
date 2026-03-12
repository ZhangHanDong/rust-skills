---
name: rust-trait-explorer
description: "Explore Rust trait implementations using LSP. Triggers on: /trait-impl, find implementations, who implements, trait 实现, 谁实现了, 实现了哪些trait"
argument-hint: "<TraitName|StructName>"
allowed-tools: "LSP, Read, Glob, Grep"
---

# Rust Trait Explorer

Discover trait implementations and understand polymorphic designs.

## Usage

```
/rust-trait-explorer <TraitName|StructName>
```

**Examples:**
- `/rust-trait-explorer Handler` - Find all implementors of Handler trait
- `/rust-trait-explorer MyStruct` - Find all traits implemented by MyStruct

## LSP Operations

### Go to Implementation

Find all implementations of a trait.

```
LSP(
  operation: "goToImplementation",
  filePath: "src/traits.rs",
  line: 10,
  character: 11
)
```

**Use when:**
- Trait name is known
- Want to find all implementors
- Understanding polymorphic code

## Workflow

### Find Trait Implementors

```
User: "Who implements the Handler trait?"
    │
    ▼
[1] Find trait definition
    LSP(goToDefinition) or workspaceSymbol
    │
    ▼
[2] Get implementations
    LSP(goToImplementation)
    │
    ▼
[3] For each impl, get details
    LSP(documentSymbol) for methods
    │
    ▼
[4] Generate implementation map
```

### Find Traits for a Type

```
User: "What traits does MyStruct implement?"
    │
    ▼
[1] Find struct definition
    │
    ▼
[2] Search for "impl * for MyStruct"
    Grep pattern matching
    │
    ▼
[3] Get trait details for each
    │
    ▼
[4] Generate trait list
```

## Output Format

### Trait Implementors

```
## Implementations of `Handler`

**Trait defined at:** src/traits.rs:15

​```rust
pub trait Handler {
    fn handle(&self, request: Request) -> Response;
    fn name(&self) -> &str;
}
​```

### Implementors (4)

| Type | Location | Notes |
|------|----------|-------|
| AuthHandler | src/handlers/auth.rs:20 | Handles authentication |
| ApiHandler | src/handlers/api.rs:15 | REST API endpoints |
| WebSocketHandler | src/handlers/ws.rs:10 | WebSocket connections |
| MockHandler | tests/mocks.rs:5 | Test mock |

### Implementation Details

#### AuthHandler
​```rust
impl Handler for AuthHandler {
    fn handle(&self, request: Request) -> Response {
        // Authentication logic
    }

    fn name(&self) -> &str {
        "auth"
    }
}
​```

#### ApiHandler
​```rust
impl Handler for ApiHandler {
    fn handle(&self, request: Request) -> Response {
        // API routing logic
    }

    fn name(&self) -> &str {
        "api"
    }
}
​```
```

### Traits for a Type

```
## Traits implemented by `User`

**Struct defined at:** src/models/user.rs:10

### Standard Library Traits
| Trait | Derived/Manual | Notes |
|-------|----------------|-------|
| Debug | #[derive] | Auto-generated |
| Clone | #[derive] | Auto-generated |
| Default | manual | Custom defaults |
| Display | manual | User-friendly output |

### Serde Traits
| Trait | Location |
|-------|----------|
| Serialize | #[derive] |
| Deserialize | #[derive] |

### Project Traits
| Trait | Location | Methods |
|-------|----------|---------|
| Entity | src/db/entity.rs:30 | id(), created_at() |
| Validatable | src/validation.rs:15 | validate() |

### Implementation Hierarchy

​```
User
├── derive
│   ├── Debug
│   ├── Clone
│   ├── Serialize
│   └── Deserialize
└── impl
    ├── Default (src/models/user.rs:50)
    ├── Display (src/models/user.rs:60)
    ├── Entity (src/models/user.rs:70)
    └── Validatable (src/models/user.rs:85)
​```
```

## Trait Hierarchy Visualization

```
## Trait Hierarchy

                    ┌─────────────┐
                    │    Error    │ (std)
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
      ┌───────▼───────┐ ┌──▼──┐ ┌───────▼───────┐
      │  AppError     │ │ ... │ │  DbError      │
      └───────┬───────┘ └─────┘ └───────┬───────┘
              │                         │
      ┌───────▼───────┐         ┌───────▼───────┐
      │ AuthError     │         │ QueryError    │
      └───────────────┘         └───────────────┘
```

## Analysis Features

### Coverage Check

```
## Trait Implementation Coverage

Trait: Handler (3 required methods)

| Implementor | handle() | name() | priority() | Complete |
|-------------|----------|--------|------------|----------|
| AuthHandler | ✅ | ✅ | ✅ | Yes |
| ApiHandler | ✅ | ✅ | ❌ default | Yes |
| MockHandler | ✅ | ✅ | ✅ | Yes |
```

### Blanket Implementations

```
## Blanket Implementations

The following blanket impls may apply to your types:

| Trait | Blanket Impl | Applies To |
|-------|--------------|------------|
| From<T> | `impl<T> From<T> for T` | All types |
| Into<U> | `impl<T, U> Into<U> for T where U: From<T>` | Types with From |
| ToString | `impl<T: Display> ToString for T` | Types with Display |
```

## Common Patterns

| User Says | Action |
|-----------|--------|
| "Who implements X?" | goToImplementation on trait |
| "What traits does Y impl?" | Grep for `impl * for Y` |
| "Show trait hierarchy" | Find super-traits recursively |
| "Is X: Send + Sync?" | Check std trait impls |

## Related Skills

| When | See |
|------|-----|
| Navigate to impl | rust-code-navigator |
| Call relationships | rust-call-graph |
| Project structure | rust-symbol-analyzer |
| Safe refactoring | rust-refactor-helper |
