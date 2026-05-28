---
name: core-fix-skill-docs
description: "Internal maintenance support for checking and fixing generated Rust skill documentation references. Use when explicitly invoked by /fix-skill-docs. Keywords: Rust skill docs, generated references, fix skill docs."
user-invocable: false
disable-model-invocation: true
argument-hint: "[crate_name] [--check-only]"
context: fork
agent: general-purpose
---

# Fix Skill Documentation

> **Version:** 2.1.0 | **Last Updated:** 2025-01-27

Check and fix missing reference files in dynamic skills.

## Usage

```
/fix-skill-docs [crate_name] [--check-only] [--remove-invalid]
```

**Arguments:**
- `crate_name`: Specific crate to check (optional, defaults to all)
- `--check-only`: Only report issues, don't fix
- `--remove-invalid`: Remove invalid references instead of creating files

## Execution Mode Detection

Check whether agent infrastructure is available before selecting execution mode.

This skill can run in two modes:
- **Agent Mode**: Uses background agents for documentation fetching
- **Inline Mode**: Executes directly using agent-browser CLI or WebFetch

---

## Agent Mode (Plugin Install)

**When agent infrastructure is available, use background agents for fetching:**

### Instructions

#### 1. Scan Skills Directory

```bash
# If crate_name provided
skill_dir=~/.claude/skills/{crate_name}

# Otherwise scan all
for dir in ~/.claude/skills/*/; do
    # Process each skill
done
```

#### 2. Parse SKILL.md for References

Extract referenced files from Documentation section:

```markdown
## Documentation
- `./references/file1.md` - Description
```

#### 3. Check File Existence

```bash
if [ ! -f "{skill_dir}/references/{filename}" ]; then
    echo "MISSING: {filename}"
fi
```

#### 4. Report Status

```
=== {crate_name} ===
SKILL.md: OK
references/:
  - sync.md: OK
  - runtime.md: MISSING

Action needed: 1 file missing
```

#### 5. Fix Missing Files (Agent Mode)

Launch background agent to fetch documentation:

```
Task(
  subagent_type: "general-purpose",
  run_in_background: true,
  prompt: "Fetch documentation for {crate_name}/{module} from docs.rs.
           Use agent-browser CLI to navigate to https://docs.rs/{crate_name}/latest/{crate_name}/{module}/
           Extract the main documentation and save to ~/.claude/skills/{crate_name}/references/{module}.md"
)
```

---

## Inline Mode (Skills-only Install)

**When agent infrastructure is NOT available, execute directly:**

### Step 1: Scan Skills Directory

```bash
# List all skills
ls ~/.claude/skills/

# Or check specific skill
ls ~/.claude/skills/{crate_name}/
```

### Step 2: Parse SKILL.md for References

Read SKILL.md and extract all `./references/*.md` patterns:

```bash
# Using Read tool
Read("~/.claude/skills/{crate_name}/SKILL.md")

# Look for lines like:
# - `./references/sync.md` - Sync primitives
# - `./references/runtime.md` - Runtime configuration
```

### Step 3: Check File Existence

```bash
# Check each referenced file
for ref in references; do
  if [ ! -f "~/.claude/skills/{crate_name}/references/${ref}.md" ]; then
    echo "MISSING: ${ref}.md"
  fi
done
```

### Step 4: Report Status

Output format:
```
=== {crate_name} ===
SKILL.md: OK
references/:
  - sync.md: OK
  - runtime.md: MISSING

Action needed: 1 file missing
```

### Step 5: Fix Missing Files (Inline)

For each missing file:

**Using agent-browser CLI:**
```bash
agent-browser open "https://docs.rs/{crate_name}/latest/{crate_name}/{module}/"
agent-browser get text ".docblock"
# Save output to ~/.claude/skills/{crate_name}/references/{module}.md
agent-browser close
```

**Using WebFetch fallback:**
```
WebFetch("https://docs.rs/{crate_name}/latest/{crate_name}/{module}/",
         "Extract the main documentation content for this module")
```

Then write the content:
```bash
Write("~/.claude/skills/{crate_name}/references/{module}.md", <fetched_content>)
```

### Step 6: Update SKILL.md (if --remove-invalid)

If `--remove-invalid` flag is set and file cannot be fetched:

```bash
# Read current SKILL.md
Read("~/.claude/skills/{crate_name}/SKILL.md")

# Remove the invalid reference line
Edit("~/.claude/skills/{crate_name}/SKILL.md",
     old_string="- `./references/{invalid_file}.md` - Description",
     new_string="")
```

---

## Tool Priority

1. **agent-browser CLI** - Primary tool for fetching documentation
2. **WebFetch** - Fallback if agent-browser unavailable
3. **Edit SKILL.md** - For removing invalid references (--remove-invalid only)

---

## Examples

### Check All Skills (--check-only)

```bash
/fix-skill-docs --check-only

# Output:
=== tokio ===
SKILL.md: OK
references/:
  - sync.md: OK
  - runtime.md: MISSING
  - task.md: OK

=== serde ===
SKILL.md: OK
references/:
  - derive.md: OK

Summary: 1 file missing in 1 skill
```

### Fix Specific Crate

```bash
/fix-skill-docs tokio

# Fetches missing runtime.md from docs.rs
# Reports success
```

### Remove Invalid References

```bash
/fix-skill-docs tokio --remove-invalid

# If runtime.md cannot be fetched:
# Removes reference from SKILL.md instead
```

---

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| Agent not available | Skills-only install | Use inline mode |
| Skills directory empty | No skills installed | Run /sync-crate-skills first |
| docs.rs unavailable | Network issue | Retry or use --remove-invalid |
| Permission denied | Directory issue | Check ~/.claude/skills/ permissions |
| Invalid SKILL.md format | Corrupted skill | Re-generate skill |
