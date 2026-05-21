# Skills Design Lessons Learned

> Summary of design principles and best practices from building rust-skills

## Core Insight

**Skills are not knowledge databases. They are cognitive scaffolds.**

```
Traditional approach:
  User Question → Search Knowledge → Return Answer

Meta-cognition approach:
  User Question → Identify Layer → Trace Through Layers → Context-Aware Answer
```

The real value is not teaching Claude facts (it already knows Rust), but providing a **thinking framework** that produces deeper, domain-aware answers.

---

## Three-Layer Cognitive Model

### Architecture

```
Layer 3: Domain Constraints (WHY)
├── Business rules, regulatory requirements, SLAs
├── domain-fintech, domain-web, domain-cli, etc.
└── "Why is it designed this way?"

Layer 2: Design Choices (WHAT)
├── Architecture patterns, DDD concepts
├── m09-m15 skills
└── "What pattern should I use?"

Layer 1: Language Mechanics (HOW)
├── Ownership, borrowing, lifetimes, traits
├── m01-m07 skills
└── "How do I implement this in Rust?"
```

### Tracing Direction

| Entry Point | Direction | Example |
|-------------|-----------|---------|
| Error code (E0xxx) | Trace UP ↑ | E0382 → Why this ownership design? |
| Domain question | Trace DOWN ↓ | "Build trading system" → How to implement? |
| Design question | Both directions | Check L3 constraints, then L1 implementation |

### Key Principle

**Don't stop at Layer 1.**

```
Bad:  E0382 → "Use .clone()"
Good: E0382 → Why ownership error? → Domain constraint? → Design pattern → Implementation
```

---

## Skill File Structure

### SKILL.md Format

```yaml
---
name: skill-name
description: "CRITICAL: Use for [purpose]. Triggers on: keyword1, keyword2, ..."
globs: ["**/*.rs"]  # Optional: file patterns
---

# Skill Title

> **Layer X: Category**

## Core Question

**The meta-question this skill answers**

## Error → Design Question

| Error | Don't Just Say | Ask Instead |
|-------|----------------|-------------|
| E0xxx | "Quick fix" | "Deeper question" |

## Trace Up ↑

When to escalate to higher layers...

## Trace Down ↓

How to implement from design decisions...

## Quick Reference

Tables, flowcharts, decision trees...

## Common Errors / Anti-Patterns

What to avoid...

## Related Skills

| When | See |
|------|-----|
| Situation | skill-name |
```

### Description Format (CRITICAL)

For skills to be auto-triggered, use this format:

```yaml
description: "CRITICAL: Use for [purpose]. Triggers on: keyword1, keyword2, keyword3"
```

- Start with `CRITICAL: Use for`
- Include `Triggers on:` with comma-separated keywords
- Include both English and Chinese keywords for bilingual support

---

## Directory Structure

### Flat Structure Required

```
skills/
├── m01-ownership/SKILL.md     # Layer 1
├── m02-resource/SKILL.md
├── ...
├── m09-domain/SKILL.md        # Layer 2
├── m10-performance/SKILL.md
├── ...
├── domain-fintech/SKILL.md    # Layer 3
├── domain-web/SKILL.md
├── ...
├── core-actionbook/SKILL.md   # Utilities
├── rust-router/SKILL.md       # Router
└── coding-guidelines/SKILL.md # Guidelines
```

**DO NOT nest skills:**
```
# Wrong
skills/domains/fintech/SKILL.md
skills/core/actionbook/SKILL.md

# Correct
skills/domain-fintech/SKILL.md
skills/core-actionbook/SKILL.md
```

### Naming Convention

| Category | Prefix | Example |
|----------|--------|---------|
| Layer 1 (Mechanics) | `m0x-` | m01-ownership, m07-concurrency |
| Layer 2 (Design) | `m1x-` | m09-domain, m15-anti-pattern |
| Layer 3 (Domain) | `domain-` | domain-web, domain-fintech |
| Core utilities | `core-` | core-actionbook, core-dynamic-skills |
| Other | descriptive | rust-router, coding-guidelines |

---

## Hook Configuration

### Plugin Hooks (hooks/hooks.json)

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": "(?i)(rust|cargo|E0\\d{3}|...keywords...)",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/.claude/hooks/rust-skill-eval-hook.js"
          }
        ]
      }
    ]
  }
}
```

### Hook Script Design Principles

1. **Force dual-skill loading**: When domain keywords present, load BOTH L1 and L3 skills
2. **Mandate output format**: Require reasoning chain, not just answer
3. **Provide examples**: Show correct vs wrong responses
4. **Use English**: Keep instructions in English for consistency

### Domain Detection in Hook

```
| Keywords in Question | Domain Skill to Load |
|---------------------|---------------------|
| Web API, HTTP, axum | domain-web |
| payment, trading    | domain-fintech |
| CLI, clap, terminal | domain-cli |
```

---

## Meta-Cognition Routing

### Router Skill (rust-router)

The router is the entry point for ALL Rust questions:

1. **Identify entry layer** (L1/L2/L3)
2. **Detect domain keywords** → Load domain skill
3. **Route to appropriate skill** (m0x, m1x, domain-*)
4. **Enforce tracing** (UP or DOWN through layers)

### Dual-Skill Loading

**CRITICAL**: When domain context is present, load BOTH:

```
Question: "Web API config error: Rc cannot be sent"

Load:
1. m07-concurrency (L1 - Send/Sync mechanics)
2. domain-web (L3 - Web state management constraints)

Answer must reference BOTH layers.
```

### Output Format Enforcement

```markdown
### Reasoning Chain
+-- Layer 1: [error]
|       ^
+-- Layer 3: [domain constraint]
|       v
+-- Layer 2: [design decision]

### Domain Constraints Analysis
[Reference specific rules from domain skill]

### Recommended Solution
[Code following domain best practices]
```

---

## Lessons Learned

### 1. Skills Are Thinking Frameworks, Not Knowledge Bases

Claude already knows Rust. Skills provide:
- Structured reasoning paths
- Domain-specific constraints
- Decision frameworks

### 2. Tracing Is Mandatory, Not Optional

Without enforcement, Claude stops at Layer 1 (quick fix).
Hook must **mandate** tracing through all relevant layers.

### 3. Domain Detection Is Critical

The same error (E0382) has different solutions in different domains:
- Web: Arc<T> + State extractor
- Fintech: Arc<T> for audit trail
- CLI: Maybe Rc<T> is fine (single-thread)

### 4. Output Format Drives Behavior

If you want reasoning chains, **require them in the output format**.
Vague instructions like "trace through layers" don't work.

### 5. Flat Directory Structure

Claude Code plugin system requires flat skill directories.
Nested structures (`skills/domains/web/`) won't be registered.

### 6. Keyword Matching Matters

Skills need comprehensive trigger keywords:
- Error codes (E0382, E0597)
- English terms (ownership, borrow)
- Chinese terms (所有权, 借用)
- Domain terms (Web API, axum)

### 7. Examples Are Essential

Both in skills and hooks:
- Show CORRECT response format
- Show WRONG response to avoid
- Include complete reasoning chain

### 8. Internal Skills Need Different Treatment

Internal/utility skills should NOT auto-trigger:
```yaml
# No description = won't auto-trigger
name: core-actionbook
# Internal tool - no description
```

---

## Anti-Patterns to Avoid

### 1. Knowledge Dump Skills

```markdown
# Bad: Just facts
## Ownership Rules
1. Each value has one owner
2. When owner goes out of scope, value is dropped
...
```

### 2. No Tracing Instructions

```markdown
# Bad: No trace up/down
## Quick Reference
| Error | Fix |
| E0382 | Clone it |
```

### 3. Vague Domain References

```markdown
# Bad: Too vague
Trace Up: Check domain-* skills
```

```markdown
# Good: Specific
| Context | Load | Key Constraint |
| Web API | domain-web | Handlers on any thread |
```

### 4. Stopping at Layer 1

```
# Bad answer
Problem: Rc is not Send
Solution: Use Arc

# Good answer
Reasoning Chain: L1 → L3 → L2
Domain Constraint: [from domain-web]
Solution: [follows Web best practices]
```

---

## File Checklist

### Required Files

| File | Purpose |
|------|---------|
| `skills/rust-router/SKILL.md` | Main routing logic |
| `skills/m0x-*/SKILL.md` | Layer 1 skills |
| `skills/m1x-*/SKILL.md` | Layer 2 skills |
| `skills/domain-*/SKILL.md` | Layer 3 skills |
| `.claude/hooks/rust-skill-eval-hook.js` | Hook script |
| `hooks/hooks.json` | Plugin hook config |
| `.claude-plugin/plugin.json` | Plugin manifest |
| `_meta/reasoning-framework.md` | Core reasoning docs |

### Plugin.json Required Fields

```json
{
  "name": "rust-skills",
  "version": "1.0.0",
  "description": "...",
  "skills": "./skills/",
  "hooks": "./hooks/hooks.json"
}
```

---

## Testing Skills

### Manual Test

```
Question: "My Web API reports Rc cannot be sent between threads"

Expected:
1. Hook triggers
2. Loads m07-concurrency AND domain-web
3. Output includes reasoning chain
4. References domain-web constraints
5. Recommends Arc + State extractor (not just "use Arc")
```

### Validation Script

```bash
# Check skill structure
bash scripts/quality-check.sh

# Check hook regex matching
python tests/hook-matcher-test.py
```

---

## Summary

| Principle | Implementation |
|-----------|----------------|
| Three-layer model | L1 (mechanics) ↔ L2 (design) ↔ L3 (domain) |
| Mandatory tracing | Hook enforces output format |
| Domain detection | Keywords → dual-skill loading |
| Flat structure | `skills/domain-web/` not `skills/domains/web/` |
| Keyword coverage | English + Chinese + error codes |
| Example-driven | Correct vs wrong in hooks and skills |

**The goal**: Transform surface-level fixes into domain-aware, architecturally sound solutions.
