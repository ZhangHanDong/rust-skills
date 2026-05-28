---
name: rust-env-setup
description: "Use when setting up Rust toolchains, Cargo, rustup components, rust-analyzer, or rust-skills runtimes. Keywords: install Rust, setup Rust, rustup, Cargo setup, CARGO_HOME, rustfmt, clippy, rust-analyzer, rust-skills install, Codex, Claude Code."
globs: ["**/Cargo.toml"]
user-invocable: false
---

# Rust Environment Setup

## Scope

Use for environment and runtime setup, not ordinary Rust code design.

| Request Shape | Setup Surface |
|---------------|---------------|
| Install or update Rust | rustup, stable toolchain, PATH |
| Configure Cargo | `CARGO_HOME`, registry, proxy, target dir |
| Add quality components | rustfmt, clippy, rust-src, rust-analyzer |
| Install rust-skills | Codex or Claude Code runtime, hooks, selector shim |
| Diagnose install state | versions, runtime root, route and verify commands |

## Calibration Anchors

- Toolchain setup: rustup, stable toolchain, host triple, PATH, shell profile.
- Cargo setup: `CARGO_HOME`, `.cargo/config.toml`, registry, proxy, offline
  mode, and target directory.
- Quality components: rustfmt, clippy, rust-src, rust-analyzer.
- Project check: `cargo fmt --check`, `cargo clippy`, `cargo test`.
- rust-skills runtime: Codex target, Claude Code target, runtime root, hooks,
  selector shim, and `rust-skills verify --json`.

## Boundary

| Topic | Route Elsewhere |
|-------|-----------------|
| Borrow checker or compiler errors | m01-m07 language skills |
| Crate selection or feature flags | m11-ecosystem |
| CLI application behavior | domain-cli |
| Generated crate skills | rust-skill-creator or core-dynamic-skills |

## Local Checks

```bash
rustc --version
cargo --version
rustup show
rustup component list --installed
cargo fmt --check
cargo clippy --workspace --all-targets
```

For rust-skills runtime checks:

```bash
rust-skills verify --json
rust-skills route --json "Rust E0382 value moved"
rust-skills index query rust-router --json
```

## Install Shape

| Target | Command Shape |
|--------|---------------|
| Codex runtime | `node install.js --codex` |
| Claude Code runtime | `node install.js --claude` |
| Both runtimes | `node install.js --codex --claude` |
| Preview | `node install.js --codex --claude --dry-run` |
| Selector | `RUST_SKILLS_PROFILE=codex rust-skills verify --json` |
