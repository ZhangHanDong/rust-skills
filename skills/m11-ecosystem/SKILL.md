---
name: m11-ecosystem
description: "Use when integrating crates or ecosystem questions. Keywords: E0425, E0433, E0603, crate, cargo, dependency, feature flag, workspace, which crate to use, using external C libraries, creating Python extensions, PyO3, wasm, WebAssembly, bindgen, cbindgen, napi-rs, cannot find, private, crate recommendation, best crate for, Cargo.toml, features, crate 推荐, 依赖管理, 特性标志, 工作空间, Python 绑定"
user-invocable: false
---

## Current Dependencies (Auto-Injected)

!`grep -A 100 '^\[dependencies\]' Cargo.toml 2>/dev/null | head -30 || echo "No Cargo.toml found"`

---

# Ecosystem Integration

## Workflow: Adding a Dependency

1. **Identify need** → Check table below for standard crate
2. **Evaluate crate** → Apply selection criteria (maintenance, docs, stability)
3. **Add dependency** → `cargo add <crate>` with appropriate feature flags
4. **Configure features** → Disable defaults if unneeded: `default-features = false`
5. **Verify integration** → `cargo check` then `cargo clippy`

## Standard Crate Recommendations

| Need | Choice | Crates |
|------|--------|--------|
| Serialization | Derive-based | serde, serde_json |
| Async runtime | tokio or async-std | tokio (most popular) |
| HTTP client | Ergonomic | reqwest |
| HTTP server | Modern | axum, actix-web |
| Database | SQL or ORM | sqlx, diesel |
| CLI parsing | Derive-based | clap |
| Error handling | App vs lib | anyhow, thiserror |
| Logging | Facade | tracing, log |

---

## Example: Adding a Dependency with Feature Flags

```toml
# Cargo.toml — only enable what you need
[dependencies]
serde = { version = "1", features = ["derive"] }
reqwest = { version = "0.12", default-features = false, features = ["json", "rustls-tls"] }
tokio = { version = "1", features = ["rt-multi-thread", "macros"] }
sqlx = { version = "0.8", default-features = false, features = ["runtime-tokio", "postgres", "macros"] }
```

```rust
// Using serde with derive
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
struct Config {
    host: String,
    port: u16,
}

// Using reqwest with error handling
async fn fetch_data(url: &str) -> Result<Config, Box<dyn std::error::Error>> {
    let config: Config = reqwest::get(url).await?.json().await?;
    Ok(config)
}
```

## Example: Workspace Setup

```toml
# Root Cargo.toml
[workspace]
members = ["crates/*"]

[workspace.dependencies]
serde = { version = "1", features = ["derive"] }
tokio = { version = "1", features = ["full"] }

# crates/my-lib/Cargo.toml — inherit workspace deps
[dependencies]
serde = { workspace = true }
tokio = { workspace = true }
```

---

## Quick Reference

### Language Interop

| Integration | Crate/Tool | Use Case |
|-------------|------------|----------|
| C/C++ → Rust | `bindgen` | Auto-generate bindings |
| Rust → C | `cbindgen` | Export C headers |
| Python ↔ Rust | `pyo3` | Python extensions |
| Node.js ↔ Rust | `napi-rs` | Node addons |
| WebAssembly | `wasm-bindgen` | Browser/WASI |

### Cargo Features

```toml
[features]
default = ["json"]
json = ["dep:serde_json"]
full = ["json", "xml", "yaml"]

[dependencies]
serde_json = { version = "1", optional = true }
```

```rust
// Conditional compilation on feature flags
#[cfg(feature = "json")]
pub fn parse_json(input: &str) -> Result<Value, serde_json::Error> {
    serde_json::from_str(input)
}
```

## Error Code Reference

| Error | Cause | Fix |
|-------|-------|-----|
| E0425 | Unresolved name | Add `use` import or add crate to Cargo.toml |
| E0433 | Can't find crate | `cargo add <crate>` or check spelling |
| E0603 | Private item | Use public re-export or check crate docs |
| Feature not enabled | Optional feature | Enable in `features` |
| Version conflict | Incompatible deps | `cargo update` or pin |
| Duplicate types | Different crate versions | Unify in workspace |

---

## Crate Selection Criteria

| Criterion | Good Sign | Warning Sign |
|-----------|-----------|--------------|
| Maintenance | Recent commits | Years inactive |
| Community | Active issues/PRs | No response |
| Documentation | Examples, API docs | Minimal docs |
| Stability | Semantic versioning | Frequent breaking |
| Dependencies | Minimal, well-known | Heavy, obscure |

---

## Anti-Patterns

| Anti-Pattern | Why Bad | Better |
|--------------|---------|--------|
| `extern crate` | Outdated (2018+) | Just `use` |
| `#[macro_use]` | Global pollution | Explicit import |
| Wildcard deps `*` | Unpredictable | Specific versions |
| Too many deps | Supply chain risk | Evaluate necessity |
| Vendoring everything | Maintenance burden | Trust crates.io |

---

## Related Skills

| When | See |
|------|-----|
| Error type design | m06-error-handling |
| Trait integration | m04-zero-cost |
| FFI safety | unsafe-checker |
| Resource management | m12-lifecycle |
