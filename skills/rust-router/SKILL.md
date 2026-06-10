---
name: rust-router
description: "Use when: routing Rust questions before deeper skills. Keywords: Rust, cargo, rustc, Cargo.toml, compiler errors, ownership, borrow, lifetime, trait, async, Send, Sync, unsafe, FFI, Result, performance, no_std, embedded, CLI, web."
globs: ["**/Cargo.toml", "**/*.rs"]
---

# Rust Question Router

## Routing Calibration

Route by semantic intent: match the prompt's underlying problem, not its
exact wording, then load the listed skills.

| Prompt Signal | Route Intent | Key Concepts |
|---------------|--------------|--------------|
| moved value, API still needs original data | `m01-ownership` | ownership transfer, borrow-based API, public API contract |
| E0716, `&format!`, temporary value dropped while borrowed | `m01-ownership` | temporary lifetimes, binding temporaries to an owner, owning the data instead of borrowing it |
| MSRV, stabilized API, deprecation, crate upgrade behavior change | `m11-ecosystem` | MSRV, semver, release notes, fallback, regression tests |
| raw C pointer plus length, safe wrapper, `from_raw_parts`, FFI contract | `unsafe-checker` | SAFETY comments, pointer validity, length and alignment invariants, lifetime, aliasing |
| slow pipeline, heavy allocation, optimization plan | `m10-performance` | measure first, benchmark, allocation, criterion |
| Rust toolchain, Cargo setup, rust-skills install or verify | `rust-env-setup` | rustup, Cargo setup, rust-analyzer, rust-skills runtime, verify |
| async handler holds a mutex across I/O | `m07-concurrency` + `domain-web` when handler/web is present | Mutex, await, deadlock risk, lock scope |
| CLI exits 0 after failure, catches every error | `m06-error-handling` + `domain-cli` when CLI is present | exit code, error context, automation |
| secret-bearing config dump, env tokens, printable diagnostics | `domain-cli` + `m06-error-handling` | environment source, redaction, safe config view, error diagnostics |
| destructive CLI path cleanup, recursive delete, workspace root | `domain-cli` + `m06-error-handling` | canonicalize root and target paths, preview before mutation, refuse out-of-root paths with a non-zero exit |
| trait object, plugin registry, `dyn`, generic methods, returns `Self` | `m04-zero-cost` | object safe, dyn dispatch, generic method, Self |
| `no_std`, embedded firmware, cannot allocate, fixed buffers | `domain-embedded` | no_std, heapless and fixed-capacity buffers, avoiding heap allocation |

---

## Meta-Cognition Framework

### Core Principle

Rust answers connect domain constraints, design choices, and language mechanics
when those layers affect the result.

```
Layer 3: Domain Constraints (WHY)
- Business rules, regulatory requirements
- domain-fintech, domain-web, domain-cli, etc.
- "Why is it designed this way?"

Layer 2: Design Choices (WHAT)
- Architecture patterns, DDD concepts
- m09-m15 skills
- "What pattern should I use?"

Layer 1: Language Mechanics (HOW)
- Ownership, borrowing, lifetimes, traits
- m01-m07 skills
- "How do I implement this in Rust?"
```

### Routing by Entry Point

| User Signal | Entry Layer | Direction | First Skill |
|-------------|-------------|-----------|-------------|
| E0xxx error | Layer 1 | Trace up | m01-m07 |
| Compile error | Layer 1 | Trace up | Error table below |
| "How to design..." | Layer 2 | Check L3, then trace down | m09-domain |
| "Building [domain] app" | Layer 3 | Trace down | domain-* |
| "Best practice..." | Layer 2 | Both directions | m09-m15 |
| Performance issue | Layer 1 to 2 | Up then down | m10-performance |

### Domain Pairing

When domain keywords are present, pair the language-mechanic skill with the
domain skill:

| Domain Keywords | L1 Skill | L3 Skill |
|-----------------|----------|----------|
| Web API, HTTP, axum, handler | m07-concurrency | **domain-web** |
| trading, payment | m01-ownership | **domain-fintech** |
| CLI, terminal, clap | m07-concurrency | **domain-cli** |
| kubernetes, grpc, microservice | m07-concurrency | **domain-cloud-native** |
| embedded, no_std, MCU | m02-resource | **domain-embedded** |

## Comparative Routing

Use negotiation for comparative, best-practice, cross-domain, or ambiguous
Rust prompts. Keep it as a confidence and gap disclosure layer, not a separate
answer template. See `patterns/negotiation.md` for the full protocol.

## Routing Surface

- Route from prompt signal to layer intent and skill IDs.
- Keep the routed skills' key concepts in mind when forming the answer.
- Load referenced sub-files only when the prompt needs that detail.

### Default Project Settings

Project default for new Rust projects or Cargo.toml files in this skill set:

```toml
[package]
edition = "2024"
rust-version = "1.85"

[lints.rust]
unsafe_code = "warn"

[lints.clippy]
all = "warn"
pedantic = "warn"
```

---

## Layer 1 Skills (Language Mechanics)

| Pattern | Route To |
|---------|----------|
| move, borrow, lifetime, E0382, E0597 | m01-ownership |
| Box, Rc, Arc, RefCell, Cell | m02-resource |
| mut, interior mutability, E0499, E0502, E0596 | m03-mutability |
| generic, trait, inline, monomorphization | m04-zero-cost |
| type state, phantom, newtype | m05-type-driven |
| Result, Error, panic, ?, anyhow, thiserror | m06-error-handling |
| Send, Sync, thread, async, channel | m07-concurrency |
| unsafe, FFI, extern, raw pointer, transmute | **unsafe-checker** |

## Layer 2 Skills (Design Choices)

| Pattern | Route To |
|---------|----------|
| domain model, business logic | m09-domain |
| performance, optimization, benchmark | m10-performance |
| integration, interop, bindings | m11-ecosystem |
| resource lifecycle, RAII, Drop | m12-lifecycle |
| domain error, recovery strategy | m13-domain-error |
| mental model, how to think | m14-mental-model |
| anti-pattern, common mistake, pitfall | m15-anti-pattern |

## Layer 3 Skills (Domain Constraints)

| Domain Keywords | Route To |
|-----------------|----------|
| fintech, trading, decimal, currency | domain-fintech |
| ml, tensor, model, inference | domain-ml |
| kubernetes, docker, grpc, microservice | domain-cloud-native |
| embedded, sensor, mqtt, iot | domain-iot |
| web server, HTTP, REST, axum, actix | domain-web |
| CLI, command line, clap, terminal | domain-cli |
| no_std, microcontroller, firmware | domain-embedded |

---

## Error Code Routing

| Error Code | Route To | Common Cause |
|------------|----------|--------------|
| E0382 | m01-ownership | Use of moved value |
| E0597 | m01-ownership | Lifetime too short |
| E0506 | m01-ownership | Cannot assign to borrowed |
| E0507 | m01-ownership | Cannot move out of borrowed |
| E0515 | m01-ownership | Return local reference |
| E0716 | m01-ownership | Temporary value dropped |
| E0106 | m01-ownership | Missing lifetime specifier |
| E0596 | m03-mutability | Cannot borrow as mutable |
| E0499 | m03-mutability | Multiple mutable borrows |
| E0502 | m03-mutability | Borrow conflict |
| E0277 | m04/m07 | Trait bound not satisfied |
| E0282 | m04-zero-cost | Type inference needs an annotation |
| E0308 | m04-zero-cost | Type mismatch |
| E0599 | m04-zero-cost | No method found |
| E0038 | m04-zero-cost | Trait not object-safe |
| E0433 | m11-ecosystem | Cannot find crate/module |

---

## Functional Routing Table

| Pattern | Route To | Action |
|---------|----------|--------|
| latest version, what's new | **rust-learner** | Use agents |
| API, docs, documentation | **docs-researcher** | Use agent |
| code style, naming, clippy | **coding-guidelines** | Read skill |
| unsafe code, FFI | **unsafe-checker** | Read skill |
| code review | **os-checker** | See `integrations/os-checker.md` |

---

## Priority Order

1. **Identify cognitive layer** (L1/L2/L3)
2. **Load entry skill** (m0x/m1x/domain)
3. **Trace through layers** (UP or DOWN)
4. **Cross-reference skills** as indicated in "Trace" sections
5. **Answer with reasoning chain**

### Keyword Conflict Resolution

| Keyword | Resolution |
|---------|------------|
| `unsafe` | **unsafe-checker** (more specific than m11) |
| `error` | **m06** for general, **m13** for domain-specific |
| `MSRV` / `deprecated` / `semver` | **m11** for API evolution and compatibility |
| `RAII` | **m12** for design, **m01** for implementation |
| `crate` | **rust-learner** for version, **m11** for integration |
| `tokio` | **tokio-*** for API, **m07** for concepts |

**Priority Hierarchy:**

```
1. Error codes (E0xxx): direct lookup, highest priority
2. Negotiation triggers (compare, vs, best practice): enable negotiation
3. Domain keywords + error: load both domain and error skills
4. Specific crate keywords: route to crate-specific skill if it exists
5. General concept keywords: route to meta-question skill
```

---

## Sub-Files Reference

| File | Content |
|------|---------|
| `patterns/negotiation.md` | Negotiation protocol details |
| `examples/workflow.md` | Workflow examples |
| `integrations/os-checker.md` | OS-Checker integration |
