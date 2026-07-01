---
name: rust-docs
description: "Automatically fetch correct Rust dependency documentation from docs.rs when writing or editing Rust code. Use when the user asks for Rust code, requests changes in Rust files, or when project dependencies need to be reviewed. Trigger phrases: write some Rust code, how do I use X in Rust, fix Rust code, use this crate correctly, docs.rs, crates.io API."
allowed-tools: ["Read", "Glob", "Grep", "WebFetch", "Bash"]
---

# rust-docs

Automatically provide correct API usage for project dependencies by fetching live docs from docs.rs.

## When to Use

Trigger this skill when:
- The user asks to write Rust code
- The user asks how to use a Rust crate or API
- Editing or reviewing Rust source files
- The user mentions a crate name in a Rust context
- Questions about `Cargo.toml`, `docs.rs`, `crates.io`, or Rust APIs

## Workflow

### 1. Detect Project Dependencies

Check for dependency manifests in the current project:

```bash
# Primary sources
ls Cargo.toml
ls Cargo.lock
```

Read dependencies from `Cargo.toml` sections:
- `[dependencies]`
- `[dev-dependencies]`
- `[build-dependencies]`

### 2. Identify Relevant Crate

Match the user’s request or current file to a dependency:

- If user explicitly names a crate, use it directly
- If editing Rust code, extract crate names from `use` statements
- If ambiguous, pick the crate most relevant to the request

### 3. Determine Target Docs

Construct the docs.rs URL:

| Target | URL Pattern |
|--------|--------------|
| Crate overview | `https://docs.rs/{crate}/latest/{crate}/` |
| Specific module | `https://docs.rs/{crate}/latest/{crate}/{module}/` |
| Specific struct | `https://docs.rs/{crate}/latest/{crate}/struct.{Name}.html` |
| Specific trait | `https://docs.rs/{crate}/latest/{crate}/trait.{Name}.html` |
| Specific enum | `https://docs.rs/{crate}/latest/{crate}/enum.{Name}.html` |
| Specific function | `https://docs.rs/{crate}/latest/{crate}/fn.{Name}.html` |

For std library:
| Target | URL Pattern |
|--------|--------------|
| Trait | `https://doc.rust-lang.org/std/{module}/trait.{Name}.html` |
| Struct | `https://doc.rust-lang.org/std/{module}/struct.{Name}.html` |
| Enum | `https://doc.rust-lang.org/std/{module}/enum.{Name}.html` |
| Module | `https://doc.rust-lang.org/std/{module}/index.html` |

### 4. Fetch Documentation

Use `WebFetch` or `agent-browser` to retrieve the docs page and extract:
- Required Cargo features
- Correct function signatures
- Usage examples
- Important notes/panics

### 5. Provide Correct Usage

Generate code that matches the fetched API exactly. Include:
- Correct Cargo.toml feature flags if needed
- Exact method names and signatures
- Real examples from the docs

## Auto-Trigger Examples

User: "write a Rust function to download a file"
→ Detect `reqwest` in Cargo.toml → fetch `reqwest` docs → show correct API with `Client::get()` and `.bytes()` or `.text()`

User: "how do I use Arc in this project?"
→ Identify `std::sync::Arc` → fetch `doc.rust-lang.org/std/sync/struct.Arc.html` → provide correct `Arc::new()` / `Arc::clone()` usage

User: "parse JSON with serde"
→ Detect `serde` in Cargo.toml → fetch `serde` docs → show `#[derive(Serialize, Deserialize)]` and `serde_json` usage

User: "fix this Rust code"
→ Read the `.rs` file → extract crate names from `use` imports → fetch docs for those crates → suggest fixes based on actual API

## Alias

This skill replaces request patterns like:
- "best-skill-creator" for Rust skill creation
- Manual crate documentation lookup

## Notes

- Always verify the crate exists in the project's `Cargo.toml`
- Prefer `docs.rs` over guessing API signatures
- Include both async and blocking APIs if both are available
