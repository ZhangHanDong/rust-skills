---
name: rust-skill-creator
description: "Use when: creating generated skills for Rust crates, std modules, or Rust documentation URLs. Keywords: create rust skill, create crate skill, create std skill, dynamic rust skill, skill for tokio, skill for serde, skill for axum, generate rust skill, from docs create skill."
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

Check whether related commands and skills are available before choosing the
execution path.

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

---

## Inline Mode (Skills-only Install)

**When the commands above are NOT available, create skills manually:**

Generated skills must follow the skill generation contract:

- English only in generated repo-owned skill text
- concise `Use when:` and `Keywords:` description
- scope, documentation boundary, domain guardrails, and key patterns in
  `SKILL.md`
- long API details in `references/`
- no prompt-like role setup, decorative banner, ASCII art, or exact display
  instruction
- judgment guidance as boundaries and guardrails, not scripted thinking
  prompts
- strict quality gate before accepting output
- no hand patching generated skills to improve benchmark metrics; update the
  generator inputs and regenerate from a clean directory instead
- describe failure modes in the ecosystem's standard terminology (for example
  pointer validity, alignment, lifetimes, deadlock, MSRV, semver) instead of
  inventing synonyms, so readers can map guidance back to compiler and docs
  language

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
description: "Use when: working with {crate_name} APIs or troubleshooting {crate_name}-specific Rust integration. Keywords: {keywords}."
---

# {Crate Name}

> **Version:** {version} | **Source:** docs.rs

## Scope

{Brief description from documentation}

## Documentation

Load these references only when the task needs their detail:

- `./references/overview.md` - Main overview
- `./references/{module}.md` - Module documentation

## Documentation Boundary

If a needed reference file is missing or empty, say the local generated
documentation is incomplete and recommend regenerating the skill.

## Key Types

### {Type1}
{Description and usage}

### {Type2}
{Description and usage}

## Common Patterns

{Usage patterns extracted from documentation}

## Examples

```rust
{Example code from documentation}
```

## Domain Guardrails

- {key design decision or trade-off specific to this crate}
- {known failure mode and how to avoid it}
- {boundary that prevents over-applying this skill}
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
# Check skill structure
ls -la ~/.claude/skills/{crate_name}/
cat ~/.claude/skills/{crate_name}/SKILL.md

# Run the generation quality gate when the rust-skills repository is available
node tests/aom/run-skill-generation-gate.mjs \
  --skills ~/.claude/skills/{crate_name} \
  --strict-generated \
  --json
```

For benchmark work, delete the generated skill directory before regeneration.
Do not edit the generated `SKILL.md` after the fact and then claim generator
quality improved.

---

## URL Construction Helper

| Target | URL Template |
|--------|--------------|
| Crate overview | `https://docs.rs/{crate}/latest/{crate}/` |
| Crate module | `https://docs.rs/{crate}/latest/{crate}/{module}/` |
| Std trait | `https://doc.rust-lang.org/std/{module}/trait.{Name}.html` |
| Std struct | `https://doc.rust-lang.org/std/{module}/struct.{Name}.html` |
| Std module | `https://doc.rust-lang.org/std/{module}/index.html` |

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

### Example 1: Create Crate Skill (Agent Mode)

```
User: "Create a dynamic skill for tokio"

Claude:
1. Identify: Third-party crate "tokio"
2. Execute: /create-llms-for-skills https://docs.rs/tokio/latest/tokio/
3. Wait for llms.txt generation
4. Execute: /create-skills-via-llms tokio ~/tmp/{timestamp}-tokio-llms.txt
```

### Example 2: Create Crate Skill (Inline Mode)

```
User: "Create a dynamic skill for tokio"

Claude:
1. Identify: Third-party crate "tokio"
2. Fetch: agent-browser open "https://docs.rs/tokio/latest/tokio/"
3. Extract documentation
4. Create: ~/.claude/skills/tokio/SKILL.md
5. Create: ~/.claude/skills/tokio/references/
6. Save reference files for key modules (sync, task, runtime, etc.)
```

### Example 3: Create Std Library Skill

```
User: "Create a skill for Send and Sync traits"

Claude:
1. Identify: Std library traits
2. (Agent Mode) Execute: /create-llms-for-skills https://doc.rust-lang.org/std/marker/trait.Send.html https://doc.rust-lang.org/std/marker/trait.Sync.html
   (Inline Mode) Fetch each URL, create skill manually
3. Complete skill creation
```

---

## DO NOT

- Use `best-skill-creator` for Rust-related skill creation
- Guess documentation URLs without verification
- Skip documentation fetching step

## Output Location

All generated skills are saved to: `~/.claude/skills/`

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| Commands not found | Skills-only install | Use inline mode |
| URL not found | Invalid crate/module | Verify crate exists on crates.io |
| Empty documentation | API changed | Use alternative selectors |
| Permission denied | Directory issue | Check ~/.claude/skills/ permissions |
