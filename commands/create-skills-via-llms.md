---
description: Create high-quality Rust crate skills from llms.txt
argument-hint: <crate_name> <llms_path> [version] [description]
---

Create high-quality skills for a Rust crate based on llms.txt documentation.

Arguments: $ARGUMENTS
- First argument: crate_name (required) - the Rust crate name (e.g., tokio, serde)
- Second argument: llms_path (required) - local path to the llms.txt file
- Third argument: version (optional) - the crate version (e.g., "1.40.0", "2.0.0")
- Fourth argument: description (optional) - additional requirements or information

---

## Task: Create {crate_name} Skills

**llms.txt file location**: {llms_path}

---

## Generation Contract

Generated skills follow the skill generation contract:

- English only for generated repo-owned skill text.
- Concise frontmatter; no trigger inflation.
- `SKILL.md` carries scope, workflow, boundaries, and calibration anchors.
- No decorative banners, ASCII art, or exact display/output instructions.
- Judgment guidance uses boundaries and calibration anchors, not scripted
  chain-of-thought or step-by-step thinking prompts.
- Detailed API tables, long examples, and version notes go in `references/`.
- Templates go in `assets/`; deterministic helpers go in `scripts/`.
- The generated skill must pass the skill generation quality gate:
  `node tests/aom/run-skill-generation-gate.mjs --skills <generated-dir> --strict-generated --json`
- Machine-readable contract overlays live in
  `commands/skill-generation-contract.json` for benchmark regeneration roots.
- Benchmark improvements must come from this contract and generated output,
  not from hand-editing generated leaf skills after the run.

Select calibration anchors that match the crate documentation and user need.
Do not paste every anchor into every generated skill.

| Anchor Family | Use when documentation mentions |
|---------------|----------------------------------|
| Ownership transfer | moved values, builders, consuming APIs, cloning, borrowed views |
| Borrow conflicts | split borrows, mutable access, scoped reads, locks |
| Trait bounds | `Send`, `Sync`, blanket impls, async spawn, thread safety |
| Type inference | generic constructors, `collect`, `parse`, channels, turbofish |
| Error boundaries | `Result`, custom errors, `thiserror`, application/library split |
| API evolution | MSRV, semver, stabilization, deprecation, release notes |
| Unsafe/FFI | stable terms `pointer`, `length`, `alignment`, `lifetime`; `len` identifiers map to the length invariant; initialization, aliasing, allocation bounds, caller contract |
| Embedded/no_std | embedded Rust, heapless storage, allocation boundary, no allocation, fixed-capacity buffers |

### Generated Artifact Boundary

When improving benchmark performance, do not patch generated `skills/m*`,
`skills/domain-*`, `skills/unsafe-checker`, or dynamic crate skills directly.
Update this generation contract or the generation inputs, then delete the
generated output directory and run generation again. A regenerated skill should
make the desired calibration emerge naturally from its anchors.

## Skill Quality Standards

Each generated skill must include the following structure:

### SKILL.md Structure

````markdown
---
name: {crate_name}-{feature}
description: |
  Use when: working with {crate_name} {feature} APIs or troubleshooting
  {feature}-specific Rust integration. Keywords: {keyword1}, {keyword2},
  {keyword3}, "{common question}".
---

# {CrateName} {Feature} Skill

> **Version:** {crate_name} {version} | **Last Updated:** {YYYY-MM-DD}
>
> Check for updates: https://crates.io/crates/{crate_name}

## Scope

Use this skill for {crate_name} {feature} work when the task depends on
crate-specific APIs, configuration, features, or failure modes.

## Documentation

Load these local files only when the task needs their detail:
- `./references/{file1}.md` - {description}
- `./references/{file2}.md` - {description}

## Documentation Boundary

If the needed reference file is missing or empty, say that the local generated
documentation is incomplete and recommend regenerating with
`/sync-crate-skills {crate_name} --force`. Still answer from this skill and
general Rust knowledge when safe.

## Calibration Anchors

- {anchor 1}
- {anchor 2}
- {anchor 3}
- {boundary that prevents over-applying this skill}

## Key Patterns

{Core code patterns, 2-4 most commonly used patterns}

## API Reference Table

| Function/Type | Description | Example |
|---------------|-------------|---------|
| ... | ... | ... |

## Deprecated Patterns (Don't Use)

| Deprecated | Correct | Notes |
|------------|---------|-------|
| ... | ... | ... |

## When Writing Code

1. {Best practice 1}
2. {Best practice 2}
3. Prefer examples that compile with the documented crate version.
````

### References Directory

Each skill's `references/` directory contains detailed documentation:
- API reference documentation
- Configuration options details
- Advanced usage examples
- Feature-specific configurations

---

## Instructions

### 1. Read llms.txt and Analyze

1. **Read the entire llms.txt** content
2. **Identify content domains**: Find functional modules that can be separate skills
3. **Analyze each domain**:
   - What are the core concepts?
   - What APIs/configuration options exist?
   - What are common usage patterns?
   - What content needs detailed documentation?

### 1.5 Confirm Version Number

If the user did not provide a version number (third argument):
1. Use the AskUserQuestion tool to ask the user for the current version
2. Version format examples: "1.40.0", "2.0.0", "latest"
3. Use the version number for all SKILL.md Version fields

### 2. Output Detailed Plan

Output to `~/tmp/{YYYYMMDDHHmm}-{crate_name}-skills-plan.md`:

````markdown
# {CrateName} Skills Plan

## Analysis Summary
- Crate: {crate_name}
- Version: {version}
- Main functional domains: ...

## Skill List

### 1. {crate_name}-{feature1}
**Trigger conditions**: "...", "...", "..."
**Core content**: ...
**Reference files**:
- {file1}.md - {description}
- {file2}.md - {description}

### 2. {crate_name}-{feature2}
...
````

### 3. Create Skills

For each skill:

1. **Create directory structure**:
   ```
   ~/.claude/skills/{crate_name}-{feature}/
   ├── SKILL.md
   └── references/
       ├── {api-reference}.md
       └── {detailed-guide}.md
   ```

2. **Write SKILL.md**:
   - Follow the generation contract above
   - Keep SKILL.md concise; target 40-120 lines and stay below 500 lines
   - Put complex content in references/
   - Include only relevant calibration anchors

3. **Write reference files**:
   - Complete API reference
   - Configuration options tables
   - Detailed code examples
   - Feature-specific content

### 4. Content Allocation Principles

| Content Type | Location |
|--------------|----------|
| Core patterns (3-5) | SKILL.md |
| Complete API reference | references/ |
| Configuration options details | references/ |
| Feature-specific config | references/ |
| Advanced usage/edge cases | references/ |
| Deprecated patterns table | SKILL.md |
| Best practices | SKILL.md |

---

## Quality Checklist

- [ ] Each SKILL.md follows the generation contract
- [ ] Each SKILL.md has a concise description with "Use when:" and "Keywords:"
- [ ] Each SKILL.md has version info and update date
- [ ] Each SKILL.md has Documentation navigation with load conditions
- [ ] Each SKILL.md has Documentation Boundary section
- [ ] Each SKILL.md has relevant calibration anchors
- [ ] Each SKILL.md has Key Patterns code examples
- [ ] Each SKILL.md has Deprecated Patterns table (if applicable)
- [ ] Each SKILL.md has "When Writing Code" best practices
- [ ] Complex content has been split into references/ directory
- [ ] Code examples use latest Rust idioms
- [ ] No redundant documentation files (README.md, etc.)
- [ ] Generated output passes the skill generation quality gate in strict mode
- [ ] Output was produced from a clean generated directory, not manually patched
      after generation
- [ ] Skills created directly in `~/.claude/skills/` for auto-discovery

---

## Output Location

All skills are created in: `~/.claude/skills/{crate_name}-*/`

This is the local dynamic skills directory, not committed to the rust-skills repository.
