---
name: m12-lifecycle
description: "Use when designing resource lifecycles. Keywords: RAII, Drop, resource lifecycle, connection pool, lazy initialization, connection pool design, resource cleanup patterns, cleanup, scope, OnceCell, Lazy, once_cell, OnceLock, transaction, session management, when is Drop called, cleanup on error, guard pattern, scope guard, 资源生命周期, 连接池, 惰性初始化, 资源清理, RAII 模式"
user-invocable: false
---

# Resource Lifecycle

> **Layer 2: Design Choices**

## Core Question

**When should this resource be created, used, and cleaned up?**

Before implementing lifecycle:
- What's the resource's scope?
- Who owns the cleanup responsibility?
- What happens on error?

---

## Lifecycle Pattern → Implementation

| Pattern | When | Implementation |
|---------|------|----------------|
| RAII | Auto cleanup | `Drop` trait |
| Lazy init | Deferred creation | `OnceLock`, `LazyLock` |
| Pool | Reuse expensive resources | `r2d2`, `deadpool` |
| Guard | Scoped access | `MutexGuard` pattern |
| Scope | Transaction boundary | Custom struct + Drop |

---

## Decision Workflow

1. **Assess resource cost** → determines creation strategy
   - Cheap → create per use, no pooling needed
   - Expensive (DB conn, TLS handshake) → pool or cache
   - Global config → lazy singleton (`OnceLock`)

2. **Determine scope** → determines ownership
   - Function-local → stack allocation, `Drop` handles cleanup
   - Request-scoped → pass by reference or extract from state
   - Application-wide → `'static` via `OnceLock` or `Arc`

3. **Plan error cleanup** → determines cleanup mechanism
   - Cleanup must always happen → implement `Drop`
   - Cleanup can fail → provide explicit `.close() -> Result<()>`, call in `Drop` as best-effort
   - Partial init → use `Option::take()` in `Drop` to avoid E0509

4. **Validate**: Does `Drop` run in all exit paths? (panic, early return, `?`)

---

## Trace Up ↑

To domain constraints (Layer 3):

```
"How should I manage database connections?"
    ↑ Ask: What's the connection cost?
    ↑ Check: domain-* (latency requirements)
    ↑ Check: Infrastructure (connection limits)
```

| Question | Trace To | Ask |
|----------|----------|-----|
| Connection pooling | domain-* | What's acceptable latency? |
| Resource limits | domain-* | What are infra constraints? |
| Transaction scope | domain-* | What must be atomic? |

---

## Trace Down ↓

To implementation (Layer 1):

```
"Need automatic cleanup"
    ↓ m02-resource: Implement Drop
    ↓ m01-ownership: Clear owner for cleanup

"Need lazy initialization"
    ↓ m03-mutability: OnceLock for thread-safe
    ↓ m07-concurrency: LazyLock for sync

"Need connection pool"
    ↓ m07-concurrency: Thread-safe pool
    ↓ m02-resource: Arc for sharing
```

---

## Pattern Templates

### RAII Guard

```rust
struct FileGuard {
    path: PathBuf,
    _handle: File,
}

impl Drop for FileGuard {
    fn drop(&mut self) {
        // Cleanup: remove temp file
        let _ = std::fs::remove_file(&self.path);
    }
}
```

### Lazy Singleton

```rust
use std::sync::OnceLock;

static CONFIG: OnceLock<Config> = OnceLock::new();

fn get_config() -> &'static Config {
    CONFIG.get_or_init(|| {
        Config::load().expect("config required")
    })
}
```

### Connection Pool (deadpool)

```rust
use deadpool_postgres::{Config, Pool, Runtime};
use tokio_postgres::NoTls;

fn create_pool() -> Pool {
    let mut cfg = Config::new();
    cfg.host = Some("localhost".into());
    cfg.dbname = Some("mydb".into());
    cfg.pool = Some(deadpool_postgres::PoolConfig::new(16)); // max connections
    cfg.create_pool(Some(Runtime::Tokio1), NoTls).unwrap()
}

async fn query(pool: &Pool) -> Result<(), Box<dyn std::error::Error>> {
    let client = pool.get().await?; // borrows from pool
    let rows = client.query("SELECT 1", &[]).await?;
    // client returned to pool on drop
    Ok(())
}
```

### Scope Guard (Transaction Boundary)

```rust
struct Transaction<'a> {
    conn: &'a mut Connection,
    committed: bool,
}

impl<'a> Transaction<'a> {
    fn begin(conn: &'a mut Connection) -> Self {
        conn.execute("BEGIN");
        Self { conn, committed: false }
    }
    fn commit(mut self) {
        self.conn.execute("COMMIT");
        self.committed = true;
    }
}

impl Drop for Transaction<'_> {
    fn drop(&mut self) {
        if !self.committed {
            self.conn.execute("ROLLBACK"); // auto-rollback on error
        }
    }
}
```

---

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| Resource leak | Forgot Drop | Implement Drop or RAII wrapper |
| Double free | Manual memory | Let Rust handle |
| Use after drop | Dangling reference | Check lifetimes |
| E0509 move out of Drop | Moving owned field | `Option::take()` |
| Pool exhaustion | Not returned | Ensure Drop returns |

---

## Anti-Patterns

| Anti-Pattern | Why Bad | Better |
|--------------|---------|--------|
| Manual cleanup | Easy to forget | RAII/Drop |
| `lazy_static!` | External dep | `std::sync::OnceLock` |
| Global mutable state | Thread unsafety | `OnceLock` or proper sync |
| Forget to close | Resource leak | Drop impl |

---

## Related Skills

| When | See |
|------|-----|
| Smart pointers | m02-resource |
| Thread-safe init | m07-concurrency |
| Domain scopes | m09-domain |
| Error in cleanup | m06-error-handling |
