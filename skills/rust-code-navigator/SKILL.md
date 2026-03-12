---
name: rust-code-navigator
description: "Navigate Rust code using LSP. Triggers on: /navigate, go to definition, find references, where is defined, 跳转定义, 查找引用, 定义在哪, 谁用了这个"
argument-hint: "<symbol> [in file.rs:line]"
allowed-tools: "LSP, Read, Glob"
---

# Rust Code Navigator

Navigate large Rust codebases efficiently using Language Server Protocol.

## Usage

```
/rust-code-navigator <symbol> [in file.rs:line]
```

**Examples:**
- `/rust-code-navigator parse_config` - Find definition of parse_config
- `/rust-code-navigator MyStruct in src/lib.rs:42` - Navigate from specific location

## LSP Operations

### 1. Go to Definition

Find where a symbol is defined.

```
LSP(
  operation: "goToDefinition",
  filePath: "src/main.rs",
  line: 25,
  character: 10
)
```

**Use when:**
- User asks "where is X defined?"
- User wants to understand a type/function
- Ctrl+click equivalent

### 2. Find References

Find all usages of a symbol.

```
LSP(
  operation: "findReferences",
  filePath: "src/lib.rs",
  line: 15,
  character: 8
)
```

**Use when:**
- User asks "who uses X?"
- Before refactoring/renaming
- Understanding impact of changes

### 3. Hover Information

Get type and documentation for a symbol.

```
LSP(
  operation: "hover",
  filePath: "src/main.rs",
  line: 30,
  character: 15
)
```

**Use when:**
- User asks "what type is X?"
- User wants documentation
- Quick type checking

## Workflow

```
User: "Where is the Config struct defined?"
    │
    ▼
[1] Search for "Config" in workspace
    LSP(operation: "workspaceSymbol", ...)
    │
    ▼
[2] If multiple results, ask user to clarify
    │
    ▼
[3] Go to definition
    LSP(operation: "goToDefinition", ...)
    │
    ▼
[4] Show file path and context
    Read surrounding code for context
```

## Output Format

### Definition Found

```
## Config (struct)

**Defined in:** `src/config.rs:15`

​```rust
#[derive(Debug, Clone)]
pub struct Config {
    pub name: String,
    pub port: u16,
    pub debug: bool,
}
​```

**Documentation:** Configuration for the application server.
```

### References Found

```
## References to `Config` (5 found)

| Location | Context |
|----------|---------|
| src/main.rs:10 | `let config = Config::load()?;` |
| src/server.rs:25 | `fn new(config: Config) -> Self` |
| src/server.rs:42 | `self.config.port` |
| src/tests.rs:15 | `Config::default()` |
| src/cli.rs:8 | `config: Option<Config>` |
```

## Common Patterns

| User Says | LSP Operation |
|-----------|---------------|
| "Where is X defined?" | goToDefinition |
| "Who uses X?" | findReferences |
| "What type is X?" | hover |
| "Find all structs" | workspaceSymbol |
| "What's in this file?" | documentSymbol |

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| "No LSP server" | rust-analyzer not running | Suggest: `rustup component add rust-analyzer` |
| "Symbol not found" | Typo or not in scope | Search with workspaceSymbol first |
| "Multiple definitions" | Generics or macros | Show all and let user choose |

## Related Skills

| When | See |
|------|-----|
| Call relationships | rust-call-graph |
| Project structure | rust-symbol-analyzer |
| Trait implementations | rust-trait-explorer |
| Safe refactoring | rust-refactor-helper |
