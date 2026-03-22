---
name: m13-domain-error
description: "Use when designing domain error handling. Keywords: domain error, error categorization, recovery strategy, retry, fallback, domain error hierarchy, user-facing vs internal errors, error code design, circuit breaker, graceful degradation, resilience, error context, backoff, retry with backoff, error recovery, transient vs permanent error, 领域错误, 错误分类, 恢复策略, 重试, 熔断器, 优雅降级"
user-invocable: false
---

# Domain Error Strategy

> **Layer 2: Design Choices**

## Workflow

1. **Categorize the error** — Determine audience and recovery (see table below)
2. **Design the hierarchy** — Create typed errors with `thiserror`, grouped by category
3. **Add context** — Attach `.context()` at every propagation boundary
4. **Wire recovery** — Match error category to recovery pattern (retry, fallback, circuit breaker)
5. **Validate** — Confirm: user-facing errors are friendly, internal errors are debuggable, transient errors are retried

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
| Retry | Transient failures | exponential backoff |
| Fallback | Degraded mode | cached/default value |
| Circuit Breaker | Cascading failures | failsafe-rs |
| Timeout | Slow operations | `tokio::time::timeout` |
| Bulkhead | Isolation | separate thread pools |

## Error Hierarchy

```rust
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    // User-facing — shown directly to end users
    #[error("Invalid input: {0}")]
    Validation(String),

    #[error("Resource not found: {resource}")]
    NotFound { resource: String },

    // Transient — safe to retry
    #[error("Service temporarily unavailable")]
    ServiceUnavailable(#[source] reqwest::Error),

    // Internal — log detail, show generic message to users
    #[error("Internal error")]
    Internal(#[from] anyhow::Error),
}

impl AppError {
    pub fn is_retryable(&self) -> bool {
        matches!(self, Self::ServiceUnavailable(_))
    }

    /// Map to user-safe message at API boundary
    pub fn user_message(&self) -> &str {
        match self {
            Self::Validation(msg) => msg,
            Self::NotFound { .. } => "The requested resource was not found",
            Self::ServiceUnavailable(_) => "Please try again shortly",
            Self::Internal(_) => "An unexpected error occurred",
        }
    }
}
```

## Retry with Backoff

```rust
use std::time::Duration;
use tokio_retry::strategy::ExponentialBackoff;
use tokio_retry::Retry;

async fn fetch_with_retry(url: &str) -> Result<String, AppError> {
    let strategy = ExponentialBackoff::from_millis(100)
        .max_delay(Duration::from_secs(10))
        .take(3); // max 3 attempts

    let url = url.to_owned();
    Retry::spawn(strategy, move || {
        let url = url.clone();
        async move {
            reqwest::get(&url)
                .await
                .map_err(AppError::ServiceUnavailable)?
                .text()
                .await
                .map_err(AppError::ServiceUnavailable)
        }
    })
    .await
}
```

## Context Propagation

```rust
use anyhow::Context;

fn load_config(path: &str) -> Result<Config, anyhow::Error> {
    let contents = std::fs::read_to_string(path)
        .context(format!("failed to read config from {path}"))?;
    toml::from_str(&contents)
        .context("failed to parse config as TOML")
}
```

---

## Common Mistakes

| Mistake | Better |
|---------|--------|
| Same error type for all cases | Categorize by audience (user/dev/ops) |
| Retry everything | Only retry transient errors (`is_retryable()`) |
| Infinite retry / no backoff | Max attempts + exponential backoff |
| Expose internal errors to users | Map to user-friendly messages at API boundary |
| No `.context()` on propagation | Add context at every `?` boundary |
| `String` or `Box<dyn Error>` everywhere | Use `thiserror` typed enums |
| `panic!` for recoverable errors | Return `Result` with context |
| Errors in happy path | Validate early, fail before work begins |

---

## Related Skills

| When | See |
|------|-----|
| Error handling basics | m06-error-handling |
| Retry implementation | m07-concurrency |
| Domain modeling | m09-domain |
| User-facing APIs | domain-* |
