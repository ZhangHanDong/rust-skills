# Rust Skills for OpenAI Codex

## Installation

### Option 1: Copy AGENTS.md (Minimal)

Copy the main agent instructions to your project:

```bash
# From the rust-skills repository
cp AGENTS.md /path/to/your/project/AGENTS.md
```

This is the lightest install path. It gives Codex a useful Rust workflow summary and standalone quick reference, but not the full repository context or the closest Claude parity.

### Option 2: Reference as Submodule

```bash
cd your-project
git submodule add https://github.com/actionbook/rust-skills.git .rust-skills
```

Then reference in your AGENTS.md:

```markdown
# Project Agents

See `.rust-skills/AGENTS.md` for Rust development guidelines.
```

This is the recommended option for the closest behavior parity with Claude Code because Codex can also read:
- the skill files
- the `_meta/` documents
- the rest of the repository guidance

## Behavior Parity With Claude Code

Codex does not support the Claude Code plugin hook flow used by this repository.

To get the closest behavior:
- use `AGENTS.md` as the Codex entry point
- keep the repository available locally if possible so Codex can read the skills and `_meta/` guidance
- if you installed via submodule or local checkout, follow the shared behavior contract in [`_meta/platform-behavior-contract.md`](../_meta/platform-behavior-contract.md)

What parity means here:
- same routing intent
- same negotiation rules
- same domain-aware skill loading
- same `rust-learner` path for live information

What parity does not mean:
- automatic prompt-submit hook injection
- identical runtime tool APIs
- identical enforcement strength
- guaranteed live-data retrieval when the required tools are unavailable

## What's Included

This plugin provides Rust development assistance:

- **rust-router**: Master router for all Rust questions
- **rust-learner**: Rust version and crate information
- **coding-guidelines**: Code style and best practices
- **unsafe-checker**: Unsafe code review and FFI guidance
- **m01-m15**: Meta-question skills for ownership, concurrency, error handling, etc.

## Usage

After installation, Codex should:
- read `AGENTS.md`
- apply the shared workflow described in `AGENTS.md`
- if the repository is available locally, also apply the shared contract from `_meta/platform-behavior-contract.md`
- route Rust prompts through `rust-router` before specialized skills

Then you can ask Codex about:

- Rust ownership and borrowing
- Error handling patterns
- Async/await and concurrency
- Code style and naming conventions
- Unsafe code review

## Requirements

- Rust 1.85+ (edition 2024 recommended)
- Cargo

## Shared Defaults

Use the shared Rust defaults documented in [`_meta/platform-behavior-contract.md`](../_meta/platform-behavior-contract.md#shared-rust-defaults).
