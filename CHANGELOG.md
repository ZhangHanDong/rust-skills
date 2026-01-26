# Changelog

All notable changes to rust-skills will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Node.js script migration (Batch 1 - Setup scripts)**:
  - Migrated `setup.sh` to `scripts/setup.js` for cross-platform compatibility
  - Migrated `scripts/setup-achievements.sh` to `scripts/setup-achievements.js`
  - Added `package.json` with npm scripts for all tools
  - Added `scripts/verify-migration.js` for testing migration correctness
  - Created comprehensive migration guide: `docs/MIGRATION_TO_NODEJS.md`

- **Node.js script migration (Batch 2 - Tool scripts)**:
  - Migrated `scripts/generate-index.sh` to `scripts/generate-index.js`
  - Migrated `scripts/analyze-skills.sh` to `scripts/analyze-skills.js`
  - Migrated `tests/validation/validate-skills.sh` to `tests/validation/validate-skills.js`
  - Fixed CRLF line ending handling for Windows compatibility
  - All scripts now handle YAML frontmatter parsing correctly on all platforms

- **Node.js script migration (Batch 3 - Complex scripts)**:
  - Migrated `scripts/quality-check.sh` to `scripts/quality-check.js`
  - Migrated `scripts/extract-rust-docs.sh` to `scripts/extract-rust-docs.js`
  - Implemented Cargo.toml parsing without external dependencies
  - Added rustdoc JSON support with automatic fallback to source parsing
  - Enhanced link validation with proper relative path resolution

- **Node.js script migration (Batch 4 - Runtime scripts)**:
  - Migrated `test-triggers.sh` to `test-triggers.js`
  - Migrated `scripts/achievement-tracker.sh` to `scripts/achievement-tracker.js`
  - Implemented atomic JSON file updates for concurrent hook execution
  - Added cross-platform date handling for streak calculation
  - Enhanced achievement detection with regex pattern matching
  - **COMPLETE**: All 9 shell scripts successfully migrated (100%)

### Changed
- Updated README.md with Node.js prerequisites and installation steps
- Updated `.gitignore` to exclude `node_modules/` and `package-lock.json`
- Enhanced `scripts/verify-migration.js` with tests for all migrated scripts (9/9 passing - 100% coverage)

### Fixed
- **Windows CRLF handling**: All frontmatter parsers now normalize line endings
- **Core Question extraction**: Properly extract bold text from SKILL.md files
- **Trigger keywords**: Correctly identify error codes and Chinese phrases in descriptions

### Notes
- **Windows users**: ALL scripts now work natively without Git Bash or WSL (100% Windows compatible)
- **All platforms**: Use npm scripts like `npm run quality-check`, `npm run extract-docs`, `npm run test-triggers`
- **Achievement system**: Fully migrated with atomic file updates and concurrent hook support
- **Backward compatibility**: Shell scripts (.sh) remain available during transition period
- **Deprecation timeline**: Shell scripts will be marked deprecated in v2.1.0, removed in v2.2.0
- **Migration status**: ✅ COMPLETE - 9/9 scripts migrated (100%)

---

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
- Support for `/plugin marketplace add ZhangHanDong/rust-skills`

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
- Fixed incorrect repository links (`anthropics/rust-skills` → `ZhangHanDong/rust-skills`)
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

### Planned
- More code templates
- Index generation tools
- Additional dynamic skill support
