---
name: domain-web
description: "Use when building web services. Keywords: web server, HTTP, REST API, GraphQL, WebSocket, axum, actix, warp, rocket, tower, hyper, reqwest, middleware, router, handler, extractor, state management, authentication, authorization, JWT, session, cookie, CORS, rate limiting, web 开发, HTTP 服务, API 设计, 中间件, 路由"
globs: ["**/Cargo.toml"]
user-invocable: false
---

# Web Domain

> **Layer 3: Domain Constraints**

## Domain Constraints → Design Implications

| Domain Rule | Design Constraint | Rust Implication |
|-------------|-------------------|------------------|
| Stateless HTTP | No request-local globals | State in extractors |
| Concurrency | Handle many connections | Async, Send + Sync |
| Latency SLA | Fast response | Efficient ownership |
| Security | Input validation | Type-safe extractors |
| Observability | Request tracing | tracing + tower layers |

---

## Critical Constraints

### Async by Default

```
RULE: Web handlers must not block
WHY: Block one task = block many requests
RUST: async/await, spawn_blocking for CPU work
```

### State Management

```
RULE: Shared state must be thread-safe
WHY: Handlers run on any thread
RUST: Arc<T>, Arc<RwLock<T>> for mutable
```

### Request Lifecycle

```
RULE: Resources live only for request duration
WHY: Memory management, no leaks
RUST: Extractors, proper ownership
```

---

## Framework Comparison

| Framework | Style | Best For |
|-----------|-------|----------|
| axum | Functional, tower | Modern APIs |
| actix-web | Actor-based | High performance |
| warp | Filter composition | Composable APIs |
| rocket | Macro-driven | Rapid development |

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

## Design Patterns

| Pattern | Purpose | Implementation |
|---------|---------|----------------|
| Extractors | Request parsing | `State(db)`, `Json(payload)` |
| Error response | Unified errors | `impl IntoResponse` |
| Middleware | Cross-cutting | Tower layers |
| Shared state | App config | `Arc<AppState>` |

## Workflow: Build a Web Endpoint

1. **Define types** — request/response structs with serde derives
2. **Implement handler** — async fn with extractors, return `Result<impl IntoResponse, AppError>`
3. **Add error type** — enum implementing `IntoResponse` for consistent error JSON
4. **Wire router** — register routes with shared state via `Router::new().route(...).with_state(...)`
5. **Validate** — confirm handler compiles with `cargo check`, test with `cargo test`

## Code Pattern: Axum CRUD Endpoint

```rust
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::RwLock;

#[derive(Serialize, Clone)]
struct User { id: u64, name: String }

#[derive(Deserialize)]
struct CreateUser { name: String }

// Shared application state
struct AppState { users: RwLock<Vec<User>> }

// Handler: create user
async fn create_user(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<CreateUser>,
) -> Result<(StatusCode, Json<User>), AppError> {
    let mut users = state.users.write().await;
    let user = User { id: users.len() as u64 + 1, name: payload.name };
    users.push(user.clone());
    Ok((StatusCode::CREATED, Json(user)))
}

// Handler: list users
async fn list_users(
    State(state): State<Arc<AppState>>,
) -> Json<Vec<User>> {
    Json(state.users.read().await.clone())
}

// Unified error type
enum AppError { NotFound, Internal(String) }

impl IntoResponse for AppError {
    fn into_response(self) -> axum::response::Response {
        let (status, msg) = match self {
            Self::NotFound => (StatusCode::NOT_FOUND, "not found"),
            Self::Internal(e) => (StatusCode::INTERNAL_SERVER_ERROR, Box::leak(e.into_boxed_str()) as &str),
        };
        (status, Json(serde_json::json!({"error": msg}))).into_response()
    }
}

// Router setup
fn app() -> Router {
    let state = Arc::new(AppState { users: RwLock::new(vec![]) });
    Router::new()
        .route("/users", get(list_users).post(create_user))
        .with_state(state)
}
```

---

## Common Mistakes

| Mistake | Domain Violation | Fix |
|---------|-----------------|-----|
| Blocking in handler | Latency spike | spawn_blocking |
| Rc in state | Not Send + Sync | Use Arc |
| No validation | Security risk | Type-safe extractors |
| No error response | Bad UX | IntoResponse impl |

---

## Related Skills

| Need | Skill | Example |
|------|-------|---------|
| Async/concurrency | m07-concurrency | tokio runtime, Send + Sync bounds |
| Shared state | m02-resource | Arc<T>, Arc<RwLock<T>> |
| Error handling | m06-error-handling | IntoResponse, Result patterns |
| Middleware/RAII | m12-lifecycle | Tower layers, Drop-based cleanup |
| Type-safe extractors | m05-type-driven | Validated newtypes for request data |
