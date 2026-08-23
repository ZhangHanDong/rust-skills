---
name: rust-deps-visualizer
description: "Use when: inspecting Rust dependency trees. Keywords: /deps-viz, dependency graph, show dependencies, visualize deps, duplicate dependencies, why is this dependency here, cargo tree, 依赖图, 依赖可视化, 显示依赖"
argument-hint: "[--depth N] [--features]"
allowed-tools: ["Bash", "Read", "Glob"]
---

# Rust Dependencies Visualizer

`cargo tree` already prints the tree — run it and show its output. Do not
hand-draw dependency diagrams, hand-format box art, or invent per-crate sizes.

## Recipe Card (all verified)

| Question | Command |
|----------|---------|
| Dependency tree, shallow | `cargo tree --depth 2` |
| Direct deps only | `cargo tree --depth 1` |
| Why is crate X in my build? | `cargo tree -i X` (inverted: paths from X up to your crate) |
| Duplicate versions | `cargo tree -d` |
| Enabled features per crate | `cargo tree --format "{p} {f}"` |
| Feature-edge detail | `cargo tree -e features` |
| Exclude dev-dependencies | `cargo tree -e no-dev` |
| Machine-readable graph | `cargo metadata --format-version=1` |

Pitfall: `--features X` ENABLES feature X (it changes resolution); it does
not display features. To display features use `--format "{p} {f}"` or
`-e features`.

## Interpreting Output

- `(*)` marks a subtree already printed above — deduplicated, not missing.
- Two versions of the same crate in `cargo tree -d` output mean doubled
  compile time and, for semver-incompatible majors, confusing E0277 errors
  where a trait appears not to implement itself. Fix by aligning the version
  in Cargo.toml or `cargo update <crate> --precise <version>`.
- `(proc-macro)` deps build for the host and do not ship in your binary.

Binary-size questions need `cargo bloat` (separate install:
`cargo install cargo-bloat`); `cargo tree` knows nothing about sizes.

## Related Skills

| When | See |
|------|-----|
| Crate selection, feature flags, workspaces | m11-ecosystem |
| Latest crate versions | rust-learner |
