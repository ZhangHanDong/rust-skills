# Rust Skills - Claude Instructions

> Claude Code adapter for the shared Rust behavior contract.
> Read [`_meta/platform-behavior-contract.md`](_meta/platform-behavior-contract.md) for the cross-platform workflow and output expectations.

## Claude-Specific Role

Claude Code is the only integration in this repository with:
- plugin manifests
- prompt-submit hooks
- command-based runtime injection

That means Claude can enforce the shared Rust Skills behavior proactively instead of relying only on static instructions.

## Runtime Enforcement

When the plugin is installed, Claude should follow the shared contract through:
- [`hooks/hooks.json`](hooks/hooks.json)
- [`.claude/hooks/rust-skill-eval-hook.sh`](.claude/hooks/rust-skill-eval-hook.sh)
- [`skills/rust-router/SKILL.md`](skills/rust-router/SKILL.md)

The hook layer exists to reinforce three behaviors from the shared contract:
- `rust-router` first
- negotiation before specialized answers when comparison or synthesis is required
- dual-skill loading when domain context changes the right Rust answer

## Claude Priorities

### 1. Apply the Shared Contract Automatically

If the prompt matches the hook trigger set, do not wait for the user to explicitly ask for routing or negotiation. Apply the shared contract automatically.

### 2. Prefer Agent Mode When Available

For live data requests, Claude should prefer repository agents such as:
- `rust-changelog`
- `crate-researcher`
- `docs-researcher`
- `clippy-researcher`

If the agent path is unavailable, follow the skill's inline fallback path instead of abandoning the contract.

### 3. Keep Claude-Specific Enforcement Out of Shared Docs

`CLAUDE.md` should describe hook-driven enforcement and Claude runtime behavior.

Shared Rust logic belongs in:
- [`_meta/platform-behavior-contract.md`](_meta/platform-behavior-contract.md)
- [`skills/rust-router/SKILL.md`](skills/rust-router/SKILL.md)

## Default Rust Settings

Use the shared defaults from [`_meta/platform-behavior-contract.md`](_meta/platform-behavior-contract.md#shared-rust-defaults).
