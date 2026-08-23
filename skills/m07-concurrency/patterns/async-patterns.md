# Async Patterns (tokio)

Beyond-basics patterns only. For plain `spawn`/`select!`/channel usage, rely
on the tokio docs.

## JoinSet: Dynamic Task Groups

Collects results from a dynamic number of spawned tasks. Dropping the set
aborts all remaining tasks — structured cancellation for free.

```rust
use tokio::task::JoinSet;

async fn parallel_fetch(urls: Vec<String>) -> Vec<Result<Response, Error>> {
    let mut set = JoinSet::new();

    for url in urls {
        set.spawn(async move { fetch(&url).await });
    }

    let mut results = vec![];
    while let Some(res) = set.join_next().await {
        results.push(res.unwrap());
    }
    results
}
```

## Scoped Async Tasks (borrowing instead of 'static)

`tokio::spawn` requires `'static` futures. To borrow local data, the
`async-scoped` crate works — but it needs the easy-to-miss `use-tokio`
feature:

```toml
async-scoped = { version = "0.9", features = ["use-tokio"] }
```

```rust
use async_scoped::TokioScope;

async fn scoped_example(data: &[u32]) {
    let results = TokioScope::scope_and_block(|scope| {
        for item in data {
            scope.spawn(async move { process(item).await });
        }
    });
}
```

`scope_and_block` blocks the current thread. Prefer restructuring to owned
data + `JoinSet` unless borrowing is essential.

## Cancellation: CancellationToken

From `tokio_util` (not core tokio). `token.child_token()` cancels a subtree
without affecting the parent.

```rust
use tokio_util::sync::CancellationToken;

async fn cancellable_task(token: CancellationToken) {
    loop {
        tokio::select! {
            _ = token.cancelled() => {
                println!("Task cancelled");
                break;
            }
            _ = do_work() => {
                // Continue working
            }
        }
    }
}

async fn run_with_cancellation() {
    let token = CancellationToken::new();
    let task_token = token.clone();

    let handle = tokio::spawn(cancellable_task(task_token));

    tokio::time::sleep(std::time::Duration::from_secs(5)).await;
    token.cancel();

    handle.await.unwrap();
}
```

## Graceful Shutdown

To poll the same shutdown future across loop iterations, `select!` needs
`&mut shutdown` — and `&mut F` is only a `Future` when `F: Unpin`, so pin it
first. Forgetting `tokio::pin!` is E0277: "`&mut impl Future` is not a
future" / "cannot be unpinned".

```rust
use std::future::Future;
use tokio::net::TcpListener;

async fn serve_with_shutdown(shutdown: impl Future<Output = ()>) {
    let listener = TcpListener::bind("0.0.0.0:8080").await.unwrap();
    tokio::pin!(shutdown);

    loop {
        tokio::select! {
            Ok((socket, _)) = listener.accept() => {
                tokio::spawn(handle_connection(socket));
            }
            _ = &mut shutdown => {
                println!("Shutting down...");
                break;
            }
        }
    }
}

#[tokio::main]
async fn main() {
    let ctrl_c = async {
        tokio::signal::ctrl_c().await.unwrap();
    };

    serve_with_shutdown(ctrl_c).await;
}
```

## Backpressure: Semaphore for Concurrency Limits

A bounded `mpsc::channel(n)` gives queue backpressure (senders wait when
full). A `Semaphore` caps in-flight work directly:

```rust
use std::sync::Arc;
use tokio::sync::Semaphore;

async fn rate_limited_requests(urls: Vec<String>) {
    let semaphore = Arc::new(Semaphore::new(10));  // max 10 concurrent

    let handles: Vec<_> = urls
        .into_iter()
        .map(|url| {
            let sem = Arc::clone(&semaphore);
            tokio::spawn(async move {
                let _permit = sem.acquire().await.unwrap();
                fetch(&url).await
            })
        })
        .collect();

    for handle in handles {
        handle.await.unwrap();
    }
}
```
