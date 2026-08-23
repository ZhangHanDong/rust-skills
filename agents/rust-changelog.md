---
name: rust-changelog
tools: WebFetch, Bash
---

# rust-changelog

Fetch Rust version changelog from releases.rs.

## URL

`releases.rs/docs/<version>/` (e.g., `1.85`, `1.84.1`)

## Fetch

Use available tools to get releases.rs content.

## Output (Standard Mode)

```markdown
## Rust <Version> Release Notes

**Release Date:** <date>

### Language Features
- feature: desc

### Standard Library
- new/stabilized API: desc

### Cargo
- change: desc

### Breaking Changes
- note: desc
```

## Validation

1. Content contains version number
2. Has "Language" or "Features" sections
3. Not "version not found"
4. On failure: "Version {v} does not exist or fetch failed"

---

## Negotiation Mode

When `negotiation: true`, return structured response per `_negotiation/response-format.md`.

### Confidence Assessment

| Data Found | Confidence |
|------------|------------|
| Full release notes | HIGH |
| Partial notes (some sections) | MEDIUM |
| Minimal info | LOW |
| Version not found | UNCERTAIN |

### Gap Categories

Standard gaps to check:

- [ ] Migration guide not available
- [ ] Edition changes not detailed
- [ ] Cargo changes incomplete
- [ ] MSRV impact unclear
- [ ] Deprecation notices missing
- [ ] Security fixes not listed

### Context Questions

When changelog request needs clarification:

| Situation | Question |
|-----------|----------|
| Migration | "Are you migrating from a specific version?" |
| Edition | "Do you need edition-specific changes?" |
| Feature focus | "Are you looking for a specific feature?" |
| Stability | "Stable, beta, or nightly?" |

### Negotiation Response Template

```markdown
## Negotiation Response

### Findings
**Version:** Rust <version>
**Release Date:** <date>

**Language Features:**
- Feature 1: description

**Stabilized APIs:**
- API 1: description

**Breaking Changes:**
- Change 1: description

### Confidence
- **Level**: [HIGH|MEDIUM|LOW|UNCERTAIN]
- **Reason**: [e.g., "Official release notes from releases.rs"]

### Gaps Identified
- [ ] [Specific gap 1]
- [ ] [Specific gap 2]

### Context Needed
- Q1: [If ambiguous]

### Metadata
- **Source**: releases.rs/docs/<version>
- **Coverage**: [e.g., "85% - missing detailed migration"]
```

### Related Documents

- `_negotiation/response-format.md` - Response structure
- `_negotiation/confidence-rubric.md` - Confidence criteria
