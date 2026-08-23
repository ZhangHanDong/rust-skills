# Negotiation Protocol

> 比较查询和跨领域问题的处理协议

## When to Enable Negotiation

For complex queries requiring structured agent responses, enable negotiation mode.

| Query Pattern | Enable Negotiation | Reason |
|---------------|-------------------|--------|
| Single error code lookup | No | Direct answer |
| Single crate version | No | Direct lookup |
| "Compare X and Y" | **Yes** | Multi-faceted |
| Domain + error | **Yes** | Cross-layer context |
| "Best practices for..." | **Yes** | Requires synthesis |
| Ambiguous scope | **Yes** | Needs clarification |
| Multi-crate question | **Yes** | Multiple sources |

## Negotiation Decision Flow

```
Query Received
     │
     ▼
┌─────────────────────────────┐
│ Is query single-lookup?     │
│ (version, error code, def)  │
└─────────────────────────────┘
     │
     ├── Yes → Direct dispatch (no negotiation)
     │
     ▼ No
┌─────────────────────────────┐
│ Does query require:         │
│ - Comparison?               │
│ - Cross-domain context?     │
│ - Synthesis/aggregation?    │
│ - Multiple sources?         │
└─────────────────────────────┘
     │
     ├── Yes → Dispatch with negotiation: true
     │
     ▼ No
┌─────────────────────────────┐
│ Is scope ambiguous?         │
└─────────────────────────────┘
     │
     ├── Yes → Dispatch with negotiation: true
     │
     ▼ No
     └── Direct dispatch (no negotiation)
```

## Negotiation Dispatch

When dispatching with negotiation:

```
1. Set `negotiation: true`
2. Include original query context
3. Expect structured response:
   - Findings
   - Confidence (HIGH/MEDIUM/LOW/UNCERTAIN)
   - Gaps identified
   - Context questions (if any)
4. Evaluate response against original intent
```

## Orchestrator Evaluation

After receiving negotiation response:

| Confidence | Intent Coverage | Action |
|------------|-----------------|--------|
| HIGH | Complete | Synthesize answer |
| HIGH | Partial | May need supplementary query |
| MEDIUM | Complete | Accept with disclosed gaps |
| MEDIUM | Partial | Refine with context |
| LOW | Any | Refine or try alternative |
| UNCERTAIN | Any | Try alternative or escalate |

## Refinement Loop

If response insufficient:

```
Round 1: Initial query
  │
  ▼ (LOW confidence or gaps block intent)
Round 2: Refined query with:
  - Answers to agent's context questions
  - Narrowed scope
  │
  ▼ (still insufficient)
Round 3: Final attempt with:
  - Alternative agent/source
  - Maximum context provided
  │
  ▼ (still insufficient)
Synthesize best-effort answer with disclosed gaps
```

## Integration with 3-Strike Rule

Negotiation follows the 3-Strike escalation:

```
Strike 1: Initial query returns LOW confidence
  → Refine with more context

Strike 2: Refined query still LOW
  → Try alternative agent/source

Strike 3: Still insufficient
  → Synthesize best-effort answer
  → Report gaps to user explicitly
```

Full escalation rules live in `_meta/error-protocol.md` at the repo root
(available in full repo installs only; in skills-only installs this file is
the canonical reference).

## Negotiation Routing Examples

**Example 1: No Negotiation Needed**
```
Query: "What is tokio's latest version?"
Analysis: Single lookup
Action: Direct dispatch to crate-researcher
```

**Example 2: Negotiation Required**
```
Query: "Compare tokio and async-std for a web server"
Analysis: Comparative + domain context
Action: Dispatch with negotiation: true
Expected: Structured responses from both runtime lookups
Evaluation: Check if web-server specific data found
```

**Example 3: Cross-Domain Negotiation**
```
Query: "E0382 in my trading system"
Analysis: Error code + domain context
Action:
  - Dispatch m01-ownership (standard - error is defined)
  - Dispatch domain-fintech (negotiation: true - domain context)
Synthesis: Combine error explanation with domain-appropriate fix
```

## Related Documents

Repo-root paths; these ship with full repo installs only. In skills-only
installs, this file is the single source of truth for negotiation.

- `_meta/negotiation-protocol.md` - Full protocol specification
- `_meta/negotiation-templates.md` - Response templates
- `_meta/error-protocol.md` - 3-Strike escalation
- `agents/_negotiation/response-format.md` - Agent response format
