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

Checks and repairs missing reference files in generated crate skills under
`~/.claude/skills/`.

The procedure now lives in two single-source places - follow them instead of
this file:

- `commands/fix-skill-docs.md` - the full command-mode entry point.
- `skills/core-dynamic-skills/SKILL.md`, section "Fix Generated References" -
  the condensed dual-mode (agent/inline) procedure, since fixing generated
  docs is part of the same lifecycle as generating them.

Usage summary:

```
/fix-skill-docs [crate_name] [--check-only] [--remove-invalid]
```

- `crate_name`: specific crate to check (default: all generated skills)
- `--check-only`: report missing reference files without fixing
- `--remove-invalid`: drop dangling reference lines from the generated
  SKILL.md instead of fetching the missing file

Fetch priority when repairing: agent-browser CLI first, WebFetch as fallback
(see core-dynamic-skills for the exact commands).
