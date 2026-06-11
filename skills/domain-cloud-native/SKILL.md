---
name: domain-cloud-native
description: "Use when building cloud-native apps. Keywords: kubernetes, k8s, docker, container, grpc, tonic, microservice, service mesh, observability, tracing, metrics, health check, cloud, deployment, 云原生, 微服务, 容器"
user-invocable: false
---

# Cloud-Native Domain

> **Layer 3: Domain Constraints**

## Domain Constraints -> Rust Implications

| Domain Rule | Rust Implication |
|-------------|------------------|
| Pods are killed/rescheduled anytime | Stateless: external state (Redis, DB), no local files, no `static mut` |
| Kubernetes sends SIGTERM, then SIGKILL after grace period | Handle **SIGTERM** (not just ctrl_c) + graceful connection draining |
| 12-Factor config | Config from env vars + mounted secrets (`figment`, `config`) |
| Distributed debugging | `tracing` spans + opentelemetry export on every request |
| Container-friendly | Small static binaries, release profile optimization |

## Liveness vs Readiness

| Probe | Question | On failure | Should check |
|-------|----------|------------|--------------|
| `/health` (liveness) | Is the process alive? | Pod restarted | Nothing but the process itself |
| `/ready` (readiness) | Can it serve traffic? | Removed from load balancer | Dependencies (DB, cache, downstream) |

Never check dependencies in liveness -- a flaky DB would restart-loop every pod.

## Key Crates

| Purpose | Crate |
|---------|-------|
| gRPC | tonic |
| Kubernetes API | kube, kube-runtime |
| Docker | bollard |
| Tracing | tracing, opentelemetry |
| Metrics | prometheus, metrics |
| Config | config, figment |

## Code Pattern: Graceful Shutdown (axum 0.8)

`axum::Server` was removed in axum 0.7 -- use `axum::serve` with a
`TcpListener`. The shutdown future must race ctrl_c with SIGTERM, or
Kubernetes will hard-kill the pod after the grace period.

```rust
use std::net::SocketAddr;
use axum::{routing::get, Router};
use tokio::net::TcpListener;
use tokio::signal;

async fn run_server() -> anyhow::Result<()> {
    let app = Router::new()
        .route("/health", get(health))
        .route("/ready", get(ready));

    let listener = TcpListener::bind(SocketAddr::from(([0, 0, 0, 0], 8080))).await?;
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;
    Ok(())
}

async fn shutdown_signal() {
    let ctrl_c = async {
        signal::ctrl_c().await.expect("ctrl_c handler");
    };
    #[cfg(unix)]
    let terminate = async {
        signal::unix::signal(signal::unix::SignalKind::terminate())
            .expect("SIGTERM handler")
            .recv()
            .await;
    };
    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }
    tracing::info!("shutdown signal received, draining connections");
}
```

## Code Pattern: Probes

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

## Common Mistakes

| Mistake | Domain Violation | Fix |
|---------|-----------------|-----|
| Only handling ctrl_c | SIGTERM ignored -> hard kill in k8s | Race ctrl_c with `SignalKind::terminate()` |
| Checking DB in liveness probe | Restart loop on flaky dependency | Dependencies belong in readiness only |
| Local file state | Lost on reschedule | External storage |
| Static/baked-in config | Not 12-factor | Env vars + secrets |
| No trace propagation | Cannot debug across services | tracing + opentelemetry context |

## Related Skills

| When | See |
|------|-----|
| Axum handlers, extractors, middleware | domain-web |
| Async patterns, signals | m07-concurrency |
| Error handling, retries | m13-domain-error |
| Span/resource lifecycle | m12-lifecycle |
