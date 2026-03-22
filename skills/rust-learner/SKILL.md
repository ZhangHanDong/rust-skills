---
name: rust-learner
description: "Use when asking about Rust versions or crate info. Keywords: latest version, what's new, changelog, Rust 1.x, Rust release, stable, nightly, crate info, crates.io, lib.rs, docs.rs, API documentation, crate features, dependencies, which crate, what version, Rust edition, edition 2021, edition 2024, cargo add, cargo update, 最新版本, 版本号, 稳定版, 最新, 哪个版本, crate 信息, 文档, 依赖, Rust 版本, 新特性, 有什么特性"
allowed-tools: "Task, Read, Glob, mcp__actionbook__*, Bash"
---

# Rust Learner

> **Version:** 2.1.0 | **Last Updated:** 2025-01-27

You are an expert at fetching Rust and crate information. Help users by:
- **Version queries**: Get latest Rust/crate versions
- **API documentation**: Fetch docs from docs.rs
- **Changelog**: Get Rust version features from releases.rs

**Primary skill for fetching Rust/crate information.**

## Execution Mode Detection

**CRITICAL: Check agent file availability first to determine execution mode.**

Try to read the agent file for your query type. The execution mode depends on whether the file exists:

| Query Type | Agent File Path |
|------------|-----------------|
| Crate info/version | `../../agents/crate-researcher.md` |
| Rust version features | `../../agents/rust-changelog.md` |
| Std library docs | `../../agents/std-docs-researcher.md` |
| Third-party crate docs | `../../agents/docs-researcher.md` |
| Clippy lints | `../../agents/clippy-researcher.md` |

---

## Agent Mode (Plugin Install)

**When agent files exist at `../../agents/`:**

### Workflow

1. Read the appropriate agent file (relative to this skill)
2. Launch Task with `run_in_background: true`
3. Continue with other work or wait for completion
4. Summarize results to user

```
Task(
  subagent_type: "general-purpose",
  run_in_background: true,
  prompt: <read from ../../agents/*.md file>
)
```

### Agent Routing Table

| Query Type | Agent File | Source |
|------------|------------|--------|
| Rust version features | `../../agents/rust-changelog.md` | releases.rs |
| Crate info/version | `../../agents/crate-researcher.md` | lib.rs, crates.io |
| **Std library docs** (Send, Sync, Arc, etc.) | `../../agents/std-docs-researcher.md` | doc.rust-lang.org |
| Third-party crate docs (tokio, serde, etc.) | `../../agents/docs-researcher.md` | docs.rs |
| Clippy lints | `../../agents/clippy-researcher.md` | rust-clippy docs |

### Agent Mode Examples

**Crate Version Query:**
```
User: "tokio latest version"

Claude:
1. Read ../../agents/crate-researcher.md
2. Task(subagent_type: "general-purpose", run_in_background: true, prompt: <agent content>)
3. Wait for agent
4. Summarize results
```

**Rust Changelog Query:**
```
User: "What's new in Rust 1.85?"

Claude:
1. Read ../../agents/rust-changelog.md
2. Task(subagent_type: "general-purpose", run_in_background: true, prompt: <agent content>)
3. Wait for agent
4. Summarize features
```

---

## Inline Mode (Skills-only Install)

**When agent files are NOT available, execute directly using these steps:**

### Crate Info Query

```
1. actionbook: mcp__actionbook__search_actions("lib.rs crate info")
2. Get action details: mcp__actionbook__get_action_by_id(<action_id>)
3. agent-browser CLI (or WebFetch fallback):
   - open "https://lib.rs/crates/{crate_name}"
   - get text using selector from actionbook
   - close
4. Parse and format output
```

**Output Format:**
```markdown
## {Crate Name}

**Version:** {latest}
**Description:** {description}

**Features:**
- `feature1`: description

**Links:**
- [docs.rs](https://docs.rs/{crate}) | [crates.io](https://crates.io/crates/{crate}) | [repo]({repo_url})
```

### Rust Version Query

```
1. actionbook: mcp__actionbook__search_actions("releases.rs rust changelog")
2. Get action details for selectors
3. agent-browser CLI (or WebFetch fallback):
   - open "https://releases.rs/docs/1.{version}.0/"
   - get text using selector from actionbook
   - close
4. Parse and format output
```

**Output Format:**
```markdown
## Rust 1.{version}

**Release Date:** {date}

### Language Features
- Feature 1: description
- Feature 2: description

### Library Changes
- std::module: new API

### Stabilized APIs
- `api_name`: description
```

### Std Library Docs (std::*, Send, Sync, Arc, etc.)

```
1. Construct URL: "https://doc.rust-lang.org/std/{path}/"
   - Traits: std/{module}/trait.{Name}.html
   - Structs: std/{module}/struct.{Name}.html
   - Modules: std/{module}/index.html
2. agent-browser CLI (or WebFetch fallback):
   - open <url>
   - get text "main .docblock"
   - close
3. Parse and format output
```

**Common Std Library Paths:**
| Item | Path |
|------|------|
| Send, Sync, Copy, Clone | `std/marker/trait.{Name}.html` |
| Arc, Mutex, RwLock | `std/sync/struct.{Name}.html` |
| Rc, Weak | `std/rc/struct.{Name}.html` |
| RefCell, Cell | `std/cell/struct.{Name}.html` |
| Box | `std/boxed/struct.Box.html` |
| Vec | `std/vec/struct.Vec.html` |
| String | `std/string/struct.String.html` |

**Output Format:**
```markdown
## std::{path}::{Name}

**Signature:**
```rust
{signature}
```

**Description:**
{description}

**Examples:**
```rust
{example_code}
```
```

### Third-Party Crate Docs (tokio, serde, etc.)

```
1. Construct URL: "https://docs.rs/{crate}/latest/{crate}/{path}"
2. agent-browser CLI (or WebFetch fallback):
   - open <url>
   - get text ".docblock"
   - close
3. Parse and format output
```

**Output Format:**
```markdown
## {crate}::{path}

**Signature:**
```rust
{signature}
```

**Description:**
{description}

**Examples:**
```rust
{example_code}
```
```

### Clippy Lints

```
1. agent-browser CLI (or WebFetch fallback):
   - open "https://rust-lang.github.io/rust-clippy/stable/"
   - search for lint name in page
   - get text ".lint-doc" for matching lint
   - close
2. Parse and format output
```

**Output Format:**
```markdown
## Clippy Lint: {lint_name}

**Level:** {warn|deny|allow}
**Category:** {category}

**Description:**
{what_it_checks}

**Example (Bad):**
```rust
{bad_code}
```

**Example (Good):**
```rust
{good_code}
```
```

---

## Tool Chain Priority

Both modes use the same tool chain order:

1. **actionbook MCP** - Get pre-computed selectors first
   - `mcp__actionbook__search_actions("site_name")` → get action ID
   - `mcp__actionbook__get_action_by_id(id)` → get URL + selectors

2. **agent-browser CLI** - Primary execution tool
   ```bash
   agent-browser open <url>
   agent-browser get text <selector_from_actionbook>
   agent-browser close
   ```

3. **WebFetch** - Last resort only if agent-browser unavailable

### Fallback Principle (CRITICAL)

```
actionbook → agent-browser → WebFetch (only if agent-browser unavailable)
```

**DO NOT:**
- Skip agent-browser because it's slower
- Use WebFetch as primary when agent-browser is available
- Block on WebFetch without trying agent-browser first

---

## Deprecated Patterns

| Deprecated | Use Instead | Reason |
|------------|-------------|--------|
| WebSearch for crate info | Task + agent or inline mode | Structured data |
| Direct WebFetch | actionbook + agent-browser | Pre-computed selectors |
| Guessing version numbers | Always fetch from source | Prevents misinformation |

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| Agent file not found | Skills-only install | Use inline mode |
| actionbook unavailable | MCP not configured | Fall back to WebFetch |
| agent-browser not found | CLI not installed | Fall back to WebFetch |
| Agent timeout | Site slow/down | Retry or inform user |
| Empty results | Selector mismatch | Report and use WebFetch fallback |

## Proactive Triggering

This skill triggers AUTOMATICALLY when:
- Any Rust crate name mentioned (tokio, serde, axum, sqlx, etc.)
- Questions about "latest", "new", "version", "changelog"
- API documentation requests
- Dependency/feature questions

**DO NOT use WebSearch for Rust crate info. Use agents or inline mode instead.**
