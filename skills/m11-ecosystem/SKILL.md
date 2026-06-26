---
name: m11-ecosystem
description: "Use when integrating crates or ecosystem questions. Keywords: E0425, E0433, E0603, crate, cargo, dependency, feature flag, workspace, which crate to use, using external C libraries, creating Python extensions, PyO3, wasm, WebAssembly, bindgen, cbindgen, napi-rs, cannot find, private, crate recommendation, best crate for, Cargo.toml, features, crate 推荐, 依赖管理, 特性标志, 工作空间, Python 绑定"
user-invocable: false
---

# Ecosystem Integration

> **Layer 2: Design Choices**

## Core Question

**What's the right crate for this job, and how should it integrate?** Check maintenance status, API stability, and whether a feature-flagged subset is enough before adding a dependency.

## API Evolution

When an API changes across compiler or crate versions:

- Check MSRV and semver impact first; classify the change as stabilization, signature change, behavior change, or deprecation.
- For downstream users, choose: fallback path, feature-gated path, or an explicit MSRV/major-version bump (call out the semver decision in release notes).
- When behavior changes but signatures stay the same, add regression tests for the affected edge cases.

## Integration Decision -> Crates

| Need | Choice | Crates |
|------|--------|--------|
| Serialization | Derive-based | serde, serde_json |
| Async runtime | tokio (default) | smol for lightweight; async-std is discontinued (2025) |
| HTTP client | Ergonomic | reqwest |
| HTTP server | Modern | axum, actix-web |
| Database | SQL or ORM | sqlx, diesel |
| CLI parsing | Derive-based | clap |
| Error handling | App vs lib | anyhow (app), thiserror (lib) |
| Logging | Facade | tracing, log |

For live versions/features of a specific crate, use rust-learner (crate-researcher agent) instead of trusting static tables.

## Language Interop

| Integration | Crate/Tool | Use Case |
|-------------|------------|----------|
| C/C++ -> Rust | `bindgen` | Auto-generate bindings |
| Rust -> C | `cbindgen` | Export C headers |
| Python <-> Rust | `pyo3` | Python extensions |
| Node.js <-> Rust | `napi-rs` | Node addons |
| WebAssembly | `wasm-bindgen` | Browser/WASI |

## Error Reference

Compiler errors:

| Error | Cause | Fix |
|-------|-------|-----|
| E0425 | Cannot find value/function in scope | Missing import, typo, or item behind a disabled feature flag |
| E0433 | Cannot find crate/module | Add to Cargo.toml; check crate vs module name (dashes become underscores) |
| E0603 | Item is private | Use the crate's public re-export; check docs for intended path |

Cargo-level failures (not compiler codes):

| Failure | Cause | Fix |
|---------|-------|-----|
| Feature not enabled | Optional API behind flag | Enable in `features = [...]` |
| Version conflict | Incompatible transitive deps | `cargo update`, pin, or unify in `[workspace.dependencies]` |
| Duplicate trait/type errors | Two semver-incompatible copies of one crate | `cargo tree -d` to find, then unify versions |
| `no_std` crate pulls in `std` features accidentally | Default features of a dep enable `std` | Set `default-features = false`; use `resolver = "2"` in workspace to prevent feature unification across crate types |

## Crate Selection Criteria

| Criterion | Good Sign | Warning Sign |
|-----------|-----------|--------------|
| Maintenance | Recent commits | Years inactive |
| Community | Active issues/PRs | No response |
| Documentation | Examples, API docs | Minimal docs |
| Stability | Semantic versioning | Frequent breaking |
| Dependencies | Minimal, well-known | Heavy, obscure |

## Anti-Patterns

| Anti-Pattern | Why Bad | Better |
|--------------|---------|--------|
| `extern crate` | Outdated (2018+) | Just `use` |
| `#[macro_use]` | Global pollution | Explicit import |
| Wildcard deps `*` | Unpredictable | Specific versions |
| Too many deps | Supply chain risk | Evaluate necessity |
| Vendoring everything | Maintenance burden | Trust crates.io |

## Related Skills

| When | See |
|------|-----|
| Live crate versions, docs, features | rust-learner |
| Error type design across crate boundaries | m06-error-handling |
| Trait bounds when integrating generic APIs | m04-zero-cost |
| FFI safety | unsafe-checker |
| Resource cleanup for external handles | m12-lifecycle |
