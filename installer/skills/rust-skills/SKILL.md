---
name: rust-skills
description: "Top-level Rust Skills router for full runtime installs. Use for Rust questions, cargo/rustc issues, Rust compiler errors, ownership, borrowing, lifetimes, async, Send/Sync, unsafe, FFI, crates, clippy, Cargo.toml, and Rust domain architecture."
allowed-tools: ["Bash", "Read", "Grep", "Glob"]
---

# Rust Skills

This is the single top-level entry for full runtime installs.

Use the `rust-skills` CLI as the executable routing contract:

```bash
rust-skills detect --json "<user prompt>"
rust-skills route --json "<user prompt>"
rust-skills index query <skill-id> --json
```

If `detect` returns `no-op`, do not inject Rust-specific reasoning.

If `route` returns `inject`, load `rust-router` first, then load the matched skill IDs from the route JSON. In full runtime installs, deep skills are stored under the assistant runtime data directory instead of being exposed as top-level skills:

- Codex: `~/.codex/rust-skills/skills/<skill-id>/SKILL.md`
- Claude Code: `~/.claude/rust-skills/skills/<skill-id>/SKILL.md`

When a route includes Layer 1 and Layer 3 skills, trace from language mechanics up to domain constraints, then back down to the concrete Rust design.
