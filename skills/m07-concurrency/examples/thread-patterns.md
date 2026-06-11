# Thread Patterns (std)

Non-obvious std threading patterns. Basic `thread::spawn` / `Arc<Mutex<T>>`
counters / mpsc loops are textbook — see `../patterns/common-errors.md` for
the error-driven versions (E0277, deadlocks).

## Scoped Threads: Borrow Without 'static (std, since 1.63)

`std::thread::scope` joins all threads before returning, so spawned closures
may borrow from the enclosing scope — no `Arc`, no `'static`, no
`crossbeam::scope` needed:

```rust
use std::thread;

fn process_data(data: &[u32]) -> Vec<u32> {
    thread::scope(|s| {
        let handles: Vec<_> = data
            .chunks(2)
            .map(|chunk| {
                s.spawn(|| {
                    chunk.iter().map(|x| x * 2).collect::<Vec<_>>()
                })
            })
            .collect();

        handles
            .into_iter()
            .flat_map(|h| h.join().unwrap())
            .collect()
    })
}
```

## One-Time / Lazy Global Init: OnceLock and LazyLock

The old `static mut CONFIG` + `std::sync::Once` pattern is a **hard error on
edition 2024** (`static_mut_refs`: "creating a shared reference to mutable
static"). Prefer std over `once_cell`/`lazy_static`, which are superseded:

```rust
use std::sync::{LazyLock, OnceLock};

// LazyLock (stable 1.80): initialized on first access
static CONFIG: LazyLock<Config> = LazyLock::new(load_config);

// OnceLock (stable 1.70): when init needs runtime input
static SETTINGS: OnceLock<Config> = OnceLock::new();

fn init(settings: Config) {
    if SETTINGS.set(settings).is_err() {
        panic!("init called twice");
    }
}

fn settings() -> &'static Config {
    SETTINGS.get().expect("initialized in main")
}
```

## CPU Parallelism Over Collections

Reach for `rayon` (`par_iter`) before hand-rolling worker pools with
channels; it handles work stealing and panic propagation for you.
