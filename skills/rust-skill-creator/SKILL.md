---
name: rust-skill-creator
description: "Use when creating skills for Rust crates or std library documentation. Keywords: create rust skill, create crate skill, create std skill, 创建 rust skill, 创建 crate skill, 创建 std skill, 动态 rust skill, 动态 crate skill, skill for tokio, skill for serde, skill for axum, generate rust skill, rust 技能, crate 技能, 从文档创建skill, from docs create skill"
argument-hint: "<crate_name|std::module>"
context: fork
agent: general-purpose
---

# Rust Skill Creator

> **Version:** 2.1.0 | **Last Updated:** 2025-01-27
>
> Create dynamic skills for Rust crates and std library documentation.

## When to Use

This skill handles requests to create skills for:
- Third-party crates (tokio, serde, axum, etc.)
- Rust standard library (std::sync, std::marker, etc.)
- Any Rust documentation URL

## Execution Mode Detection

**CRITICAL: Check if related commands/skills are available.**

This skill relies on:
- `/create-llms-for-skills` command
- `/create-skills-via-llms` command

---

## Agent Mode (Plugin Install)

**When the commands above are available (full plugin installation):**

### Workflow

#### 1. Identify the Target

| User Request | Target Type | URL Pattern |
|--------------|-------------|-------------|
| "create tokio skill" | Third-party crate | `docs.rs/tokio/latest/tokio/` |
| "create Send trait skill" | Std library | `doc.rust-lang.org/std/marker/trait.Send.html` |
| "create skill from URL" + URL | Custom URL | User-provided URL |

#### 2. Execute the Command

Use the `/create-llms-for-skills` command:

```
/create-llms-for-skills <url> [requirements]
```

**Examples:**

```bash
# For third-party crate
/create-llms-for-skills https://docs.rs/tokio/latest/tokio/

# For std library
/create-llms-for-skills https://doc.rust-lang.org/std/marker/trait.Send.html

# With specific requirements
/create-llms-for-skills https://docs.rs/axum/latest/axum/ "Focus on routing and extractors"
```

#### 3. Follow-up with Skill Creation

After llms.txt is generated, use:

```
/create-skills-via-llms <crate_name> <llms_path> [version]
```

#### 4. Validate Output

- Confirm `~/.claude/skills/{crate_name}/SKILL.md` exists and contains non-empty content
- Verify reference files were created under `references/`
- Check that key types and examples are present in the generated skill

---

## Inline Mode (Skills-only Install)

**When the commands above are NOT available, create skills manually:**

### Step 1: Identify Target and Construct URL

| Target | URL Template |
|--------|--------------|
| Crate overview | `https://docs.rs/{crate}/latest/{crate}/` |
| Crate module | `https://docs.rs/{crate}/latest/{crate}/{module}/` |
| Std trait | `https://doc.rust-lang.org/std/{module}/trait.{Name}.html` |
| Std struct | `https://doc.rust-lang.org/std/{module}/struct.{Name}.html` |
| Std module | `https://doc.rust-lang.org/std/{module}/index.html` |

### Step 2: Fetch Documentation

```bash
# Using agent-browser CLI
agent-browser open "<documentation_url>"
agent-browser get text ".docblock"
agent-browser close
```

**Or with WebFetch fallback:**
```
WebFetch("<documentation_url>", "Extract API documentation including types, functions, and examples")
```

### Step 3: Create Skill Directory

```bash
mkdir -p ~/.claude/skills/{crate_name}
mkdir -p ~/.claude/skills/{crate_name}/references
```

### Step 4: Generate SKILL.md

Create `~/.claude/skills/{crate_name}/SKILL.md` with this template:

```markdown
---
name: {crate_name}
description: "Documentation for {crate_name} crate. Keywords: {keywords}"
---

# {Crate Name}

> **Version:** {version} | **Source:** docs.rs

## Overview

{Brief description from documentation}

## Key Types

### {Type1}
{Description and usage}

### {Type2}
{Description and usage}

## Common Patterns

{Usage patterns extracted from documentation}

## Examples

```rust
// Include real, compilable examples from the crate documentation.
// For example, for the `serde` crate:
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Debug)]
struct Point {
    x: i32,
    y: i32,
}

let point = Point { x: 1, y: 2 };
let serialized = serde_json::to_string(&point).unwrap();
println!("serialized = {}", serialized);
```

## Documentation

- `./references/overview.md` - Main overview
- `./references/{module}.md` - Module documentation

## Links

- [docs.rs](https://docs.rs/{crate})
- [crates.io](https://crates.io/crates/{crate})
```

### Step 5: Generate Reference Files

For each major module or type, create a reference file:

```bash
# Fetch and save module documentation
agent-browser open "https://docs.rs/{crate}/latest/{crate}/{module}/"
agent-browser get text ".docblock" > ~/.claude/skills/{crate_name}/references/{module}.md
agent-browser close
```

### Step 6: Verify Skill

```bash
# Check skill structure — must have SKILL.md and at least one reference file
ls -la ~/.claude/skills/{crate_name}/
ls -la ~/.claude/skills/{crate_name}/references/
# Verify SKILL.md has frontmatter, overview, examples, and links sections
head -30 ~/.claude/skills/{crate_name}/SKILL.md
```

**Validation checklist:**
- [ ] SKILL.md has valid YAML frontmatter with `name`, `description`, and keywords
- [ ] At least one reference file exists under `references/`
- [ ] Examples section contains compilable Rust code (not pseudocode)
- [ ] Links point to valid docs.rs or doc.rust-lang.org URLs

---

## Common Std Library Paths

| Item | Path |
|------|------|
| Send, Sync, Copy, Clone | `std/marker/trait.{Name}.html` |
| Arc, Mutex, RwLock | `std/sync/struct.{Name}.html` |
| Rc, Weak | `std/rc/struct.{Name}.html` |
| RefCell, Cell | `std/cell/struct.{Name}.html` |
| Box | `std/boxed/struct.Box.html` |
| Vec | `std/vec/struct.Vec.html` |
| String | `std/string/struct.String.html` |
| Option | `std/option/enum.Option.html` |
| Result | `std/result/enum.Result.html` |

---

## Example Interactions

### Example 1: Third-party Crate (Agent Mode)

**Input:** "Create a dynamic skill for tokio"

```bash
# 1. Generate llms.txt from docs
/create-llms-for-skills https://docs.rs/tokio/latest/tokio/
# 2. Create skill from generated llms.txt
/create-skills-via-llms tokio ~/tmp/1706000000-tokio-llms.txt
# 3. Verify
ls ~/.claude/skills/tokio/SKILL.md ~/.claude/skills/tokio/references/
```

### Example 2: Third-party Crate (Inline Mode)

**Input:** "Create a dynamic skill for serde"

```bash
# 1. Fetch documentation
agent-browser open "https://docs.rs/serde/latest/serde/"
agent-browser get text ".docblock"
# 2. Create directory structure
mkdir -p ~/.claude/skills/serde/references
# 3. Write SKILL.md with extracted types, traits (Serialize, Deserialize), and examples
# 4. Fetch module docs for reference files
agent-browser open "https://docs.rs/serde/latest/serde/ser/"
agent-browser get text ".docblock" > ~/.claude/skills/serde/references/ser.md
```

### Example 3: Std Library Skill

**Input:** "Create a skill for Send and Sync traits"

```bash
# Agent Mode
/create-llms-for-skills https://doc.rust-lang.org/std/marker/trait.Send.html https://doc.rust-lang.org/std/marker/trait.Sync.html

# Inline Mode — fetch each trait page separately
agent-browser open "https://doc.rust-lang.org/std/marker/trait.Send.html"
agent-browser get text ".docblock"
agent-browser open "https://doc.rust-lang.org/std/marker/trait.Sync.html"
agent-browser get text ".docblock"
# Then create ~/.claude/skills/std-marker/SKILL.md covering both traits
```

---

## Constraints

- Do NOT use `best-skill-creator` for Rust-related skill creation — always use this skill
- Do NOT guess documentation URLs — verify the crate exists on crates.io or doc.rust-lang.org first
- Do NOT skip documentation fetching — generated skills must be grounded in real API docs
- Do NOT include pseudocode in generated skills — all code examples must be compilable Rust

## Output Location

All generated skills are saved to: `~/.claude/skills/`

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| Commands not found | Skills-only install | Use inline mode |
| URL not found | Invalid crate/module | Verify crate exists on crates.io |
| Empty documentation | API changed | Use alternative selectors |
| Permission denied | Directory issue | Check ~/.claude/skills/ permissions |
