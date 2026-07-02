---
name: m07-concurrency
description: "Use when: concurrency/async. Keywords: E0277 Send Sync, cannot be sent between threads, thread, spawn, channel, mpsc, Mutex, RwLock, Atomic, async, await, Future, tokio, deadlock, race condition, 并发, 线程, 异步, 死锁"
user-invocable: false
---

# Concurrency

> **Layer 1: Language Mechanics**

## Core Question

**Is this CPU-bound or I/O-bound, and what's the sharing model?**

## Async Locking Guardrails

- Do not hold a `std::sync::MutexGuard` across `.await`. The task can be
  suspended while still holding the lock, which blocks an executor thread and
  can deadlock the runtime or starve other tasks.
- Keep the lock scope small: copy or take the data you need, drop the guard,
  await the I/O, then reacquire the lock only to write results back.
- If state genuinely must stay locked across an await point, use an
  async-aware lock such as `tokio::sync::Mutex`, and treat the long hold as a
  design smell worth revisiting.

---

## Error → Design Question

| Error | Don't Just Say | Ask Instead |
|-------|----------------|-------------|
| E0277 Send | "Add Send bound" | Should this type cross threads? |
| E0277 Sync | "Wrap in Mutex" | Is shared access really needed? |
| Future not Send | "Use spawn_local" | Is async the right choice? |
| Deadlock | "Reorder locks" | Is the locking design correct? |

---

## Anti-Patterns

| Anti-Pattern | Why Bad | Better |
|--------------|---------|--------|
| Arc<Mutex<T>> everywhere | Contention, complexity | Message passing |
| thread::sleep in async | Blocks executor | tokio::time::sleep |
| Holding locks across await | Blocks other tasks | Scope locks tightly |
| Ignoring deadlock risk | Hard to debug | Lock ordering, try_lock |

---

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| E0277 `Send` not satisfied | Non-Send in async | Use Arc or spawn_local |
| E0277 `Sync` not satisfied | Non-Sync shared | Wrap with Mutex |
| Deadlock | Lock ordering | Consistent lock order |
| `future is not Send` | Non-Send across await | Drop before await |
| `MutexGuard` across await | Guard held during suspend | Scope guard properly |

---

## Backpressure & Cancellation

- **Backpressure**: bound queues with `mpsc::channel(capacity)` or `Arc<Semaphore>`. When full, callers wait (backpressure) or overflow is dropped (load shedding). Never grow queues unbounded on external input.
- **CancellationToken** (`tokio_util::sync`): cooperative cancellation across a task tree. Signal with `token.cancel()`, await with `token.cancelled().await`, propagate with `token.child_token()`. Required for graceful shutdown.
- **Blocking work**: `spawn_blocking` offloads CPU-heavy or blocking-I/O calls to a dedicated thread pool, keeping async executor threads free.
- **Global init**: `OnceLock<T>` / `LazyLock<T>` for thread-safe lazy initialization — prefer over `static mut` (unsound, deprecated in edition 2024).

---

## Decision Flowchart

```
What type of work?
├─ CPU-bound → std::thread or rayon
├─ I/O-bound → async/await
└─ Mixed → hybrid (spawn_blocking)

Need to share data?
├─ No → message passing (channels)
├─ Immutable → Arc<T>
└─ Mutable →
   ├─ Read-heavy → Arc<RwLock<T>>
   └─ Write-heavy → Arc<Mutex<T>>
   └─ Simple counter → AtomicUsize

Async context?
├─ Type is Send → tokio::spawn
├─ Type is !Send → spawn_local
└─ Blocking code → spawn_blocking
```

Async runtime: use **tokio**. async-std was discontinued in 2025 (its
maintainers recommend smol for lightweight needs) — do not start new
projects on it.

---

## Trace Up ↑ (MANDATORY)

**CRITICAL**: Don't just fix the error. Trace UP to find domain constraints.

### Domain Detection Table

| Context Keywords | Load Domain Skill | Key Constraint |
|-----------------|-------------------|----------------|
| Web API, HTTP, axum, actix, handler | **domain-web** | Handlers run on any thread |
| 交易, 支付, trading, payment | **domain-fintech** | Audit + thread safety |
| gRPC, kubernetes, microservice | **domain-cloud-native** | Distributed tracing |
| CLI, terminal, clap | **domain-cli** | Usually single-thread OK |

### Example: Web API + Rc Error

```
"Rc cannot be sent between threads" in Web API context
    ↑ DETECT: "Web API" → Load domain-web
    ↑ FIND: domain-web says "Shared state must be thread-safe"
    ↑ FIND: domain-web says "Rc in state" is Common Mistake
    ↓ DESIGN: Use Arc<T> with State extractor
    ↓ IMPL: axum::extract::State<Arc<AppConfig>>
```

### Generic Trace

```
"Send not satisfied for my type"
    ↑ Ask: What domain is this? Load domain-* skill
    ↑ Ask: Does this type need to cross thread boundaries?
    ↑ Check: m09-domain (is the data model correct?)
```

| Situation | Trace To | Question |
|-----------|----------|----------|
| Send/Sync in Web | **domain-web** | What's the state management pattern? |
| Send/Sync in CLI | **domain-cli** | Is multi-thread really needed? |
| Mutex vs channels | m09-domain | Shared state or message passing? |
| Async vs threads | m10-performance | What's the workload profile? |

---

## Deep Dives (load on demand)

| File | Read when |
|------|-----------|
| `patterns/common-errors.md` | Fixing E0277 Send/Sync, deadlock patterns, guard-across-await — with code fixes |
| `patterns/async-patterns.md` | JoinSet, cancellation/graceful shutdown, semaphore backpressure, scoped async tasks |
| `examples/thread-patterns.md` | std scoped threads; OnceLock/LazyLock global init (edition 2024 static-mut note) |

---

## Related Skills

| When | See |
|------|-----|
| Smart pointer choice | m02-resource |
| Interior mutability | m03-mutability |
| Performance tuning | m10-performance |
| Domain concurrency needs | domain-* |
