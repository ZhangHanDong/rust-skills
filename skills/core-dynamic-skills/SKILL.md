---
name: core-dynamic-skills
description: "Internal: sync, clean, or update dynamic crate skills. Triggered by slash commands only."
# Command-based tool: keep a low-trigger description for schema validity; operational entrypoints are explicit slash commands.
# Triggered by: /sync-crate-skills, /clean-crate-skills, /update-crate-skill
argument-hint: "[--force] | <crate_name>"
context: fork
agent: general-purpose
---

# Dynamic Skills Manager

> **Version:** 2.1.0 | **Last Updated:** 2025-01-27

Orchestrates on-demand generation of crate-specific skills based on project dependencies.

## Concept

Dynamic skills are:
- Generated locally at `~/.claude/skills/`
- Based on Cargo.toml dependencies
- Created using llms.txt from docs.rs
- Versioned and updatable
- Not committed to the rust-skills repository

## Trigger Scenarios

### Prompt-on-Open

When entering a directory with Cargo.toml:
1. Detect Cargo.toml (single or workspace)
2. Parse dependencies list
3. Check which crates are missing skills
4. If missing: "Found X dependencies without skills. Sync now?"
5. If confirmed: run `/sync-crate-skills`

### Manual Commands

- `/sync-crate-skills` - Sync all dependencies
- `/clean-crate-skills [crate]` - Remove skills
- `/update-crate-skill <crate>` - Update specific skill

## Execution Mode Detection

**CRITICAL: Check if agent and command infrastructure is available.**

Try to read: `../../agents/` directory
Check if `/create-llms-for-skills` and `/create-skills-via-llms` commands work.

---

## Agent Mode (Plugin Install)

**When full plugin infrastructure is available:**

### Architecture

```
Cargo.toml
    ↓
Parse dependencies
    ↓
For each crate:
  ├─ Check ~/.claude/skills/{crate}/
  ├─ If missing: Check actionbook for llms.txt
  │     ├─ Found: /create-skills-via-llms
  │     └─ Not found: /create-llms-for-skills first
  └─ Load skill
```

### Workflow Priority

1. **actionbook MCP** - Check for pre-generated llms.txt
2. **/create-llms-for-skills** - Generate llms.txt from docs.rs
3. **/create-skills-via-llms** - Create skills from llms.txt

### Sync Command

```bash
/sync-crate-skills [--force]
```

1. Parse Cargo.toml for dependencies
2. For each dependency:
   - Check if skill exists at `~/.claude/skills/{crate}/`
   - If missing (or --force): generate skill
3. Report results

---

## Inline Mode (Skills-only Install)

**When agent/command infrastructure is NOT available, execute manually:**

### Step 1: Parse Cargo.toml

```bash
# Read dependencies
cat Cargo.toml | grep -A 100 '\[dependencies\]' | grep -E '^[a-zA-Z]'
```

Or use Read tool to parse Cargo.toml and extract:
- `[dependencies]` section
- `[dev-dependencies]` section (optional)
- Workspace members (if workspace project)

### Step 2: Check Existing Skills

```bash
# List existing skills
ls ~/.claude/skills/
```

Compare with dependencies to find missing skills.

### Step 3: Generate Missing Skills

For each missing crate:

```bash
# 1. Fetch crate documentation
agent-browser open "https://docs.rs/{crate}/latest/{crate}/"
agent-browser get text ".docblock"
# Save content

# 2. Create skill directory
mkdir -p ~/.claude/skills/{crate}
mkdir -p ~/.claude/skills/{crate}/references

# 3. Create SKILL.md
# Use template from rust-skill-creator inline mode

# 4. Create reference files for key modules
agent-browser open "https://docs.rs/{crate}/latest/{crate}/{module}/"
agent-browser get text ".docblock"
# Save to ~/.claude/skills/{crate}/references/{module}.md

agent-browser close
```

**WebFetch fallback:**
```
WebFetch("https://docs.rs/{crate}/latest/{crate}/", "Extract API documentation overview, key types, and usage examples")
```

### Step 4: Workspace Support

For Cargo workspace projects:

```bash
# 1. Parse root Cargo.toml for workspace members
cat Cargo.toml | grep -A 10 '\[workspace\]'

# 2. For each member, parse their Cargo.toml
for member in members; do
  cat ${member}/Cargo.toml | grep -A 100 '\[dependencies\]'
done

# 3. Aggregate and deduplicate dependencies
# 4. Generate skills for missing crates
```

### Clean Command (Inline)

```bash
# Clean specific crate
rm -rf ~/.claude/skills/{crate_name}

# Clean all generated skills
rm -rf ~/.claude/skills/*
```

### Update Command (Inline)

```bash
# Remove old skill
rm -rf ~/.claude/skills/{crate_name}

# Re-generate (same as sync for single crate)
# Follow Step 3 above for the specific crate
```

---

## Local Skills Directory

```
~/.claude/skills/
├── tokio/
│   ├── SKILL.md
│   └── references/
├── serde/
│   ├── SKILL.md
│   └── references/
└── axum/
    ├── SKILL.md
    └── references/
```

---

## Related Commands

- `/sync-crate-skills` - Main sync command
- `/clean-crate-skills` - Cleanup command
- `/update-crate-skill` - Update command
- `/create-llms-for-skills` - Generate llms.txt (Agent Mode only)
- `/create-skills-via-llms` - Create skills from llms.txt (Agent Mode only)

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| Commands not found | Skills-only install | Use inline mode |
| Cargo.toml not found | Not in Rust project | Navigate to project root |
| docs.rs unavailable | Network issue | Retry or skip crate |
| Permission denied | Directory issue | Check ~/.claude/skills/ permissions |
