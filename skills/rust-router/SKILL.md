---
name: rust-router
description: "Use when answering ANY Rust question — errors, design, architecture, or coding.
Routes queries to the correct specialized skill by analyzing intent and domain.
Triggers: Rust, cargo, rustc, crate, Cargo.toml, compile error, borrow error, lifetime error,
ownership error, type error, trait error, E0382, E0597, E0277, E0308, E0499, E0502, E0596,
async, await, Send, Sync, tokio, concurrency, error handling, compare, vs, best practice,
所有权, 借用, 生命周期, 异步, 并发, 错误处理, 比较, 最佳实践"
globs: ["**/Cargo.toml", "**/*.rs"]
---

# Rust Question Router

## Routing Workflow

1. **Classify the query** into a layer:
   - **Layer 1 (HOW):** Language mechanics — ownership, borrowing, lifetimes, traits → m01-m07
   - **Layer 2 (WHAT):** Design choices — architecture, patterns, DDD → m09-m15
   - **Layer 3 (WHY):** Domain constraints — business rules, regulatory → domain-*
2. **Load the entry skill** from the routing tables below
3. **Trace through layers** — errors trace UP (L1→L2→L3), domain questions trace DOWN (L3→L2→L1)
4. **Cross-reference** related skills as indicated in each skill's "Trace" sections

| User Signal | Entry Layer | First Skill |
|-------------|-------------|-------------|
| E0xxx error code | Layer 1 | Error table below |
| "How to design..." | Layer 2 | m09-domain |
| "Building [domain] app" | Layer 3 | domain-* |
| "Best practice..." | Layer 2 | m09-m15 |
| Performance issue | Layer 1→2 | m10-performance |

### CRITICAL: Dual-Skill Loading

**When domain keywords are present, you MUST load BOTH skills:**

| Domain Keywords | L1 Skill | L3 Skill |
|-----------------|----------|----------|
| Web API, HTTP, axum, handler | m07-concurrency | **domain-web** |
| 交易, 支付, trading, payment | m01-ownership | **domain-fintech** |
| CLI, terminal, clap | m07-concurrency | **domain-cli** |
| kubernetes, grpc, microservice | m07-concurrency | **domain-cloud-native** |
| embedded, no_std, MCU | m02-resource | **domain-embedded** |

---

### Negotiation Protocol

**BEFORE answering, check if negotiation is required.** When triggered, load ALL relevant skills, assess confidence from each source, synthesize, and disclose gaps.

| Query Contains | Action |
|----------------|--------|
| "compare", "vs", "versus", "比较", "对比" | **MUST use negotiation** |
| "best practice", "最佳实践" | **MUST use negotiation** |
| Domain + error (e.g., "交易系统 E0382") | **MUST use negotiation** |
| Ambiguous scope (e.g., "tokio 性能") | **SHOULD use negotiation** |

> **详细协议见:** `patterns/negotiation.md`

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

## Keyword Conflict Resolution

| Keyword | Resolution |
|---------|------------|
| `unsafe` | **unsafe-checker** (more specific than m11) |
| `error` | **m06** for general, **m13** for domain-specific |
| `RAII` | **m12** for design, **m01** for implementation |
| `crate` | **rust-learner** for version, **m11** for integration |
| `tokio` | **tokio-*** for API, **m07** for concepts |

### Resolution Priority

1. Error codes (E0xxx) → Direct lookup in error table
2. Negotiation triggers (compare, vs, best practice) → Enable negotiation protocol
3. Domain keywords + error → Load BOTH domain + error skills
4. Specific crate keywords → Route to crate-specific skill
5. General concept keywords → Route to meta-question skill
