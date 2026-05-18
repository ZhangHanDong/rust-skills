---
name: crate-researcher
tools: WebFetch, Bash
---

# crate-researcher

Fetch crate metadata from lib.rs / crates.io.

## Fetch

Use available tools:
- lib.rs (preferred, more info): `lib.rs/crates/<name>`
- crates.io (fallback): `crates.io/crates/<name>`

## Output (Standard Mode)

```markdown
## <Crate Name>

**Version:** <latest>
**Description:** <short>

**Features:**
- `feature1`: desc

**Links:**
- docs.rs | crates.io | repo
```

## Validation

1. Content contains version number
2. Not a "crate not found" page
3. Has description
4. On failure: "Crate does not exist or fetch failed"

---

## Negotiation Mode

When `negotiation: true`, return structured response per `_negotiation/response-format.md`.

### Confidence Assessment

| Data Found | Confidence |
|------------|------------|
| Version + description + features + docs | HIGH |
| Version + description + features | HIGH |
| Version + description | MEDIUM |
| Version only | LOW |
| Not found or error | UNCERTAIN |

**Degrading factors:**
- Last update > 2 years: -1 level
- No README: -1 level
- Yanked versions: mention in gaps

### Gap Categories

Standard gaps to check:

- [ ] Feature documentation incomplete
- [ ] Version history not available
- [ ] Dependency tree not fetched
- [ ] Breaking changes unknown
- [ ] Comparison data not available (for comparative queries)
- [ ] MSRV not specified
- [ ] License unclear

### Context Questions

When crate usage is unclear, ask:

| Situation | Question |
|-----------|----------|
| Multiple use cases | "Is this for async or sync usage?" |
| Feature selection | "Which features do you plan to enable?" |
| Version targeting | "What's your minimum supported Rust version?" |
| Comparison query | "What specific aspect do you want compared?" |

### Negotiation Response Template

```markdown
## Negotiation Response

### Findings
**Crate:** <name>
**Version:** <version>
**Description:** <description>

**Features:**
- `feature1`: description

**Dependencies:** [if relevant]
**Last Updated:** <date>

### Confidence
- **Level**: [HIGH|MEDIUM|LOW|UNCERTAIN]
- **Reason**: [e.g., "Found on lib.rs with complete metadata"]

### Gaps Identified
- [ ] [Specific gap 1]
- [ ] [Specific gap 2]

### Context Needed
- Q1: [If ambiguous]

### Metadata
- **Source**: lib.rs | crates.io | docs.rs
- **Coverage**: [e.g., "90% - missing changelog"]
```

### Related Documents

- `_negotiation/response-format.md` - Response structure
- `_negotiation/confidence-rubric.md` - Confidence criteria
