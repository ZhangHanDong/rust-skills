---
name: m13-domain-error
description: "Use when designing domain error handling. Keywords: domain error, error categorization, recovery strategy, retry, fallback, domain error hierarchy, user-facing vs internal errors, error code design, circuit breaker, graceful degradation, resilience, error context, backoff, retry with backoff, error recovery, transient vs permanent error, 领域错误, 错误分类, 恢复策略, 重试, 熔断器, 优雅降级"
user-invocable: false
---

# Domain Error Strategy

> **Layer 2: Design Choices**

**Boundary:** m06-error-handling owns the mechanics (Result/Option/panic,
thiserror/anyhow usage). This skill owns the policy layer: error taxonomy,
what to retry, what users see, and when to stop trying.

## Core Question

**Who needs to handle this error, and how should they recover?**

---

## Error Categorization

| Error Type | Audience | Recovery | Example |
|------------|----------|----------|---------|
| User-facing | End users | Guide action | `InvalidEmail`, `NotFound` |
| Internal | Developers | Debug info | `DatabaseError`, `ParseError` |
| System | Ops/SRE | Monitor/alert | `ConnectionTimeout`, `RateLimited` |
| Transient | Automation | Retry | `NetworkError`, `ServiceUnavailable` |
| Permanent | Human | Investigate | `ConfigInvalid`, `DataCorrupted` |

---

## Recovery Patterns

| Recovery Pattern | When | Implementation |
|------------------|------|----------------|
| Retry | Transient failures | exponential backoff via `backon` (or `tokio-retry2`) |
| Fallback | Degraded mode | cached/default value |
| Circuit Breaker | Cascading failures | `failsafe` crate |
| Timeout | Slow operations | `tokio::time::timeout` |
| Bulkhead | Isolation | separate pools / `tokio::sync::Semaphore` |

Crate currency: `tokio-retry` (2021) and `backoff` are unmaintained — use
`backon` (sync + async, builder-based backoff) or `tokio-retry2` instead.

---

## Error Hierarchy

Encode the recovery policy in the type, then let retry code consult it:

```rust
#[derive(thiserror::Error, Debug)]
pub enum AppError {
    // User-facing
    #[error("Invalid input: {0}")]
    Validation(String),

    // Transient (retryable)
    #[error("Service temporarily unavailable")]
    ServiceUnavailable(#[source] Box<dyn std::error::Error + Send + Sync>),

    // Internal (log details, show generic message)
    #[error("Internal error")]
    Internal(#[source] anyhow::Error),
}

impl AppError {
    pub fn is_retryable(&self) -> bool {
        matches!(self, Self::ServiceUnavailable(_))
    }
}
```

The transient variant boxes its source so the domain error does not
hard-wire a transport crate (reqwest, sqlx) into the domain API.

## Retry Pattern (backon)

```rust
use backon::{ExponentialBuilder, Retryable};
use std::time::Duration;

async fn fetch_with_retry() -> Result<String, AppError> {
    fetch_data
        .retry(
            ExponentialBuilder::default()
                .with_min_delay(Duration::from_millis(100))
                .with_max_delay(Duration::from_secs(10))
                .with_max_times(5),
        )
        .when(|e| e.is_retryable())  // never retry permanent errors
        .await
}
```

Hand-rolling the generic signature? `F: Fn() -> impl Future<...>` is not
valid Rust (E0562). Use two type parameters:
`F: Fn() -> Fut, Fut: Future<Output = Result<T, E>>`.

---

## Design Mistakes

(Mechanics-level anti-patterns — unwrap everywhere, stringly-typed errors,
`Box<dyn Error>` in APIs — live in m06-error-handling.)

| Mistake | Why Wrong | Better |
|---------|-----------|--------|
| Same error for all audiences | No actionability | Categorize by audience |
| Retry everything | Wasted resources, hides bugs | Retry only transient errors |
| Infinite retry | DoS yourself | Max attempts + backoff (+ jitter) |
| Expose internal errors to users | Security risk | Generic message, log details |
| No context on propagation | Hard to debug | `.with_context(|| ...)` at boundaries |

---

## Trace Up ↑

To domain constraints (Layer 3):

| Question | Trace To | Ask |
|----------|----------|-----|
| Retry policy | domain-* | What's acceptable latency for retry? |
| User experience | domain-* | What message should users see? |
| Compliance | domain-* | What must be logged for audit? |

---

## Related Skills

| When | See |
|------|-----|
| Result/Option/panic, thiserror/anyhow mechanics | m06-error-handling |
| Send/Sync, locks, async runtime mechanics | m07-concurrency |
| Domain modeling | m09-domain |
| User-facing APIs | domain-* |
