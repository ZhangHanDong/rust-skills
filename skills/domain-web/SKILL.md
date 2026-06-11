---
name: domain-web
description: "Use when building web services. Keywords: web server, HTTP, REST API, GraphQL, WebSocket, axum, actix, warp, rocket, tower, hyper, reqwest, middleware, router, handler, extractor, state management, authentication, authorization, JWT, session, cookie, CORS, rate limiting, web 开发, HTTP 服务, API 设计, 中间件, 路由"
globs: ["**/Cargo.toml"]
user-invocable: false
---

# Web Domain

> **Layer 3: Domain Constraints**

## Domain Constraints -> Rust Implications

| Domain Rule | Rust Implication |
|-------------|------------------|
| Handlers must not block (one blocked task stalls many requests) | async handlers; `tokio::task::spawn_blocking` for CPU-bound work |
| Handlers run on any worker thread | Shared state must be `Send + Sync`: `Arc<T>`, `Arc<RwLock<T>>` for mutable |
| Stateless HTTP, no request-local globals | State injected via extractors (`State<Arc<AppState>>`) |
| Input is untrusted | Type-safe extractors (`Json<T>`, `Path<T>`), validated newtypes |
| Requests must be traceable | `tracing` spans + tower layers |

## Framework Comparison

| Framework | Style | Best For |
|-----------|-------|----------|
| axum | Functional, tower-native | Modern APIs (default choice) |
| actix-web | Tokio-based, mature ecosystem | High performance services |
| rocket | Macro-driven | Rapid development |
| warp | Filter composition | Maintenance mode -- avoid for new projects |

## Key Crates

| Purpose | Crate |
|---------|-------|
| HTTP server | axum, actix-web |
| HTTP client | reqwest |
| JSON | serde_json |
| Auth/JWT | jsonwebtoken |
| Session | tower-sessions |
| Database | sqlx, diesel |
| Middleware | tower |

## Code Pattern: Axum Handler (axum 0.8)

```rust
use std::sync::Arc;
use axum::extract::{Json, State};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use serde_json::json;

async fn handler(
    State(db): State<Arc<DbPool>>,
    Json(payload): Json<CreateUser>,
) -> Result<Json<User>, AppError> {
    let user = db.create_user(&payload).await?;
    Ok(Json(user))
}

// One unified error type for the whole API surface
impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, message) = match self {
            Self::NotFound => (StatusCode::NOT_FOUND, "Not found"),
            Self::Internal(_) => (StatusCode::INTERNAL_SERVER_ERROR, "Internal error"),
        };
        (status, Json(json!({"error": message}))).into_response()
    }
}
```

## Common Mistakes

| Mistake | Consequence | Fix |
|---------|-------------|-----|
| Blocking call in async handler | Latency spike across requests | `spawn_blocking` |
| `Rc`/`RefCell` in shared state | E0277: not `Send + Sync` | `Arc<T>`, `Arc<RwLock<T>>` |
| Holding `MutexGuard` across `.await` | Future not `Send`; deadlock risk | Drop the guard before `.await` |
| Returning raw errors from handlers | Leaks internals, inconsistent responses | Single `AppError` with `IntoResponse` |
| No input validation | Security risk | Typed extractors + `validator` |

## Related Skills

| When | See |
|------|-----|
| Async patterns, Send/Sync errors | m07-concurrency |
| Shared state design | m02-resource |
| Error handling design | m06-error-handling |
| Middleware lifecycle | m12-lifecycle |
| Server bootstrap, graceful shutdown, health endpoints | domain-cloud-native |
