---
name: rust-refactor-helper
description: "Safe Rust refactoring with LSP analysis. Triggers on: /refactor, rename symbol, move function, extract, 重构, 重命名, 提取函数, 安全重构"
argument-hint: "<action> <target> [--dry-run]"
allowed-tools: "LSP, Read, Glob, Grep, Edit"
---

# Rust Refactor Helper

Perform safe refactoring with comprehensive impact analysis.

## Usage

```
/rust-refactor-helper <action> <target> [--dry-run]
```

**Actions:**
- `rename <old> <new>` - Rename symbol
- `extract-fn <selection>` - Extract to function
- `inline <fn>` - Inline function
- `move <symbol> <dest>` - Move to module

**Examples:**
- `/rust-refactor-helper rename parse_config load_config`
- `/rust-refactor-helper extract-fn src/main.rs:20-35`
- `/rust-refactor-helper move UserService src/services/`

## LSP Operations Used

### Pre-Refactor Analysis

```
# Find all references before renaming
LSP(
  operation: "findReferences",
  filePath: "src/lib.rs",
  line: 25,
  character: 8
)

# Get symbol info
LSP(
  operation: "hover",
  filePath: "src/lib.rs",
  line: 25,
  character: 8
)

# Check call hierarchy for move operations
LSP(
  operation: "incomingCalls",
  filePath: "src/lib.rs",
  line: 25,
  character: 8
)
```

## Refactoring Workflows

### 1. Rename Symbol

```
User: "Rename parse_config to load_config"
    │
    ▼
[1] Find symbol definition
    LSP(goToDefinition)
    │
    ▼
[2] Find ALL references
    LSP(findReferences)
    │
    ▼
[3] Categorize by file
    │
    ▼
[4] Check for conflicts
    - Is 'load_config' already used?
    - Are there macro-generated uses?
    │
    ▼
[5] Show impact analysis (--dry-run)
    │
    ▼
[6] Apply changes with Edit tool
```

**Output:**

```
## Rename: parse_config → load_config

### Impact Analysis

**Definition:** src/config.rs:25
**References found:** 8

| File | Line | Context | Change |
|------|------|---------|--------|
| src/config.rs | 25 | `pub fn parse_config(` | Definition |
| src/config.rs | 45 | `parse_config(path)?` | Call |
| src/main.rs | 12 | `config::parse_config` | Import |
| src/main.rs | 30 | `let cfg = parse_config(` | Call |
| src/lib.rs | 8 | `pub use config::parse_config` | Re-export |
| tests/config_test.rs | 15 | `parse_config("test.toml")` | Test |
| tests/config_test.rs | 25 | `parse_config("")` | Test |
| docs/api.md | 42 | `parse_config` | Documentation |

### Potential Issues

⚠️ **Documentation reference:** docs/api.md:42 may need manual update
⚠️ **Re-export:** src/lib.rs:8 - public API change

### Proceed?
- [x] --dry-run (preview only)
- [ ] Apply changes
```

### 2. Extract Function

```
User: "Extract lines 20-35 in main.rs to a function"
    │
    ▼
[1] Read the selected code block
    │
    ▼
[2] Analyze variables
    - Which are inputs? (used but not defined in block)
    - Which are outputs? (defined and used after block)
    - Which are local? (defined and used only in block)
    │
    ▼
[3] Determine function signature
    │
    ▼
[4] Check for early returns, loops, etc.
    │
    ▼
[5] Generate extracted function
    │
    ▼
[6] Replace original code with call
```

**Output:**

```
## Extract Function: src/main.rs:20-35

### Selected Code
​```rust
let file = File::open(&path)?;
let mut contents = String::new();
file.read_to_string(&mut contents)?;
let config: Config = toml::from_str(&contents)?;
validate_config(&config)?;
​```

### Analysis

**Inputs:** path: &Path
**Outputs:** config: Config
**Side Effects:** File I/O, may return error

### Extracted Function

​```rust
fn load_and_validate_config(path: &Path) -> Result<Config> {
    let file = File::open(path)?;
    let mut contents = String::new();
    file.read_to_string(&mut contents)?;
    let config: Config = toml::from_str(&contents)?;
    validate_config(&config)?;
    Ok(config)
}
​```

### Replacement

​```rust
let config = load_and_validate_config(&path)?;
​```
```

### 3. Move Symbol

```
User: "Move UserService to src/services/"
    │
    ▼
[1] Find symbol and all its dependencies
    │
    ▼
[2] Find all references (callers)
    LSP(findReferences)
    │
    ▼
[3] Analyze import changes needed
    │
    ▼
[4] Check for circular dependencies
    │
    ▼
[5] Generate move plan
```

**Output:**

```
## Move: UserService → src/services/user.rs

### Current Location
src/handlers/auth.rs:50-120

### Dependencies (will be moved together)
- struct UserService (50-80)
- impl UserService (82-120)
- const DEFAULT_TIMEOUT (48)

### Import Changes Required

| File | Current | New |
|------|---------|-----|
| src/main.rs | `use handlers::auth::UserService` | `use services::user::UserService` |
| src/handlers/api.rs | `use super::auth::UserService` | `use crate::services::user::UserService` |
| tests/auth_test.rs | `use crate::handlers::auth::UserService` | `use crate::services::user::UserService` |

### New File Structure

​```
src/
├── services/
│   ├── mod.rs (NEW - add `pub mod user;`)
│   └── user.rs (NEW - UserService moved here)
├── handlers/
│   └── auth.rs (UserService removed)
​```

### Circular Dependency Check
✅ No circular dependencies detected
```

## Safety Checks

| Check | Purpose |
|-------|---------|
| Reference completeness | Ensure all uses are found |
| Name conflicts | Detect existing symbols with same name |
| Visibility changes | Warn if pub/private scope changes |
| Macro-generated code | Warn about code in macros |
| Documentation | Flag doc comments mentioning symbol |
| Test coverage | Show affected tests |

## Dry Run Mode

Always use `--dry-run` first to preview changes:

```
/rust-refactor-helper rename old_name new_name --dry-run
```

This shows all changes without applying them.

## Related Skills

| When | See |
|------|-----|
| Navigate to symbol | rust-code-navigator |
| Understand call flow | rust-call-graph |
| Project structure | rust-symbol-analyzer |
| Trait implementations | rust-trait-explorer |
