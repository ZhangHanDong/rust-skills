# Rust Skills for OpenAI Codex

## Installation

### Option 1: Full Local Runtime

This installs one top-level Codex skill plus the native Rust CLI router and hook.
Node 18+ is required. Rust/Cargo is required when installing from source without
a prebuilt or already-built native CLI.

Full installs wire the UserPromptSubmit hook directly to the native binary —
`<targetRoot>/bin/rust-skills hook codex` (~10ms per prompt). Gating happens
inside the binary: it emits nothing for non-Rust prompts and injects context
only when the route decision is `should_inject: true`. There is no separate
hook-level matcher; the node hook script remains only as a repo-checkout/
plugin-layout fallback.
Matched Rust prompts receive a compact `RUST SKILLS AUTO ROUTE` section with
skill IDs and runtime file paths. Set `RUST_SKILLS_DEBUG=1` only when you need
the full route JSON.

```bash
git clone https://github.com/actionbook/rust-skills.git
cd rust-skills
node install.js --codex

rust-skills route --json "Rust E0382 value moved"
```

If `rust-skills` is not found after install, ensure `~/.local/bin` is on your
PATH (`export PATH="$HOME/.local/bin:$PATH"`) or call the shim by absolute
path (`~/.local/bin/rust-skills`).

For a non-writing preview:

```bash
node install.js --codex --dry-run
```

Installed layout:

- `~/.codex/skills/rust-skills/SKILL.md`
- `~/.codex/rust-skills/skills/<skill-id>/SKILL.md`
- `~/.codex/hooks/rust-skill-router-hook.js`
- `~/.codex/bin/rust-skills`
- `~/.local/bin/rust-skills` shim, unless `--no-user-bin` is used

The installer does not overwrite global `AGENTS.md`. Use `--dry-run` to preview
actions without writing files. Legacy top-level deep skills are not moved into
a backup folder unless `--prune-legacy-top-level-skills` is passed.

Useful configuration knobs:

```bash
node install.js --all
node install.js --codex
node install.js --claude
node install.js --codex --codex-dir /path/to/codex-home
node install.js --claude --claude-dir /path/to/claude-home
node install.js --codex --home /path/to/user-home
node install.js --codex --no-hooks
node install.js --codex --no-user-bin
node install.js --codex --prune-legacy-top-level-skills
node install.js --codex --legacy-top-level-skills

RUST_SKILLS_PROFILE=codex rust-skills verify --json
RUST_SKILLS_ROOT=/path/to/runtime rust-skills route --json "Rust E0382"
RUST_SKILLS_DEBUG=1 rust-skills route --json "cargo clippy warning"
```

`--no-hooks` still copies the runtime CLI and hook files; it only skips merging
Codex hook settings. `--legacy-top-level-skills` keeps the older full top-level
skill layout for compatibility. The default local runtime layout exposes one
top-level `rust-skills` skill and stores deep skills under runtime data.

The installer writes the current Codex feature flag:

```toml
[features]
hooks = true
```

It removes the deprecated `[features].codex_hooks` key if present.

### Option 2: Copy AGENTS.md

Copy the main agent instructions to your project:

```bash
# From the rust-skills repository
cp AGENTS.md /path/to/your/project/AGENTS.md
```

### Option 3: Reference as Submodule

```bash
cd your-project
git submodule add https://github.com/actionbook/rust-skills.git .rust-skills
```

Then reference in your AGENTS.md:

```markdown
# Project Agents

See `.rust-skills/AGENTS.md` for Rust development guidelines.
```

## What's Included

This plugin provides Rust development assistance:

- **rust-router**: Master router for all Rust questions
- **rust-learner**: Rust version and crate information
- **rust-env-setup**: Rust toolchain, Cargo, and rust-skills runtime setup
- **coding-guidelines**: Code style and best practices
- **unsafe-checker**: Unsafe code review and FFI guidance
- **m01-m15**: Meta-question skills for ownership, concurrency, error handling, etc.

## Usage

After installation, ask Codex about:

- Rust ownership and borrowing
- Error handling patterns
- Async/await and concurrency
- Code style and naming conventions
- Unsafe code review

## Verification

Run these after installation or environment changes:

```bash
rust-skills verify --json
rust-skills route --json "今天天气怎么样"
rust-skills route --json "Rust Web API Rc cannot be sent between threads"
```

## Requirements

- Node 18+ for the installer and local runtime.
- Rust/Cargo when the installer must build the native CLI from source.
- Rust 1.85+ and Cargo are recommended for Rust projects that use the guidance below.

## Default Project Settings

When creating Rust projects, use:

```toml
[package]
edition = "2024"
rust-version = "1.85"

[lints.rust]
unsafe_code = "warn"

[lints.clippy]
all = "warn"
pedantic = "warn"
```
