---
name: m07-concurrency
description: "Diagnoses Send/Sync errors, implements thread-safe patterns, resolves async/await concurrency issues, and debugs deadlocks. Use when: E0277 Send Sync, cannot be sent between threads, thread, spawn, channel, mpsc, Mutex, RwLock, Atomic, async, await, Future, tokio, deadlock, race condition, 并发, 线程, 异步, 死锁"
user-invocable: false
---

# Concurrency

> **Layer 1: Language Mechanics**

## Core Question

**Is this CPU-bound or I/O-bound, and what's the sharing model?**

Before choosing concurrency primitives:
- What's the workload type?
- What data needs to be shared?
- What's the thread safety requirement?

---

## Error → Design Question

| Error | Don't Just Say | Ask Instead |
|-------|----------------|-------------|
| E0277 Send | "Add Send bound" | Should this type cross threads? |
| E0277 Sync | "Wrap in Mutex" | Is shared access really needed? |
| Future not Send | "Use spawn_local" | Is async the right choice? |
| Deadlock | "Reorder locks" | Is the locking design correct? |

---

## Workflow

1. **Identify workload type** → CPU-bound (threads/rayon) vs I/O-bound (async) vs mixed (spawn_blocking)
2. **Determine sharing model** → none (channels), immutable (Arc), mutable (Arc<Mutex/RwLock>)
3. **Check Send/Sync requirements** → validate types satisfy bounds for chosen concurrency model
4. **Trace up to domain** → load domain skill for context-specific constraints (see below)
5. **Implement and validate** → compile check for Send/Sync errors, test for deadlocks

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

## Send/Sync Markers

| Marker | Meaning | Example |
|--------|---------|---------|
| `Send` | Can transfer ownership between threads | Most types |
| `Sync` | Can share references between threads | `Arc<T>` |
| `!Send` | Must stay on one thread | `Rc<T>` |
| `!Sync` | No shared refs across threads | `RefCell<T>` |

## Quick Reference

| Pattern | Thread-Safe | Blocking | Use When |
|---------|-------------|----------|----------|
| `std::thread` | Yes | Yes | CPU-bound parallelism |
| `async/await` | Yes | No | I/O-bound concurrency |
| `Mutex<T>` | Yes | Yes | Shared mutable state |
| `RwLock<T>` | Yes | Yes | Read-heavy shared state |
| `mpsc::channel` | Yes | Optional | Message passing |
| `Arc<Mutex<T>>` | Yes | Yes | Shared mutable across threads |

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

## Common Patterns

### Thread + Channel (CPU-bound)

```rust
use std::sync::mpsc;
use std::thread;

let (tx, rx) = mpsc::channel();
let handle = thread::spawn(move || {
    let result = expensive_computation();
    tx.send(result).unwrap();
});
let value = rx.recv().unwrap(); // blocks until ready
handle.join().unwrap();
```

### Shared State with Arc<Mutex<T>>

```rust
use std::sync::{Arc, Mutex};
use std::thread;

let counter = Arc::new(Mutex::new(0));
let handles: Vec<_> = (0..4).map(|_| {
    let counter = Arc::clone(&counter);
    thread::spawn(move || {
        let mut num = counter.lock().unwrap();
        *num += 1;
    })
}).collect();
for h in handles { h.join().unwrap(); }
assert_eq!(*counter.lock().unwrap(), 4);
```

---

## Anti-Patterns

| Anti-Pattern | Why Bad | Better |
|--------------|---------|--------|
| Arc<Mutex<T>> everywhere | Contention, complexity | Message passing |
| thread::sleep in async | Blocks executor | tokio::time::sleep |
| Holding locks across await | Blocks other tasks | Scope locks tightly |
| Ignoring deadlock risk | Hard to debug | Lock ordering, try_lock |

---

## Async-Specific Patterns

### Avoid MutexGuard Across Await

```rust
// Bad: guard held across await
let guard = mutex.lock().await;
do_async().await;  // guard still held!

// Good: scope the lock
{
    let guard = mutex.lock().await;
    // use guard
}  // guard dropped
do_async().await;
```

### Non-Send Types in Async

```rust
// BAD: Rc held across await in spawned task
let data = Rc::new(vec![1, 2, 3]);
tokio::spawn(async move {
    println!("{:?}", data); // ERROR: Rc is !Send
});

// FIX 1: Use Arc instead
let data = Arc::new(vec![1, 2, 3]);
tokio::spawn(async move {
    println!("{:?}", data); // OK: Arc is Send
});

// FIX 2: Drop Rc before .await
{
    let data = Rc::new(vec![1, 2, 3]);
    let result = data.iter().sum::<i32>();
} // Rc dropped here
do_async().await; // OK: no Rc across await
```

---

## Related Skills

| When | See |
|------|-----|
| Smart pointer choice | m02-resource |
| Interior mutability | m03-mutability |
| Performance tuning | m10-performance |
| Domain concurrency needs | domain-* |
