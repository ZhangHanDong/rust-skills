---
name: rust-symbol-analyzer
description: "Analyze Rust project structure using LSP symbols. Triggers on: /symbols, project structure, list structs, list traits, list functions, 符号分析, 项目结构, 列出所有, 有哪些struct"
argument-hint: "[file.rs] [--type struct|trait|fn|mod]"
allowed-tools: "LSP, Read, Glob"
---

# Rust Symbol Analyzer

Analyze project structure by examining symbols across your Rust codebase.

## Usage

```
/rust-symbol-analyzer [file.rs] [--type struct|trait|fn|mod]
```

**Examples:**
- `/rust-symbol-analyzer` - Analyze entire project
- `/rust-symbol-analyzer src/lib.rs` - Analyze single file
- `/rust-symbol-analyzer --type trait` - List all traits in project

## LSP Operations

### 1. Document Symbols (Single File)

Get all symbols in a file with their hierarchy.

```
LSP(
  operation: "documentSymbol",
  filePath: "src/lib.rs",
  line: 1,
  character: 1
)
```

**Returns:** Nested structure of modules, structs, functions, etc.

### 2. Workspace Symbols (Entire Project)

Search for symbols across the workspace.

```
LSP(
  operation: "workspaceSymbol",
  filePath: "src/lib.rs",
  line: 1,
  character: 1
)
```

**Note:** Query is implicit in the operation context.

## Workflow

```
User: "What's the structure of this project?"
    │
    ▼
[1] Find all Rust files
    Glob("**/*.rs")
    │
    ▼
[2] Get symbols from each key file
    LSP(documentSymbol) for lib.rs, main.rs
    │
    ▼
[3] Categorize by type
    │
    ▼
[4] Generate structure visualization
```

## Output Format

### Project Overview

```
## Project Structure: my-project

### Modules
├── src/
│   ├── lib.rs (root)
│   ├── config/
│   │   ├── mod.rs
│   │   └── parser.rs
│   ├── handlers/
│   │   ├── mod.rs
│   │   ├── auth.rs
│   │   └── api.rs
│   └── models/
│       ├── mod.rs
│       ├── user.rs
│       └── order.rs
└── tests/
    └── integration.rs
```

### By Symbol Type

```
## Symbols by Type

### Structs (12)
| Name | Location | Fields | Derives |
|------|----------|--------|---------|
| Config | src/config.rs:10 | 5 | Debug, Clone |
| User | src/models/user.rs:8 | 4 | Debug, Serialize |
| Order | src/models/order.rs:15 | 6 | Debug, Serialize |
| ... | | | |

### Traits (4)
| Name | Location | Methods | Implementors |
|------|----------|---------|--------------|
| Handler | src/handlers/mod.rs:5 | 3 | AuthHandler, ApiHandler |
| Repository | src/db/mod.rs:12 | 5 | UserRepo, OrderRepo |
| ... | | | |

### Functions (25)
| Name | Location | Visibility | Async |
|------|----------|------------|-------|
| main | src/main.rs:10 | pub | yes |
| parse_config | src/config.rs:45 | pub | no |
| ... | | | |

### Enums (6)
| Name | Location | Variants |
|------|----------|----------|
| Error | src/error.rs:5 | 8 |
| Status | src/models/order.rs:5 | 4 |
| ... | | |
```

### Single File Analysis

```
## src/handlers/auth.rs

### Symbols Hierarchy

mod auth
├── struct AuthHandler
│   ├── field: config: Config
│   ├── field: db: Pool
│   └── impl AuthHandler
│       ├── fn new(config, db) -> Self
│       ├── fn authenticate(&self, token) -> Result<User>
│       └── fn refresh_token(&self, user) -> Result<Token>
├── struct Token
│   ├── field: value: String
│   └── field: expires: DateTime
├── enum AuthError
│   ├── InvalidToken
│   ├── Expired
│   └── Unauthorized
└── impl Handler for AuthHandler
    ├── fn handle(&self, req) -> Response
    └── fn name(&self) -> &str
```

## Analysis Features

### Complexity Metrics

```
## Complexity Analysis

| File | Structs | Functions | Lines | Complexity |
|------|---------|-----------|-------|------------|
| src/handlers/auth.rs | 2 | 8 | 150 | Medium |
| src/models/user.rs | 3 | 12 | 200 | High |
| src/config.rs | 1 | 3 | 50 | Low |

**Hotspots:** Files with high complexity that may need refactoring
- src/handlers/api.rs (15 functions, 300 lines)
```

### Dependency Analysis

```
## Internal Dependencies

auth.rs
├── imports from: config.rs, models/user.rs, db/mod.rs
└── imported by: main.rs, handlers/mod.rs

user.rs
├── imports from: (none - leaf module)
└── imported by: auth.rs, api.rs, tests/
```

## Symbol Types

| Type | Icon | LSP Kind |
|------|------|----------|
| Module | 📦 | Module |
| Struct | 🏗️ | Struct |
| Enum | 🔢 | Enum |
| Trait | 📜 | Interface |
| Function | ⚡ | Function |
| Method | 🔧 | Method |
| Constant | 🔒 | Constant |
| Field | 📎 | Field |

## Common Queries

| User Says | Analysis |
|-----------|----------|
| "What structs are in this project?" | workspaceSymbol + filter |
| "Show me src/lib.rs structure" | documentSymbol |
| "Find all async functions" | workspaceSymbol + async filter |
| "List public API" | documentSymbol + pub filter |

## Related Skills

| When | See |
|------|-----|
| Navigate to symbol | rust-code-navigator |
| Call relationships | rust-call-graph |
| Trait implementations | rust-trait-explorer |
| Safe refactoring | rust-refactor-helper |
