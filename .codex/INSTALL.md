# Rust Skills for OpenAI Codex

## Installation

### Option 1: Full Local Runtime

This installs one top-level Codex skill plus the local router CLI and hook. It
does not require Rust/Cargo; Node 18+ is enough.

The hook is a two-stage guard: the hook starts the router, and the router must
return `should_inject: true` from `route --json` before Rust context is injected.

```bash
git clone https://github.com/actionbook/rust-skills.git
cd rust-skills
node install.js --codex

rust-skills route --json "Rust E0382 value moved"
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

## Requirements

- Node 18+ for the installer and local runtime.
- Rust/Cargo are not required to install Rust Skills.
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
