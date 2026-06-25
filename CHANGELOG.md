# Changelog

All notable changes to rust-skills will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.2.0] - 2026-06-11

### Added
- Native `rust-skills hook <claude|codex>` subcommand: full installs (`node install.js`) now wire UserPromptSubmit hook settings directly to the installed binary, dropping per-prompt hook overhead from a ~110ms node chain to ~10ms. The node hook scripts remain only as a repo-checkout/plugin-layout fallback.
- Injected-skill cap of 5 with layer quotas: the router plus the best layer3 and best layer2 matches get guaranteed slots, remaining slots fill by priority. Full match lists stay in the route JSON (`truncated: true` when the cap applies).
- `rust_signals.not_regexes` veto patterns with veto-span stripping: vetoed phrases ("rust stains", "Tokio Marine", "Clippy the assistant") no longer trigger routing, while Rust evidence outside the vetoed phrase still routes.
- `rust-skills --version` prints the runtime version.
- Implicit-Rust routing signals: crate paths like `serde_json::`, pasted code such as `println!`/`String::from`, and lifetime syntax `<'a>` now route without the word "Rust".
- Held-out routing corpus (`tests/fixtures/heldout-corpus.json`, 71 blind-authored queries) and generalization gate `tests/routing-heldout-test.mjs` with floor thresholds (accuracy 0.9, recall 0.9, precision 0.85, false-positive rate 0.15). Editing this corpus to make the router pass is forbidden; fix the router instead.
- Agent-matrix dry-run gate in `tests/verify-all.mjs`; the pinned routing corpus (`tests/routing-corpus.json`) now holds 74 exact-expectation cases.
- `rust-skills verify` now compile-checks every registry regex and reports duplicate skill ids and unreachable skills.
- `install.js` prints a PATH hint for `~/.local/bin` after installing the shim.

### Fixed
- Reinstall idempotency: the hook dedupe check never matched the quoted native hook command, so every reinstall stacked another UserPromptSubmit entry; the check is now quote-agnostic and the install e2e asserts reinstall idempotency.
- Removed unused `tokio` (full features) and `async-scoped` dependencies that had leaked into the CLI crate; installs no longer pull the async dependency tree and build offline again.
- The installed `rust-skills.js` launcher pinned `RUST_SKILLS_ROOT` to its own `bin/` directory, which strict root validation rejects; it now pins the root only when `routes.json` actually sits beside it.
- Non-compiling code examples in skill content were fixed as part of the compile-verification pass (see Changed).
- CJK word-boundary bug: prompts like `E0382错误` and `main.rs报错` now route correctly (ASCII `\b` semantics matching JavaScript).
- Removed bare `clippy`/`anyhow` signals that caused false-positive injection on non-Rust prompts.
- Hook prompts are passed to the CLI via stdin, removing the ARG_MAX limit on long prompts.
- Invalid `RUST_SKILLS_ROOT` overrides now fail loudly instead of silently falling back.
- `install.js` preflights cargo before copying any files, so a missing toolchain no longer leaves a partial install with a bare stack trace.
- Hooks never trigger cargo builds: timeout and cargo fallback are disabled in hook context.

### Changed
- Route JSON is now `schema_version: 2`: the `prompt_is_rust` field is removed (use `rust_signal`/`should_inject`), and `detect` is kept only as a deprecated alias of `route`.
- Skill content overhaul: 47% line cut (11,655 → 6,067 lines), 158 code blocks compile-verified, non-compiling examples fixed, calibration anchors rewritten without rubric leakage, and the injected routing contract is now advisory — the agent's own Rust expertise takes precedence, with skill guardrails applied when matched.
- Removed the "Calibration Anchors" previously embedded in skill files; they leaked benchmark rubric terms into skill content and inflated earlier agent-quality numbers. Held-out routing metrics, restated honestly: accuracy 0.944 / recall 1.000 / false-positive rate 0.114 (vs legacy regex 0.592 accuracy / 0.80 false-positive rate) was the blind PRE-adaptation estimate; the veto patterns were then derived from that run's failures, after which the gate pins accuracy 1.0 / recall 1.0 / false-positive rate 0.0 as a regression floor — no longer an unbiased generalization estimate.
- `tests/verify-all.mjs` runs against the release binary (~12s, previously ~102s).

### Removed
- `hooks.json` UserPromptSubmit matcher (it was an invalid `(?i)` JavaScript regex, and Claude Code ignores UserPromptSubmit matchers anyway); gating now happens inside the native binary, which full installs invoke directly (`rust-skills hook <claude|codex>`, ~10ms per prompt) and which emits nothing for non-Rust prompts.
- Test suites: `tests/hook-matcher-test.mjs` (matcher removed), `tests/routing-eval-test.mjs` (subsumed by the routing A/B suite), `tests/hook-matcher-test.py` (orphan).

## [2.1.0] - 2026-05-18

### Added
- Rust-native local runtime CLI: `rust-skills detect`, `rust-skills route`, `rust-skills index`, and `rust-skills verify`.
- Codex and Claude Code local installer with a single top-level `rust-skills` entry and deep skill data under runtime data roots.
- Codex and Claude hook routing tests plus install e2e tests.
- MIT `LICENSE` file for package/release compliance.

### Changed
- JavaScript runtime files now act as npm, hook, and test compatibility wrappers; route decisions are owned by the Rust CLI.
- Codex install now writes `[features].hooks = true` and removes the deprecated `[features].codex_hooks` key.
- Hook injection now fails closed for non-Rust prompts instead of relying only on broad matcher regexes.
- README installation docs now describe the local runtime path and verification commands.

## [2.0.9] - 2025-01-22

### Changed
- **Improved installation documentation** in all READMEs (EN/ZH/JA):
  - Added two-step marketplace installation guide (`/plugin marketplace add` + `/plugin install`)
  - Clarified the difference between adding marketplace and installing plugin

### Added
- **Dependent Skills section** in all READMEs:
  - [actionbook/actionbook](https://github.com/actionbook/actionbook) - MCP server for website action manuals
  - [vercel-labs/agent-browser](https://github.com/vercel-labs/agent-browser) - Browser automation tool

---

## [2.0.8] - 2025-01-22

### Added
- **5 new LSP-based skills** for code intelligence:
  - `rust-code-navigator` - Navigate code using LSP (goToDefinition, findReferences, hover)
  - `rust-call-graph` - Visualize function call hierarchies (incomingCalls, outgoingCalls)
  - `rust-symbol-analyzer` - Analyze project structure (documentSymbol, workspaceSymbol)
  - `rust-trait-explorer` - Explore trait implementations (goToImplementation)
  - `rust-refactor-helper` - Safe refactoring with impact analysis

### Technical
- All LSP skills use `allowed-tools: ["LSP", "Read", "Glob"]` for safety
- Added comprehensive workflow documentation for each LSP operation

---

## [2.0.7] - 2025-01-22

### Added
- **New skill:** `rust-deps-visualizer` - Generate ASCII art dependency graphs
  - Support `--depth` and `--features` options
  - Size visualization and category grouping

### Changed
- **22 reference skills** now marked with `user-invocable: false`
  - m01-m07 (Layer 1: Language Mechanics)
  - m09-m15 (Layer 2: Design Choices)
  - domain-* (Layer 3: Domain Constraints)
  - coding-guidelines
- **5 command skills** now have `argument-hint` for better UX
  - `meta-cognition-parallel`: `<rust_question>`
  - `rust-skill-creator`: `<crate_name|std::module>`
  - `rust-daily`: `[today|week|month]`
  - `core-fix-skill-docs`: `[crate_name] [--check-only]`
  - `core-dynamic-skills`: `[--force] | <crate_name>`
- **2 skills** now have `allowed-tools` restrictions
  - `unsafe-checker`: Read, Grep, Glob only (no Bash for safety)
  - `rust-learner`: Task, Read, Glob only
- **2 skills** now use dynamic context injection (`!`cmd``)
  - `domain-embedded`: Auto-injects `.cargo/config.toml`
  - `m11-ecosystem`: Auto-injects Cargo.toml dependencies

### Documentation
- Skills now follow Claude Code Plugin Marketplace best practices

---

## [2.0.6] - 2025-01-22

### Fixed
- **OpenCode installation** - Rewrote installation guide with correct instructions config (Issue #6, thanks @DoiiarX)
  - Use `instructions` config option instead of non-existent `plugins` key
  - Restructured `.opencode/` directory: `plugin/` → `instructions/`
  - Added troubleshooting section and feature comparison table

---

## [2.0.5] - 2025-01-22

### Added
- **Experimental:** `meta-cognition-parallel` skill for three-layer parallel analysis
  - `agents/layer1-analyzer.md` - Language mechanics analysis agent
  - `agents/layer2-analyzer.md` - Design choices analysis agent
  - `agents/layer3-analyzer.md` - Domain constraints analysis agent
- New command: `/meta-parallel` for testing parallel meta-cognition

### Documentation
- NPX installation note: recommend plugin installation for full functionality

---

## [2.0.4] - 2025-01-22

### Added
- `context: fork` support for task-based skills (Issue #4, thanks @pinghe)
  - `rust-skill-creator` - runs in isolated general-purpose agent
  - `core-dynamic-skills` - runs in isolated general-purpose agent
  - `core-fix-skill-docs` - runs in isolated general-purpose agent
  - `rust-daily` - runs in isolated Explore agent

### Documentation
- Added analysis of which skills benefit from forked context

---

## [2.0.3] - 2025-01-22

### Fixed
- `.mcp.json` - Added missing `mcpServers` wrapper (PR #3)
- `README.md`, `README-zh.md`, `README-ja.md` - Added NPX installation method (PR #1)

### Changed
- Updated feature comparison tables to include NPX method

---

## [2.0.2] - 2025-01-22

### Changed
- `README.md`, `README-zh.md`, `README-ja.md` - Added Marketplace installation method, version badge
- `VERSION` - Updated to 2.0.2
- `metadata.json` - Updated version, stats, skills list structure

---

## [2.0.1] - 2025-01-22

### Added
- `tests/scenarios/domain-skills.md` - Layer 3 domain skills test scenarios
- `tests/scenarios/layer2-skills.md` - Layer 2 design skills test scenarios

### Changed
- `hooks/hooks.json` - Added domain keywords (fintech, kubernetes, embedded, IoT, ML, etc.)
- `tests/README.md` - Updated with complete test coverage summary

---

## [2.0.0] - 2025-01-22

### Added

#### Plugin Marketplace Support
- Added `.claude-plugin/marketplace.json` with official schema
- Simplified `.claude-plugin/plugin.json` (skills auto-discovered)
- Support for `/plugin marketplace add actionbook/rust-skills`

#### Domain Skills (Layer 3)
- **domain-fintech**: Financial technology patterns
- **domain-web**: Web development patterns
- **domain-cli**: CLI application patterns
- **domain-embedded**: Embedded systems patterns
- **domain-cloud-native**: Cloud-native patterns
- **domain-iot**: IoT patterns
- **domain-ml**: Machine learning patterns

#### Negotiation Protocol
- Added `_meta/negotiation-protocol.md` for comparative queries
- Added `_meta/negotiation-templates.md` for response formats
- Support for "compare", "vs", "best practice" queries

### Changed

#### rust-router Optimization
- **56% context reduction** (18.7 KB → 8.1 KB)
- Moved negotiation details to `patterns/negotiation.md`
- Moved workflow examples to `examples/workflow.md`
- Moved OS-Checker integration to `integrations/os-checker.md`
- Removed redundant skill file paths listing

#### Test Coverage
- Complete trigger test coverage (25/25 user-facing skills)
- Added Layer 2 skills tests (m05, m09-m15)
- Updated quick test commands

### Fixed
- Fixed incorrect repository links (`anthropics/rust-skills` → `actionbook/rust-skills`)
- Fixed actionbook link (`anthropics/actionbook` → `actionbook/actionbook`)

### Documentation
- Added `docs/context-optimization.md` with optimization details
- Updated `docs/rust-skills-introduction.md`

---

## [1.0.0] - 2024-01-16

### Added

#### Core Infrastructure
- Initial release of rust-skills Claude plugin
- 15 meta-question skills (m01-m15) for Rust learning
- rust-router for intelligent skill routing
- rust-learner for crate and version information

#### Skills
- **m01-ownership**: Memory ownership and lifetimes
- **m02-resource**: Resource management (Box, Rc, Arc)
- **m03-mutability**: Mutability patterns
- **m04-zero-cost**: Zero-cost abstractions
- **m05-type-driven**: Type-driven design
- **m06-error-handling**: Error handling patterns
- **m07-concurrency**: Concurrency and async
- ~~**m08-safety**~~: Merged into **unsafe-checker**
- **m09-domain**: Domain modeling
- **m10-performance**: Performance optimization
- **m11-ecosystem**: Ecosystem integration
- **m12-lifecycle**: Resource lifecycle
- **m13-domain-error**: Domain error handling
- **m14-mental-model**: Mental model construction
- **m15-anti-pattern**: Anti-pattern recognition

#### unsafe-checker Skill
- 47 unsafe rules organized by category
- Checklists for writing and reviewing unsafe code
- FFI best practices and patterns
- Examples for safe abstractions

#### coding-guidelines Skill
- Compressed P rules by category (~80 core rules)
- G rules summary (g-compressed.md)
- Clippy lint mapping index

#### Agents
- crate-researcher: Fetch crate info from lib.rs/crates.io
- rust-changelog: Fetch Rust version changelog
- docs-researcher: Fetch API documentation
- clippy-researcher: Fetch Clippy lint information
- browser-fetcher: Generic web content fetching

#### Commands
- /guideline: Query coding guidelines
- /guideline --clippy: Map Clippy lints to rules
- /unsafe-check: Check file for unsafe issues
- /unsafe-review: Interactive unsafe code review

#### Deep Dive Content
- Common error patterns and fixes
- Lifetime patterns guide
- Async patterns guide
- Thread-based concurrency patterns
- Performance optimization guide
- Mental model construction guide
- Anti-pattern recognition guide
- Language comparison documents

#### Code Templates
- Error handling templates (thiserror, anyhow)
- Concurrency templates (worker-pool, async-task)
- FFI templates (safe-wrapper)

#### Testing
- Test scenarios for all major skills
- Validation script for skill configuration
- Agent integration test scenarios

#### Caching
- Agent result caching system
- Configurable TTL per category
- Cache management utilities

### Technical Details
- Skills use YAML frontmatter for triggers
- Agents use haiku model for efficiency
- Routing based on keywords and error codes
- Chinese language triggers supported

## [Unreleased]

No unreleased changes.
