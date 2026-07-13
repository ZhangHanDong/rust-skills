---
description: Check and fix missing reference files in dynamic skills
argument-hint: "[crate_name] [--check-only] [--remove-invalid]"
---

# Fix Skill Documentation

Check dynamic skills for missing reference files and fix them.

Arguments: $ARGUMENTS
- `crate_name`: Specific crate to check (optional, defaults to all crates in ~/.claude/skills/)
- `--check-only`: Only report issues, don't fix
- `--remove-invalid`: Remove references to non-existent files instead of creating them

---

## Instructions

### 1. Scan Skills Directory

```bash
# If crate_name provided
skill_dir=~/.claude/skills/{crate_name}

# Otherwise scan all
for dir in ~/.claude/skills/*/; do
    # Process each skill
done
```

### 2. Parse SKILL.md for References

For each skill, extract referenced files from:

```markdown
## Documentation

Refer to the local files for detailed documentation:
- `./references/file1.md` - Description
- `./references/file2.md` - Description
```

Also check "Expected reference files" section if present.

### 3. Check File Existence

For each referenced file:
```bash
if [ ! -f "{skill_dir}/references/{filename}" ]; then
    echo "MISSING: {filename}"
fi
```

### 4. Report Status

Output format:
```
=== {crate_name} ===
SKILL.md: ✅
references/:
  - sync.md: ✅
  - time.md: ✅
  - runtime.md: ❌ MISSING
  - io.md: ❌ MISSING

Action needed: 2 files missing
```

### 5. Fix Missing Files

**If --check-only**: Stop here, only report.

**If --remove-invalid**: Update SKILL.md to remove invalid references.

**Otherwise (default)**: Generate missing reference files using agent-browser:

```bash
# For each missing file
agent-browser "Navigate to docs.rs/{crate_name}/latest/{crate_name}/{module}/
Extract documentation for {topic} including:
- API reference
- Code examples
- Common patterns
Save as markdown."

# Save to references/{filename}
```

### 6. Update SKILL.md

After fixing, ensure SKILL.md Documentation section matches actual files:

```markdown
## Documentation

Refer to the local files for detailed documentation:
- `./references/sync.md` - Synchronization primitives
- `./references/time.md` - Time utilities
```

---

## Tool Priority

1. **agent-browser CLI** - Generate missing documentation
2. **WebFetch** - Fallback if agent-browser unavailable
3. **Edit SKILL.md** - Remove invalid references (--remove-invalid mode)

---

## Example Usage

```bash
# Check all skills
/fix-skill-docs --check-only

# Fix specific crate
/fix-skill-docs tokio

# Check specific crate only
/fix-skill-docs tokio --check-only

# Remove invalid references instead of creating files
/fix-skill-docs tokio --remove-invalid

# Fix all skills
/fix-skill-docs
```

---

## Output Example

```
=== Skill Documentation Check ===

tokio:
  SKILL.md: ✅
  references/:
    ✅ sync.md (2.5KB)
    ✅ time.md (2.7KB)
    ❌ runtime.md - MISSING
    ❌ io.md - MISSING
  Status: 2 files missing

tokio-basics:
  SKILL.md: ✅
  references/:
    ✅ runtime-config.md (2.0KB)
    ✅ feature-flags.md (1.5KB)
  Status: Complete ✅

Summary:
- 7 skills checked
- 6 complete
- 1 with missing files

Run `/fix-skill-docs tokio` to fix missing files.
```

---

## Integration

This command complements the skill creation workflow:

1. `/sync-crate-skills` - Create initial skills
2. `/fix-skill-docs` - Verify and fix completeness
3. `/clean-crate-skills` - Remove skills when needed
