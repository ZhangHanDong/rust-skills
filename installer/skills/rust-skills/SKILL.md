---
name: rust-skills
description: "Top-level Rust Skills router for full runtime installs. Use when: Rust code, cargo/rustc errors, Rust toolchain setup, and rust-skills install/config/verify. Keywords: Rust, Cargo, rustup, rust-skills."
allowed-tools: ["Bash", "Read", "Grep", "Glob"]
---

# Rust Skills

This is the single top-level entry for full runtime installs.

If prompt context already contains `RUST SKILLS AUTO ROUTE`, use that matched
skill list directly and read the listed skill files from the runtime root.
No extra route command is needed.

Use the native Rust `rust-skills` CLI as the executable routing contract.
`rust-skills route --json` is the primary command:

```bash
rust-skills route --json "<user prompt>"
rust-skills index query <skill-id> --json
rust-skills verify --json
```

(`rust-skills detect` still works but is a deprecated alias of `route`.)

In full installs the UserPromptSubmit hook invokes the native binary directly
(`rust-skills hook <claude|codex>`, ~10ms per prompt). Gating happens inside
the binary: it emits nothing for non-Rust prompts and injects context only
when the route decision is `should_inject: true`.
`rust-skills route --json` is the source of truth. Do not inject Rust-specific
reasoning unless the route JSON returns `should_inject: true`.

If `route` returns `no-op`, do not inject Rust-specific reasoning.

If no auto route is present and `route` returns `inject`, load `rust-router`
first, then load the matched skill IDs from the route JSON. In full runtime
installs, deep skills are stored under the assistant runtime data directory
instead of being exposed as top-level skills:

- Codex: `~/.codex/rust-skills/skills/<skill-id>/SKILL.md`
- Claude Code: `~/.claude/rust-skills/skills/<skill-id>/SKILL.md`

When a route includes Layer 1 and Layer 3 skills, keep both Rust mechanics and
domain constraints in view.

Set `RUST_SKILLS_DEBUG=1` when diagnosing hook discovery or runtime failures.
Hooks then include the full route JSON in addition to the compact auto route.

## Install and Environment Configuration

Use this section when the user asks to install, reinstall, configure, verify,
or diagnose rust-skills itself.

`install.js` is NOT part of this installed layout. All `node install.js ...`
commands below must run from the original rust-skills checkout (git clone):

```bash
git clone https://github.com/actionbook/rust-skills.git
cd rust-skills
```

Primary local runtime install (from that checkout):

```bash
node install.js --codex --claude
rust-skills verify --json
```

Preview before writing:

```bash
node install.js --codex --claude --dry-run
```

Target selection:

```bash
node install.js --codex
node install.js --claude
node install.js --all
node install.js --codex --codex-dir /path/to/codex-home
node install.js --claude --claude-dir /path/to/claude-home
node install.js --codex --home /path/to/user-home
```

Optional behavior:

```bash
node install.js --codex --no-hooks
node install.js --codex --no-user-bin
node install.js --codex --prune-legacy-top-level-skills
node install.js --codex --legacy-top-level-skills
```

`--no-hooks` still copies the runtime CLI and hook files; it only skips merging
Codex/Claude hook settings. Prefer the default single-entry layout. Use
`--legacy-top-level-skills` only when an older top-level deep-skill layout is
required for compatibility.

Runtime selector environment:

```bash
RUST_SKILLS_PROFILE=codex rust-skills verify --json
RUST_SKILLS_PROFILE=claude rust-skills verify --json
RUST_SKILLS_ROOT=/path/to/runtime rust-skills route --json "Rust E0382"
RUST_SKILLS_BIN=/path/to/rust-skills rust-skills verify --json
RUST_SKILLS_DEBUG=1 rust-skills route --json "cargo clippy warning"
```

Post-install checks:

```bash
rust-skills route --json "今天天气怎么样"
rust-skills route --json "Rust Web API Rc cannot be sent between threads"
rust-skills index query rust-router --json
```

The installer keeps one top-level skill by default and stores deep skills under
`~/.codex/rust-skills/skills/` or `~/.claude/rust-skills/skills/`. It does not
overwrite global `AGENTS.md`, Claude `agents/`, or Claude `commands/`.
