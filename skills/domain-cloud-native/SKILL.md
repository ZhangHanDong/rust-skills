---
name: domain-cloud-native
description: "Use when containerizing Rust services, deploying to Kubernetes, implementing gRPC with Tonic, adding distributed tracing and metrics, or configuring health checks and graceful shutdown for microservices. Writes Dockerfiles, K8s manifests, service mesh config, and observability pipelines. Keywords: kubernetes, k8s, docker, container, grpc, tonic, microservice, service mesh, observability, tracing, metrics, health check, cloud, deployment, 云原生, 微服务, 容器"
user-invocable: false
---

# Cloud-Native Domain

> **Layer 3: Domain Constraints**

## Domain Constraints → Design Implications

| Domain Rule | Design Constraint | Rust Implication |
|-------------|-------------------|------------------|
| 12-Factor | Config from env | Environment-based config |
| Observability | Metrics + traces | tracing + opentelemetry |
| Health checks | Liveness/readiness | Dedicated endpoints |
| Graceful shutdown | Clean termination | Signal handling |
| Horizontal scale | Stateless design | No local state |
| Container-friendly | Small binaries | Release optimization |

---

## Critical Constraints

### Stateless Design

```rust
// WRONG: Local file state — pods can be killed/rescheduled anytime
static mut CACHE: Vec<String> = Vec::new(); // Never do this

// RIGHT: External state via shared client
struct AppState {
    redis: deadpool_redis::Pool,
    db: sqlx::PgPool,
}
```

### Graceful Shutdown

```rust
// Handle SIGTERM for zero-downtime deployments
use tokio::signal::unix::{signal, SignalKind};

async fn shutdown_signal() {
    let mut sigterm = signal(SignalKind::terminate()).expect("SIGTERM listener");
    tokio::select! {
        _ = signal::ctrl_c() => tracing::info!("SIGINT received"),
        _ = sigterm.recv() => tracing::info!("SIGTERM received"),
    }
}
```

### Observability

```rust
// Every request must be traceable — init OTEL tracing pipeline
use opentelemetry::trace::TracerProvider;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

fn init_tracing() {
    let exporter = opentelemetry_otlp::SpanExporter::builder()
        .with_tonic().build().expect("OTLP exporter");
    let provider = opentelemetry_sdk::trace::SdkTracerProvider::builder()
        .with_batch_exporter(exporter)
        .build();
    let telemetry = tracing_opentelemetry::layer()
        .with_tracer(provider.tracer("my-service"));
    tracing_subscriber::registry()
        .with(tracing_subscriber::fmt::layer())
        .with(telemetry)
        .init();
}
```

---

## Cloud-Native Service Workflow

1. **Init tracing** — Call `init_tracing()` before anything else
   - Verify: `RUST_LOG=debug cargo run` shows spans in stdout
2. **Add health endpoints** — `/health` (liveness) + `/ready` (readiness with DB ping)
   - Verify: `curl localhost:8080/health` returns 200
3. **Wire graceful shutdown** — `with_graceful_shutdown(shutdown_signal())`
   - Verify: `kill -SIGTERM <pid>` logs "SIGTERM received", connections drain
4. **Containerize** — Multi-stage Dockerfile, final image `FROM scratch` or `distroless`
   - Verify: `docker build && docker run -p 8080:8080`, health check passes
5. **Deploy** — K8s Deployment with `livenessProbe` + `readinessProbe` on health endpoints
   - Verify: `kubectl rollout status deployment/my-service`

---

## Key Crates

| Purpose | Crate |
|---------|-------|
| gRPC | tonic |
| Kubernetes | kube, kube-runtime |
| Docker | bollard |
| Tracing | tracing, opentelemetry |
| Metrics | prometheus, metrics |
| Config | config, figment |
| Health | HTTP endpoints |

## Design Patterns

| Pattern | Purpose | Implementation |
|---------|---------|----------------|
| gRPC services | Service mesh | tonic + tower |
| K8s operators | Custom resources | kube-runtime Controller |
| Observability | Debugging | tracing + OTEL |
| Health checks | Orchestration | `/health`, `/ready` |
| Config | 12-factor | Env vars + secrets |

## Code Pattern: Full Cloud-Native Service

```rust
use axum::{routing::get, Router};
use std::net::SocketAddr;
use tokio::signal;

async fn run_server() -> anyhow::Result<()> {
    init_tracing(); // Step 1: observability first

    let app = Router::new()
        .route("/health", get(health))
        .route("/ready", get(ready));

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8080").await?;
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    opentelemetry::global::shutdown_tracer_provider();
    Ok(())
}
```

## Health Check Pattern

```rust
async fn health() -> StatusCode {
    StatusCode::OK
}

async fn ready(State(db): State<Arc<DbPool>>) -> StatusCode {
    match db.ping().await {
        Ok(_) => StatusCode::OK,
        Err(_) => StatusCode::SERVICE_UNAVAILABLE,
    }
}
```

---

## Common Mistakes

| Mistake | Domain Violation | Fix |
|---------|-----------------|-----|
| Local file state | Not stateless | External storage |
| No SIGTERM handling | Hard kills | Graceful shutdown |
| No tracing | Can't debug | tracing spans |
| Static config | Not 12-factor | Env vars |

---

## Related Skills

| When | See |
|------|-----|
| Async patterns | m07-concurrency |
| HTTP endpoints | domain-web |
| Error handling | m13-domain-error |
| Resource lifecycle | m12-lifecycle |
