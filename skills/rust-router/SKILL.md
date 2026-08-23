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
| `&format!`, temporary value dropped while borrowed | `m01-ownership` | bind the temporary to a named `let` owner before borrowing |
| MSRV, stabilized API, deprecation, crate upgrade behavior change | `m11-ecosystem` | MSRV, semver, release notes, fallback, regression tests |
| raw C pointer plus length, safe wrapper, `from_raw_parts`, FFI contract | `unsafe-checker` | SAFETY comments, pointer validity, length and alignment invariants, lifetime, aliasing |
| slow pipeline, heavy allocation, optimization plan | `m10-performance` | measure first, benchmark, allocation, criterion |
| Rust toolchain, Cargo setup, rust-skills install or verify | `rust-env-setup` | rustup, Cargo setup, rust-analyzer, rust-skills runtime, verify |
| async handler holds a mutex across I/O | `m07-concurrency` + `domain-web` when handler/web is present | drop the MutexGuard before `.await`, lock scope, deadlock risk |
| CLI safety: exits 0 after failure, secret-bearing output, destructive path cleanup | `m06-error-handling` + `domain-cli` | non-zero exit on failure, redact env-sourced secrets, canonicalize and preview before destructive deletes |
| trait object, plugin registry, `dyn`, generic methods, returns `Self` | `m04-zero-cost` | object safe, dyn dispatch, generic method, Self |
| `no_std`, embedded firmware, cannot allocate, fixed buffers | `domain-embedded` | no_std, heapless and fixed-capacity buffers, avoiding heap allocation |

## Routing Model

Three layers. Identify where the question enters, load that skill, and keep
its key concepts in mind when answering. When a domain keyword co-occurs with
a mechanics question or error code, load BOTH the m-skill and the domain-*
skill.

- Layer 1 (HOW, language mechanics): m01-m07, unsafe-checker
- Layer 2 (WHAT, design choices): m09-m15
- Layer 3 (WHY, domain constraints): domain-*

### Layer 1 Skills (Language Mechanics)

| Pattern | Route To |
|---------|----------|
| move, borrow, lifetime, E0382, E0597 | m01-ownership |
| Box, Rc, Arc, RefCell, Cell | m02-resource |
| mut, interior mutability, E0499, E0502, E0596 | m03-mutability |
| generic, trait, inline, monomorphization | m04-zero-cost |
| type state, phantom, newtype, orphan rule, coherence, impl trait for external type | m05-type-driven |
| Result, Error, panic, ?, anyhow, thiserror | m06-error-handling |
| Send, Sync, thread, async, channel | m07-concurrency |
| backpressure, cancellation, CancellationToken, graceful shutdown, spawn_blocking, OnceLock, LazyLock, loom | m07-concurrency |
| Pin, self-referential, pin-project, Unpin, structural pinning | m07-concurrency |
| unsafe, FFI, extern, raw pointer, transmute | **unsafe-checker** |

### Layer 2 Skills (Design Choices)

| Pattern | Route To |
|---------|----------|
| domain model, business logic | m09-domain |
| performance, optimization, benchmark | m10-performance |
| integration, interop, bindings | m11-ecosystem |
| resource lifecycle, RAII, Drop | m12-lifecycle |
| domain error, recovery strategy | m13-domain-error |
| mental model, how to think | m14-mental-model |
| anti-pattern, common mistake, pitfall | m15-anti-pattern |

### Layer 3 Skills (Domain Constraints)

| Domain Keywords | Route To |
|-----------------|----------|
| fintech, trading, decimal, currency | domain-fintech |
| ml, tensor, model, inference | domain-ml |
| kubernetes, docker, grpc, microservice | domain-cloud-native |
| embedded, sensor, mqtt, iot | domain-iot |
| web server, HTTP, REST, axum, actix | domain-web |
| CLI, command line, clap, terminal | domain-cli |
| no_std, microcontroller, firmware | domain-embedded |

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
| E0308 | m04-zero-cost (+ m06-error-handling when Result/From/map_err context) | Type mismatch |
| E0599 | m04-zero-cost | No method found |
| E0038 | m04-zero-cost | Trait not object-safe |
| E0433 | m11-ecosystem | Cannot find crate/module |

## Functional Routing Table

| Pattern | Route To | Action |
|---------|----------|--------|
| latest version, what's new | **rust-learner** | Use agents |
| API, docs, documentation | **docs-researcher** | Use agent |
| code style, naming, clippy | **coding-guidelines** | Read skill |
| unsafe code, FFI | **unsafe-checker** | Read skill |
| code review | **os-checker** | See `integrations/os-checker.md` |

### Keyword Conflict Resolution

| Keyword | Resolution |
|---------|------------|
| `unsafe` | **unsafe-checker** (more specific than m11) |
| `error` | **m06** for general, **m13** for domain-specific |
| `MSRV` / `deprecated` / `semver` | **m11** for API evolution and compatibility |
| `RAII` | **m12** for design, **m01** for implementation |
| `crate` | **rust-learner** for version, **m11** for integration |
| `tokio` | **m07** for concepts, **rust-learner**/docs-researcher for API and versions |

## Priority Order

1. Error codes (E0xxx): direct lookup in the error table, highest priority.
2. Comparative, best-practice, cross-domain, or ambiguous prompts: enable
   negotiation as a confidence and gap disclosure layer, not a separate
   answer template. See `patterns/negotiation.md`.
3. Domain keyword + mechanics or error: load both skills (calibration table).
4. Otherwise route by the layer tables above.

## Project Defaults

New Rust projects: `edition = "2024"`, `rust-version = "1.85"`, and lints
`unsafe_code = "warn"` plus clippy `all`/`pedantic = "warn"` in Cargo.toml.

## Sub-Files Reference

| File | Content |
|------|---------|
| `patterns/negotiation.md` | Negotiation protocol details |
| `examples/workflow.md` | Workflow examples |
| `integrations/os-checker.md` | OS-Checker integration |
