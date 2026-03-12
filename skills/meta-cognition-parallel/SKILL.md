---
name: meta-cognition-parallel
description: "Use when a Rust question needs multi-dimensional analysis across language mechanics, design patterns, and domain constraints. Triggers on: /meta-parallel, 三层分析, parallel analysis, 并行元认知, complex Rust architecture, cross-cutting concerns"
argument-hint: "<rust_question>"
---

# Meta-Cognition Parallel Analysis (Experimental)

> **Status:** Experimental | **Version:** 0.2.0

Launches three parallel analyzers (Language Mechanics, Design Choices, Domain Constraints) then synthesizes results into a domain-correct architectural recommendation.

## Usage

```
/meta-parallel <your Rust question>
```

**Examples:**
```
/meta-parallel 我的交易系统报 E0382 错误，应该用 clone 吗？
/meta-parallel Web API handler needs shared database pool across async tasks
/meta-parallel CLI tool config file vs command-line argument precedence
```

## Execution Mode

Check if agent files exist at `../../agents/layer{1,2,3}-analyzer.md`:
- **Found:** Launch all three as parallel `Task()` calls with `run_in_background: true` in a SINGLE message
- **Not found:** Execute layers sequentially inline (below)

## Workflow

### Step 1: Parse User Query

Extract from `$ARGUMENTS`:
- The original question and any code snippets
- Error codes (E0XXX)
- Domain hints (trading, web, embedded, CLI, etc.)

### Step 2: Execute Layer 1 - Language Mechanics

Identify the Rust compiler error/pattern, root cause, and language-level solutions.

**Output format:**
```markdown
## Layer 1: Language Mechanics
**Error/Pattern:** E0XXX — ownership/borrowing/lifetime/etc.
**Root Cause:** [Why this error occurs]
**Solutions:**
1. [Solution 1]
2. [Solution 2]
**Confidence:** HIGH | MEDIUM | LOW
```

**Example (E0382 — use after move):**
```rust
// Problem: moved value used after move
let record = TradeRecord::new(order);
process(record);       // record moved here
archive(record);       // ERROR: use after move

// L1 solutions:
// 1. Clone: archive(record.clone()) — simple but allocates
// 2. Borrow: fn process(r: &TradeRecord) — zero-cost if read-only
// 3. Rc/Arc: let r = Arc::new(record) — shared ownership
```

### Step 3: Execute Layer 2 - Design Choices

Evaluate design patterns and trade-offs using a decision table.

**Output format:**
```markdown
## Layer 2: Design Choices
**Current approach:** [pattern] — **Problem:** [why it conflicts with Rust rules]

| Pattern | Pros | Cons | When to Use |
|---------|------|------|-------------|
| Clone | Simple | Allocation cost | Rare access, small data |
| &T / &mut T | Zero-cost | Lifetime constraints | Single-owner, scoped access |
| Rc<T> / Arc<T> | Shared ownership | Refcount overhead | Multiple readers, no mutation |
| Arc<Mutex<T>> | Thread-safe mutation | Lock contention | Concurrent write access |

**Recommended:** [pattern] — [rationale]
**Confidence:** HIGH | MEDIUM | LOW
```

### Step 4: Execute Layer 3 - Domain Constraints

Identify domain-specific requirements that constrain the solution.

**Output format:**
```markdown
## Layer 3: Domain Constraints
**Domain:** [trading/fintech | web | CLI | embedded | etc.]

**Requirements:** Performance, Safety, Concurrency, Auditability (rate each)

**Constraints:**
- MUST: [hard requirements]
- SHOULD: [soft requirements]
- AVOID: [anti-patterns for this domain]

**Confidence:** HIGH | MEDIUM | LOW
```

### Step 5: Cross-Layer Synthesis

Combine all three layers into a single recommendation.

**Output format:**
```markdown
## Cross-Layer Synthesis

| Layer | Key Finding | Confidence |
|-------|-------------|------------|
| L1 (Mechanics) | [Summary] | [Level] |
| L2 (Design) | [Summary] | [Level] |
| L3 (Domain) | [Summary] | [Level] |

### Reasoning Chain
L3 Domain: [Constraint] → L2 Design: [Pattern] → L1 Mechanism: [Feature]

### Recommendation
**Do:** [Recommended approach]
**Don't:** [What to avoid]
**Overall Confidence:** HIGH | MEDIUM | LOW (limited by: [lowest layer])
```

**Example synthesis (trading system E0382):**
```rust
// L3: FinTech requires auditability — no silent data loss
// L2: Shared immutable ownership pattern
// L1: Arc<T> for zero-copy shared access

use std::sync::Arc;

struct TradeRecord { /* ... */ }

let record = Arc::new(TradeRecord::new(order));
process(Arc::clone(&record));   // shared read
archive(Arc::clone(&record));   // shared read — no move, no clone cost
audit_log(&record);             // borrow from Arc
```

---

## Error Handling

| Error | Solution |
|-------|----------|
| Agent files not found | Fall back to inline sequential mode |
| Agent timeout / incomplete result | Fill in missing layer with inline analysis |
