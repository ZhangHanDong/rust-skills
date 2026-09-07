# Rust Skills Review Report

> **Date:** 2026-01-16

## Current Structure

### Skills Count: 30

| Category | Count | Skills |
|----------|-------|--------|
| Core | 4 | rust-router, rust-learner, coding-guidelines, unsafe-checker |
| Meta-Questions (m01-m15) | 15 | m01-m15 |
| Domains | 7 | cloud-native, fintech, web, cli, iot, ml, embedded |
| Utilities | 4 | agent-browser, actionbook, dynamic-skills, fix-skill-docs |

---

## Issues Found

### Issue 1: Skill Overlap

| Skill A | Skill B | Overlap |
|---------|---------|---------|
| `m08-safety` | `unsafe-checker` | 90% - both cover unsafe code |
| `m06-error-handling` | `m13-domain-error` | 40% - error handling |
| `m01-ownership` | `m12-lifecycle` | 30% - RAII, Drop |
| `m02-resource` | `m12-lifecycle` | 30% - resource management |

**Recommendation:** Remove `m08-safety`, merge content into `unsafe-checker`

### Issue 2: Utility Skills Should Not Auto-Trigger

These skills are internal tools, not user-facing:

| Skill | Problem |
|-------|---------|
| `agent-browser` | User shouldn't trigger this directly |
| `actionbook` | Internal tool for other skills |
| `dynamic-skills` | Command-based, not question-based |
| `fix-skill-docs` | Internal maintenance tool |

**Recommendation:** Move to `skills/internal/` or remove `description` to prevent triggering

### Issue 3: Naming Inconsistency

| Current | Issue |
|---------|-------|
| `domain-web` | Uses prefix `domain-` |
| `domain-cli` | Uses prefix `domain-` |
| `domain-embedded` | Uses prefix `domain-` |
| `cloud-native` | No prefix |
| `fintech` | No prefix |
| `iot` | No prefix |
| `ml` | No prefix |

**Recommendation:** Consistent naming: all use `domain-xxx` or none

### Issue 4: Keyword Conflicts

Multiple skills triggered by same keywords:

| Keyword | Triggered Skills |
|---------|------------------|
| `unsafe` | m08-safety, unsafe-checker |
| `FFI` | m08-safety, unsafe-checker |
| `error` | m06-error-handling, m13-domain-error |
| `RAII` | m01-ownership, m02-resource, m12-lifecycle |
| `Drop` | m01-ownership, m02-resource, m12-lifecycle |

### Issue 5: Error Codes Not Comprehensive

Current coverage:

| Error Code | Skill | Status |
|------------|-------|--------|
| E0382 | m01-ownership | ✅ |
| E0597 | m01-ownership | ✅ |
| E0499 | m01-ownership, m03-mutability | ⚠️ Duplicate |
| E0502 | m01-ownership, m03-mutability | ⚠️ Duplicate |
| E0277 | m04-zero-cost, m07-concurrency | ⚠️ Duplicate |
| E0308 | m04-zero-cost | ✅ |
| E0425 | m11-ecosystem | ✅ |
| E0596 | m03-mutability | ✅ |

Missing common errors: E0106, E0133, E0204, E0255, E0271, E0282, E0283, E0317

---

## Recommendations

### 1. Remove Redundant Skills

```
REMOVE:
- m08-safety (merge into unsafe-checker)

KEEP:
- m01-m07, m09-m15 (12 meta-question skills)
- unsafe-checker (comprehensive unsafe coverage)
```

### 2. Move Internal Skills

```
skills/internal/
├── agent-browser/SKILL.md    # No auto-trigger
├── actionbook/SKILL.md       # No auto-trigger
├── dynamic-skills/SKILL.md   # Command-only
└── fix-skill-docs/SKILL.md   # Internal tool
```

Or remove `description` field from these skills to prevent triggering.

### 3. Standardize Domain Names

```
CURRENT → RECOMMENDED:
cloud-native    → domain-cloud-native
fintech         → domain-fintech
iot             → domain-iot
ml              → domain-ml
```

### 4. Assign Error Codes to Single Skill

| Error Code | Assigned To | Reason |
|------------|-------------|--------|
| E0499, E0502 | m03-mutability | Mutability focus |
| E0277 | m04-zero-cost (traits) | Keep in m07 only for Send/Sync context |

### 5. Add Missing Error Codes

```yaml
m01-ownership: + E0106 (missing lifetime specifier)
m04-zero-cost: + E0271, E0282, E0283 (type inference)
m07-concurrency: E0277 (only for Send/Sync)
```

---

## Trigger Test Plan

### Test Cases

```markdown
## Ownership (m01)
| Query | Expected Skill | Keywords |
|-------|----------------|----------|
| "我遇到了 E0382 错误" | m01-ownership | E0382 |
| "value moved after use" | m01-ownership | value moved |
| "借用检查器报错" | m01-ownership | 借用 |
| "lifetime 怎么标注" | m01-ownership | lifetime |

## Error Handling (m06)
| Query | Expected Skill | Keywords |
|-------|----------------|----------|
| "什么时候用 panic" | m06-error-handling | panic |
| "Result vs Option" | m06-error-handling | Result, Option |
| "thiserror 怎么用" | m06-error-handling | thiserror |

## Concurrency (m07)
| Query | Expected Skill | Keywords |
|-------|----------------|----------|
| "cannot be sent between threads" | m07-concurrency | sent between threads |
| "async await 怎么用" | m07-concurrency | async await |
| "tokio spawn" | m07-concurrency + rust-learner | tokio, spawn |

## Unsafe (unsafe-checker)
| Query | Expected Skill | Keywords |
|-------|----------------|----------|
| "如何写安全的 unsafe" | unsafe-checker | unsafe |
| "FFI 绑定怎么写" | unsafe-checker | FFI |
| "SAFETY 注释" | unsafe-checker | SAFETY |

## Version/Crate (rust-learner)
| Query | Expected Skill | Keywords |
|-------|----------------|----------|
| "tokio 最新版本" | rust-learner | 最新版本 |
| "Rust 1.85 有什么新特性" | rust-learner | Rust 1.85, 新特性 |
| "serde 文档" | rust-learner | 文档 |

## Router (rust-router)
| Query | Expected Skill | Keywords |
|-------|----------------|----------|
| "分析这个问题的意图" | rust-router | 意图分析 |
| "这是什么类型的问题" | rust-router | 分析 |
```

### Test Script

```bash
#!/usr/bin/env bash
# test-triggers.sh

queries=(
  "我遇到了 E0382 错误"
  "tokio 最新版本"
  "async await 怎么用"
  "unsafe 代码怎么写"
  "什么时候用 panic"
  "Arc 和 Rc 区别"
)

for q in "${queries[@]}"; do
  echo "=== Query: $q ==="
  claude -p "$q" --verbose 2>&1 | grep -E "skill|trigger"
  echo ""
done
```

---

## Action Items (Completed 2026-01-16)

- [x] Remove m08-safety, merge to unsafe-checker
- [x] Move internal skills to skills/internal/ or remove descriptions
- [x] Standardize domain skill naming
- [x] Deduplicate error codes across skills
- [x] Add missing error codes
- [x] Create and run trigger tests
- [x] Update rust-router routing table

## Changes Made

1. **Removed m08-safety** - Merged content into unsafe-checker
2. **Internal skills** - Removed descriptions from agent-browser, actionbook, dynamic-skills, fix-skill-docs
3. **Domain naming** - Standardized to domain-xxx prefix (domain-fintech, domain-ml, etc.)
4. **Error codes** - E0499/E0502 now only in m03-mutability, added E0106/E0271/E0282
5. **rust-router** - Updated routing tables to reflect all changes
6. **Test script** - Created `test-triggers.sh` for validation
