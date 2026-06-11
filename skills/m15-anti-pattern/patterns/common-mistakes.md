# Cross-Cutting Anti-Patterns

Mechanics covered in depth elsewhere are listed as guardrails with pointers;
worked examples below cover the review-specific smells no other skill owns.

## Guardrail Pointers

| Anti-pattern family | Guardrail | Detailed treatment |
|---------------------|-----------|--------------------|
| Clone to escape borrow checker | Borrow (`for item in &data`) when you don't need ownership; restructure before cloning | m01-ownership; m14-mental-model escape patterns |
| `.unwrap()` / `panic!` in libraries | Libraries return `Result`; never panic on user input | m06-error-handling |
| Ignored errors (`let _ = file.write_all(..)`) | Propagate with `?` or at minimum log | m06-error-handling |
| Lock held across `.await` | Drop the `MutexGuard` before `.await`: take the lock in a `{ }` block, clone out the needed data | m07-concurrency (has the correct code) |
| `Mutex` for read-heavy data | `RwLock` lets readers run in parallel | m07-concurrency |
| Blocking in async (`std::thread::sleep`, sync fs) | `tokio::time::sleep(..).await`; CPU work via `tokio::task::spawn_blocking(..).await.unwrap()` | m07-concurrency; m10-performance optimization guide |
| O(n^2) string concat, `String` params, index loops, collect-then-iterate | `push_str`/`join`, `&str` params, iterators, chained iterators | m10-performance optimization guide |
| `Vec` for frequent membership checks | `HashSet::contains` is O(1) | m10-performance |

## Type System Anti-Patterns

### Stringly Typed

```rust
use std::time::Duration;

// ANTI-PATTERN: strings for everything; swapped args still compile
fn connect_weak(host: &str, port: &str, timeout: &str) {}
// connect_weak("8080", "localhost", "30");  // wrong order, no error!

// BETTER: strong types make the wrong order a compile error
struct Host(String);
struct Port(u16);
struct Timeout(Duration);

fn connect(host: Host, port: Port, timeout: Timeout) {}
```

### Boolean Parameters

```rust
// ANTI-PATTERN: what does `true, false` mean at the call site?
fn fetch_flags(url: &str, use_cache: bool, validate_ssl: bool) {}

// BETTER: named options struct
struct FetchOptions {
    use_cache: bool,
    validate_ssl: bool,
}

fn fetch(url: &str, options: FetchOptions) {}

fn demo() {
    fetch("https://example.com", FetchOptions {
        use_cache: true,
        validate_ssl: false,
    });
}
```

### Option<Option<T>>

```rust
// ANTI-PATTERN: nested Option -- what do None and Some(None) each mean?
fn find_nested(id: u32) -> Option<Option<User>> {
    todo!()
}

// BETTER: an enum that names every case
enum FindResult {
    Found(User),
    NotFound,
    Error(String),
}
```

## API Design Anti-Patterns

### Taking Ownership Unnecessarily

```rust
// ANTI-PATTERN: takes ownership but only reads
fn validate_owned(config: Config) -> bool {
    config.timeout > 0 && config.retries >= 0
}

// BETTER: borrow
fn validate(config: &Config) -> bool {
    config.timeout > 0 && config.retries >= 0
}
```

### Returning References to Temporaries

```rust
// ANTI-PATTERN: does NOT compile (E0106/E0515) -- s is dropped at return
// fn get_default() -> &str {
//     let s = String::from("default");
//     &s
// }

// BETTER: return owned
fn get_default() -> String {
    String::from("default")
}

// Or 'static for true constants
fn get_default_static() -> &'static str {
    "default"
}
```

### Overly Generic Functions

```rust
// ANTI-PATTERN: three type parameters for a one-line transformation
fn process_generic<T, U, V>(input: T) -> V
where
    T: Into<U>,
    U: AsRef<str>,
    V: From<String>,
{
    let u: U = input.into();
    V::from(u.as_ref().to_string())
}

// BETTER: concrete types when generics buy callers nothing
fn process(input: &str) -> String {
    input.to_string()
}
```

## Macro Anti-Patterns

```rust
// ANTI-PATTERN: macro for what a function does better
macro_rules! add {
    ($a:expr, $b:expr) => { $a + $b };
}

// BETTER: just use a function (typed, namespaced, better errors)
fn add(a: i32, b: i32) -> i32 { a + b }
```

Complex macros need expansion tests: use `cargo expand` to inspect output and
`trybuild` to test that invalid invocations produce the intended errors.
