# Achievement Definitions

Complete list of all achievements with unlock requirements.

---

## Categories Overview

| Category | Count | Theme |
|----------|-------|-------|
| Bug Fixing | 4 | Debugging and fixing issues |
| Testing | 4 | Writing tests |
| Consistency | 4 | Daily coding streaks |
| Safety | 3 | Avoiding unsafe code |
| Error Resolution | 3 | Fixing compiler errors |
| Code Review | 2 | Code quality checks |
| Documentation | 2 | Writing doc comments |
| Refactoring | 2 | Code improvement |
| Learning | 3 | Asking questions |
| Sessions | 3 | Coding sessions |
| **Total** | **30** | |

---

## Bug Fixing 🐛

| ID | Name | Icon | Requirement | Description |
|----|------|------|-------------|-------------|
| `first_blood` | First Blood | 🩸 | Fix 1 bug | Fixed your first bug |
| `bug_hunter` | Bug Hunter | 🐛 | Fix 10 bugs | Becoming proficient at debugging |
| `bug_slayer` | Bug Slayer | ⚔️ | Fix 50 bugs | Expert bug fixer |
| `bug_terminator` | Bug Terminator | 🤖 | Fix 100 bugs | Legendary debugger |

**Detection:** Commits/edits containing keywords: `fix`, `bug`, `修复`, `patch`, `resolve`

---

## Testing 🧪

| ID | Name | Icon | Requirement | Description |
|----|------|------|-------------|-------------|
| `test_curious` | Test Curious | 🧪 | Write 1 test | Wrote your first test |
| `test_believer` | Test Believer | ✅ | Write 10 tests | Building a safety net |
| `test_enthusiast` | Test Enthusiast | 🎯 | Write 50 tests | Testing is a habit now |
| `tdd_master` | TDD Master | 🏆 | Write 100 tests | Master of test-driven development |

**Detection:** Code containing: `#[test]`, `#[tokio::test]`, `assert!`, `assert_eq!`

---

## Consistency 🔥

| ID | Name | Icon | Requirement | Description |
|----|------|------|-------------|-------------|
| `getting_started` | Getting Started | 🌱 | 3 day streak | Building momentum |
| `week_warrior` | Week Warrior | 🔥 | 7 day streak | Full week of coding |
| `monthly_master` | Monthly Master | 💪 | 30 day streak | Month-long dedication |
| `unstoppable` | Unstoppable | 🚀 | 100 day streak | Legendary consistency |

**Detection:** Automatic daily tracking when using Claude Code

---

## Safety 🛡️

| ID | Name | Icon | Requirement | Description |
|----|------|------|-------------|-------------|
| `safety_first` | Safety First | 🛡️ | 7 days no unsafe | A week of safe Rust |
| `safe_rustacean` | Safe Rustacean | 🦀 | 30 days no unsafe | Embracing safe Rust |
| `safety_champion` | Safety Champion | 👑 | 100 days no unsafe | Master of safe code |

**Detection:** Absence of `unsafe {` in written code

**Note:** Using `unsafe` resets the counter to 0

---

## Error Resolution 🔧

| ID | Name | Icon | Requirement | Description |
|----|------|------|-------------|-------------|
| `error_whisperer` | Error Whisperer | 🔧 | Resolve 1 error | Fixed first compiler error |
| `borrow_checker_friend` | Borrow Checker's Friend | 🤝 | Resolve 25 errors | Making peace with the borrow checker |
| `compiler_whisperer` | Compiler Whisperer | 🧙 | Resolve 100 errors | The compiler speaks to you |

**Detection:** Questions/prompts containing: `E0XXX`, `error[`, `cannot`, `expected`, `mismatched`

---

## Code Review 👀

| ID | Name | Icon | Requirement | Description |
|----|------|------|-------------|-------------|
| `code_reviewer` | Code Reviewer | 👀 | 1 review | First code review |
| `quality_guardian` | Quality Guardian | 🛡️ | 10 reviews | Maintaining code quality |

**Detection:** Running `cargo clippy`, `cargo fmt`, or using `/rust-review`

---

## Documentation 📝

| ID | Name | Icon | Requirement | Description |
|----|------|------|-------------|-------------|
| `documenter` | Documenter | 📝 | Write 5 doc blocks | Starting to document |
| `doc_master` | Documentation Master | 📚 | Write 25 doc blocks | Excellent documentation habits |

**Detection:** Code containing `///` or `//!` doc comments (3+ lines per block)

---

## Refactoring 🧹

| ID | Name | Icon | Requirement | Description |
|----|------|------|-------------|-------------|
| `code_cleaner` | Code Cleaner | 🧹 | 5 refactors | Improving code quality |
| `architect` | Architect | 🏛️ | 25 refactors | Master of code structure |

**Detection:** Commits/edits containing: `refactor`, `重构`, `clean`, `extract`, `rename`

---

## Learning 🎓

| ID | Name | Icon | Requirement | Description |
|----|------|------|-------------|-------------|
| `curious_crab` | Curious Crab | ❓ | Ask 10 questions | Curious learner |
| `knowledge_seeker` | Knowledge Seeker | 🎓 | Ask 50 questions | Dedicated to learning |
| `rust_scholar` | Rust Scholar | 🎖️ | Ask 100 questions | Deep Rust knowledge |

**Detection:** Questions containing Rust-related keywords: `rust`, `cargo`, `借用`, `所有权`, `lifetime`, `trait`, `async`, `tokio`

---

## Sessions 📅

| ID | Name | Icon | Requirement | Description |
|----|------|------|-------------|-------------|
| `hello_rust` | Hello, Rust! | 👋 | 1 session | Welcome to Rust! |
| `regular` | Regular | 📅 | 50 sessions | Regular coder |
| `dedicated` | Dedicated | 💎 | 200 sessions | Truly dedicated |

**Detection:** Automatic session tracking

---

## Rarity Tiers

| Tier | Color | Achievements | % of Users |
|------|-------|--------------|------------|
| Common | ⬜ White | First milestones (1-10) | ~80% |
| Uncommon | 🟢 Green | Medium goals (10-50) | ~40% |
| Rare | 🔵 Blue | High goals (50-100) | ~15% |
| Epic | 🟣 Purple | Very high (100+) | ~5% |
| Legendary | 🟡 Gold | Extreme (100+ days) | ~1% |

---

## Progress Calculation

```
Progress % = (current_value / target_value) * 100

Status:
- ✅ Unlocked: 100%
- ⬜ In Progress: >= 50%
- 🔒 Locked: < 50%
```

---

## Data Schema

### stats.json

```json
{
  "bugs_fixed": 0,
  "tests_written": 0,
  "unsafe_avoided_days": 0,
  "unsafe_used": 0,
  "code_reviews": 0,
  "docs_written": 0,
  "errors_resolved": 0,
  "refactors": 0,
  "streak_days": 0,
  "total_sessions": 0,
  "rust_questions": 0,
  "skills_used": 0,
  "last_date": "2026-01-20",
  "last_unsafe_date": "",
  "first_session_date": "2026-01-01"
}
```

### unlocked.json

```json
{
  "unlocked": [
    "hello_rust",
    "first_blood",
    "test_curious",
    "getting_started",
    "error_whisperer"
  ]
}
```

---

## Future Achievement Ideas

| ID | Name | Requirement | Notes |
|----|------|-------------|-------|
| `night_owl` | Night Owl | Code after midnight 10 times | Time-based |
| `early_bird` | Early Bird | Code before 7am 10 times | Time-based |
| `weekend_warrior` | Weekend Warrior | Code 10 weekends | Time-based |
| `polyglot` | Polyglot | Use 5 different crates | Ecosystem |
| `open_source` | Open Source Contributor | Contribute to OSS | GitHub integration |
| `zero_warnings` | Zero Warnings | Clean clippy 10 times | Quality |
| `macro_master` | Macro Master | Write 5 macros | Advanced |
| `async_expert` | Async Expert | 50 async functions | Specialization |
| `performance_guru` | Performance Guru | 10 optimization PRs | Specialization |

---

*Last Updated: 2026-01-20*
