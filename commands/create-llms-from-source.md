---
description: Generate llms.txt from local Rust source code
argument-hint: [source_path] [output_path]
---

# Create llms.txt from Rust Source Code

Generate comprehensive llms.txt documentation from local Rust project source code.

Arguments: $ARGUMENTS
- First argument: source_path (optional) - Rust project path, defaults to current directory
- Second argument: output_path (optional) - output path, defaults to ~/tmp/{timestamp}-{crate}-llms.txt

---

## Tool Priority

1. **rustdoc JSON** (preferred) - Most complete API extraction
2. **Source code parsing** (fallback) - If rustdoc unavailable

---

## Instructions

### 1. Validate Project

```bash
# Check if Cargo.toml exists
if [ ! -f "${source_path}/Cargo.toml" ]; then
    echo "Error: No Cargo.toml found at ${source_path}"
    exit 1
fi
```

### 2. Read Project Metadata

Extract from `Cargo.toml`:
- `name` - crate name
- `version` - crate version
- `description` - crate description
- `[features]` - feature flags
- `[dependencies]` - dependencies list

```bash
# Parse Cargo.toml
grep -E "^name|^version|^description" Cargo.toml
```

### 3. Check for Workspace

```bash
# Detect workspace
if grep -q "\[workspace\]" Cargo.toml; then
    # Parse members
    grep -A 20 "^\[workspace\]" Cargo.toml | grep -E "members\s*="
    # Process each member separately
fi
```

**Workspace handling:**
- If `[workspace]` section exists, identify all members
- Generate llms.txt for each member crate
- Or combine into single llms.txt with sections per crate

### 4. Extract API Documentation

#### Method A: rustdoc JSON (Preferred)

```bash
# Generate JSON documentation
cargo +nightly rustdoc -- -Z unstable-options --output-format json 2>/dev/null

# Output location
ls target/doc/*.json
```

**rustdoc JSON contains:**
- Complete module hierarchy
- All pub items with documentation
- Type signatures and generics
- Code examples from doc comments
- Feature flag requirements

**Parse JSON for:**
```
.index[*] | select(.visibility == "public") | {
  name: .name,
  kind: .kind,
  docs: .docs,
  sig: .inner.decl
}
```

#### Method B: Source Code Parsing (Fallback)

If rustdoc fails (no nightly, compilation errors):

```bash
# Extract crate-level documentation
grep "^//!" src/lib.rs | sed 's/^\/\/! //'

# Extract module documentation
find src -name "*.rs" -exec grep -l "^//!" {} \;

# Extract pub items with doc comments
grep -B 10 "^pub " src/**/*.rs | grep -E "///|^pub "

# Extract pub item signatures
grep -E "^pub (fn|struct|enum|trait|type|mod|const|static)" src/**/*.rs
```

**Extraction targets:**
| Pattern | Captures |
|---------|----------|
| `//!` | Module-level docs |
| `///` | Item-level docs |
| `pub fn` | Public functions |
| `pub struct` | Public structs |
| `pub enum` | Public enums |
| `pub trait` | Public traits |
| `pub type` | Type aliases |
| `pub mod` | Public modules |

### 5. Read README.md

```bash
if [ -f "${source_path}/README.md" ]; then
    # Extract overview section (first 100 lines or until ## section)
    head -100 README.md
fi
```

### 6. Extract Feature Flags

```bash
# From Cargo.toml [features] section
grep -A 50 "^\[features\]" Cargo.toml | grep -B 50 "^\[" | head -50
```

### 7. Generate llms.txt

Consolidate all extracted content into this format:

````markdown
# {CrateName}

> {Description from Cargo.toml}

**Version:** {version} | **Source:** local

---

## Overview

{Content from README.md or crate-level //! docs}

## Modules

### {module_name}

{Module documentation from //!}

#### Key Types

| Type | Description |
|------|-------------|
| `StructName` | From /// docs |
| `EnumName` | From /// docs |

#### Key Functions

```rust
/// Function documentation
pub fn function_name(param: Type) -> ReturnType
```

## Code Examples

```rust
// Examples extracted from /// docs or README
```

---

## Feature Flags

| Feature | Dependencies | Description |
|---------|--------------|-------------|
| `feature_name` | dep1, dep2 | From Cargo.toml comments |

---

## Dependencies

| Crate | Version | Features |
|-------|---------|----------|
| `dep_name` | 1.0 | feature1, feature2 |

---

## Source Structure

```
src/
├── lib.rs          - Main library entry
├── module1/
│   ├── mod.rs      - Module docs
│   └── types.rs    - Type definitions
└── module2.rs      - Single-file module
```
````

### 8. Save Output

```bash
# Generate timestamp
timestamp=$(date +%Y%m%d%H%M)

# Get crate name
crate_name=$(grep "^name" Cargo.toml | head -1 | cut -d'"' -f2)

# Output path
output="${output_path:-$HOME/tmp/${timestamp}-${crate_name}-llms.txt}"

# Ensure directory exists
mkdir -p "$(dirname "$output")"

# Write file
echo "Output saved to: $output"
```

---

## Fallback Strategy

```
1. Try rustdoc JSON
   ↓ (if failed)
2. Use source code parsing
   ↓ (always)
3. Supplement with Cargo.toml + README.md
```

**Automatic fallback triggers:**
- No nightly toolchain installed
- Project has compilation errors
- Missing dependencies
- Build script failures

When falling back, inform user:
```
rustdoc JSON generation failed, using source code parsing.
Some type information may be incomplete.
```

---

## Quality Requirements

- [ ] All pub items documented
- [ ] Module hierarchy preserved
- [ ] Code examples included
- [ ] Feature flags documented
- [ ] Dependencies listed
- [ ] Source structure shown
- [ ] Consistent markdown formatting
- [ ] Version information accurate

---

## Workspace Handling

For workspaces with multiple crates:

**Option 1: Combined llms.txt**
```
~/tmp/{timestamp}-{workspace}-llms.txt
```
Contains sections for each member crate.

**Option 2: Separate files**
```
~/tmp/{timestamp}-{crate1}-llms.txt
~/tmp/{timestamp}-{crate2}-llms.txt
```

Ask user which approach they prefer for workspaces.

---

## Workflow Integration

This command integrates with the Skills creation workflow:

```
Local Rust Source
        ↓
/create-llms-from-source {path}
        ↓
~/tmp/{timestamp}-{crate}-llms.txt
        ↓
/create-skills-via-llms {crate} {llms_path}
        ↓
~/.claude/skills/{crate}-*/
```

**Or via sync-crate-skills:**
```
/sync-crate-skills --from-source {path}
```

---

## Example Usage

```bash
# Generate llms.txt for current directory
/create-llms-from-source

# Generate for specific project
/create-llms-from-source /path/to/my-rust-project

# Specify output path
/create-llms-from-source /path/to/project ~/docs/my-crate-llms.txt

# For workspace project
/create-llms-from-source /path/to/workspace
```

---

## Limitations

- Private items (`pub(crate)`, `pub(super)`) are excluded
- Macro-generated code may not be fully captured in source parsing mode
- Generic constraints shown as-is without resolution
- Inline documentation preferred over external doc files
