# Error Handling Patterns (Beyond Basics)

Manual `From`/`Display`/`Error` impls and basic `?`/combinator usage are
assumed knowledge. This file keeps only the parts that get done wrong.

## Error Context at Boundaries

Use lazy `.with_context(|| ...)` rather than eager `.context(format!(...))` —
the eager form allocates the message even on the success path.

```rust
use anyhow::{Context, Result};

fn load_user_config(user_id: u64) -> Result<String> {
    let path = format!("/home/{}/config.toml", user_id);
    let content = std::fs::read_to_string(&path)
        .with_context(|| format!("failed to read config for user {}", user_id))?;
        // NOT: .context("failed to read file")  // too generic to debug
    Ok(content)
}
```

Include the problematic value in the message:

```rust
use anyhow::{Context, Result};

fn parse_age(s: &str) -> Result<u8> {
    s.parse()
        .with_context(|| format!("invalid age value: '{}'", s))
}
```

The resulting chain prints with `{:#}` (one line) or `{:?}` (multi-line
"Caused by:" list) — add context once per boundary, not on every call.

## Transparent Wrapper

When a public error type wraps a private/inner one without adding
information, forward `Display` and `source()` instead of double-reporting:

```rust
use thiserror::Error;

#[derive(Error, Debug)]
#[error(transparent)]
pub struct MyError(#[from] InnerError);
```

Without `transparent`, callers see two layers ("my error: inner error")
in the chain for what is conceptually one failure.

## Early Return vs Combinators

| Style | Best For |
|-------|----------|
| Early return (`?`) | Most cases, clearer flow |
| Combinators (`map_err`, `and_then`) | Functional pipelines, one-liners |
| `match` | Complex branching on error variants |

Default to `?` with context. Reach for combinators only when the chain stays
on one line; deep `and_then` nesting reads worse than sequential `?`.
