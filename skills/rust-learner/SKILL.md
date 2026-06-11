---
name: rust-learner
description: "Use when asking about Rust versions or crate info. Keywords: latest version, what's new, changelog, Rust 1.x, Rust release, stable, nightly, crate info, crates.io, lib.rs, docs.rs, API documentation, crate features, dependencies, which crate, what version, Rust edition, edition 2021, edition 2024, cargo add, cargo update, 最新版本, 版本号, 稳定版, 最新, 哪个版本, crate 信息, 文档, 依赖, Rust 版本, 新特性, 有什么特性"
allowed-tools: ["Task", "Read", "Glob", "mcp__actionbook__*", "Bash", "WebFetch"]
---

# Rust Learner

Fetch live Rust and crate information: versions, changelogs, API docs, clippy
lints. Never guess version numbers; always fetch from a source. Do NOT use
WebSearch for Rust/crate info.

## Mode Detection

If the agent file for your query type (table below, paths relative to this
skill) exists, use Agent Mode; otherwise use Inline Mode.

## Agent Routing Table

| Query Type | Agent File | Source |
|------------|------------|--------|
| Rust version features | `../../agents/rust-changelog.md` | releases.rs |
| Crate info/version | `../../agents/crate-researcher.md` | lib.rs, crates.io |
| Std library docs (Send, Sync, Arc, ...) | `../../agents/std-docs-researcher.md` | doc.rust-lang.org |
| Third-party crate docs (tokio, serde, ...) | `../../agents/docs-researcher.md` | docs.rs |
| Clippy lints | `../../agents/clippy-researcher.md` | rust-clippy docs |

## Agent Mode (Plugin Install)

1. Read the matching agent file.
2. `Task(subagent_type: "general-purpose", prompt: <agent file content>)`.
3. Wait for the result and summarize it for the user.

## Inline Mode (Skills-only Install)

Check actionbook first for pre-computed selectors
(`mcp__actionbook__search_actions(...)` then
`mcp__actionbook__get_action_by_id(id)`), then fetch with the agent-browser
CLI (`agent-browser open <url>`, `agent-browser get text <selector>`,
`agent-browser close`).

| Query Type | URL Pattern | Selector |
|------------|-------------|----------|
| Crate info/version | `https://lib.rs/crates/{crate}` | from actionbook |
| Rust version features | `https://releases.rs/docs/1.{minor}.0/` | from actionbook |
| Std trait docs | `https://doc.rust-lang.org/std/{module}/trait.{Name}.html` | `main .docblock` |
| Std struct docs | `https://doc.rust-lang.org/std/{module}/struct.{Name}.html` | `main .docblock` |
| Std module docs | `https://doc.rust-lang.org/std/{module}/index.html` | `main .docblock` |
| Crate docs | `https://docs.rs/{crate}/latest/{crate}/{path}` | `.docblock` |
| Clippy lint | `https://rust-lang.github.io/rust-clippy/stable/` | `.lint-doc` (search lint name in page) |

Common std paths: `Send`/`Sync`/`Copy`/`Clone` live in `std/marker`;
`Arc`/`Mutex`/`RwLock` in `std/sync`; `Rc`/`Weak` in `std/rc`;
`RefCell`/`Cell` in `std/cell`; `Box` in `std/boxed`; `Vec` in `std/vec`;
`String` in `std/string`.

Output: state the version/signature/description plus relevant features or
stabilized APIs, and link the source (docs.rs, crates.io, releases.rs).
No fixed template required.

## Fallback Chain

`actionbook -> agent-browser -> WebFetch`. Do not skip agent-browser because
it is slower, and do not use WebFetch as the primary tool. If actionbook is
unconfigured or a selector returns empty, fall back one step and report it.
If every tool fails, say so instead of guessing a version.
