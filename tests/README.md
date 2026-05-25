# Rust Skills Tests

## Overview

This directory contains test scenarios for validating rust-skills functionality.

## Directory Structure

```
tests/
├── README.md
├── scenarios/              # Test scenarios by category
│   ├── ownership.md        # m01-m04 ownership/resource tests
│   ├── layer2-skills.md    # m05, m09-m15 design skills
│   ├── domain-skills.md    # Layer 3 domain skills
│   ├── unsafe.md           # unsafe-checker tests
│   ├── routing.md          # rust-router tests
│   └── agents.md           # Agent integration tests
│
├── pressure-scenarios/     # Edge case tests
│   ├── m01-ownership/
│   ├── m06-error-handling/
│   └── m07-concurrency/
│
└── validation/             # Validation scripts
    └── validate-skills.sh
```

## Quick Test Reference

See `test-triggers.md` in project root for complete trigger test checklist.

## Running Tests

### Manual Testing

Use the test scenarios as prompts:

```bash
# Layer 1: Language Mechanics
claude -p "E0382 错误怎么解决"           # m01-ownership
claude -p "E0499 multiple mutable borrows" # m03-mutability
claude -p "newtype pattern"              # m05-type-driven
claude -p "Send Sync trait"              # m07-concurrency

# Layer 2: Design Choices
claude -p "DDD in Rust"                  # m09-domain
claude -p "benchmark 怎么写"              # m10-performance
claude -p "RAII pattern"                 # m12-lifecycle
claude -p "常见 Rust 错误"                # m15-anti-pattern

# Layer 3: Domain Constraints
claude -p "axum web server"              # domain-web
claude -p "decimal 精度计算"              # domain-fintech
claude -p "no_std embedded"              # domain-embedded

# Core Skills
claude -p "unsafe 代码怎么写"             # unsafe-checker
claude -p "tokio 最新版本"                # rust-learner
```

### Validation Script

```bash
./tests/validation/validate-skills.sh
```

### AOM CLI Gates

```bash
npm test
npm run test:aom
npm run test:aom:fixtures
npm run test:aom:cli-fixtures
npm run test:agents:cli:skip
```

The CLI-focused AOM suite lives in `tests/aom/fixtures/agent-matrix-cli.json`.
It adds product-neutral prompts and Cargo-backed workspaces for exit status,
stdout/stderr, JSON output, config precedence, filesystem safety, and
cross-platform path handling.

## Test Categories

### 1. Layer 1 - Language Mechanics (m01-m07)
- Ownership, borrowing, lifetimes
- Resource management
- Mutability
- Zero-cost abstraction
- Type-driven design
- Error handling
- Concurrency

### 2. Layer 2 - Design Choices (m09-m15)
- Domain modeling
- Performance optimization
- Ecosystem integration
- Resource lifecycle
- Domain error patterns
- Mental models
- Anti-patterns

### 3. Layer 3 - Domain Constraints
- domain-fintech
- domain-web
- domain-cli
- domain-embedded
- domain-cloud-native
- domain-iot
- domain-ml

### 4. Core Skills
- rust-router
- rust-learner
- coding-guidelines
- unsafe-checker

### 5. Agent Integration
- crate-researcher
- rust-changelog
- docs-researcher
- clippy-researcher

## Coverage Summary

| Category | Skills | Tested |
|----------|--------|--------|
| Layer 1 | 7 | 7/7 |
| Layer 2 | 7 | 7/7 |
| Layer 3 | 7 | 7/7 |
| Core | 4 | 4/4 |
| **Total** | **25** | **25/25** |

## Adding New Tests

1. Create scenario file in `tests/scenarios/`
2. Include:
   - Test prompt
   - Expected skill trigger
   - Expected response elements
3. Update `test-triggers.md` in project root
4. Update validation script if needed
