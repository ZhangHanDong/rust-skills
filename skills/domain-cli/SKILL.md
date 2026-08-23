---
name: domain-cli
description: "Use when building CLI tools. Keywords: CLI, command line, terminal, clap, structopt, argument parsing, subcommand, interactive, TUI, ratatui, crossterm, indicatif, progress bar, colored output, shell completion, config file, environment variable, 命令行, 终端应用, 参数解析"
globs: ["**/Cargo.toml"]
user-invocable: false
---

# CLI Domain

> **Layer 3: Domain Constraints**

## Operational Invariants

| Invariant | Why | Rust Surface |
|-----------|-----|--------------|
| Errors and progress to stderr, data to stdout | Pipeable output, scriptability | `eprintln!` for diagnostics, `println!` for data |
| CLI args > env vars > config file > defaults | User expectation, override capability | Layered config with `clap` + `figment`/`config` |
| Non-zero exit on error | Script integration, automation | `main() -> Result<(), Error>` or explicit `std::process::exit` |
| Destructive actions show intent before mutation | Safer automation | Dry-run mode, confirmation, canonicalized root checks |
| Secret values stay out of printable diagnostics | Safe bug reports and CI logs | Redacted view types, no raw `Debug` for secrets |
| Interruptible long operations | Ctrl+C must not corrupt state | Signal handling (`ctrlc`, `tokio::signal`) |

## Safety Guardrails

- Destructive operations (recursive delete, workspace cleanup) should
  canonicalize the workspace root and every target path first, refuse any
  path that resolves outside the root with a non-zero exit before touching
  the filesystem, and offer a preview mode that prints planned actions
  without mutating anything.
- Diagnostics that print configuration must redact secret values. Report
  where each value came from (flag, environment variable, config file)
  without echoing tokens or passwords, and keep that redaction in error
  paths and panics too.
- Reserve stdout for the tool's actual output so it stays pipeable; send
  progress, warnings, and error context to stderr.

## Key Crates

| Purpose | Crate |
|---------|-------|
| Argument parsing | clap |
| Config layering | figment, config |
| Interactive prompts | dialoguer |
| Progress bars | indicatif |
| Colored output | colored |
| Terminal UI | ratatui + crossterm |

## Code Pattern: CLI Structure

```rust
use clap::{Parser, Subcommand};

#[derive(Parser)]
#[command(name = "myapp", version, about = "My CLI tool")]
struct Cli {
    /// Enable verbose output
    #[arg(short, long)]
    verbose: bool,

    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Initialize a new project
    Init { name: String },
}
```

`main() -> anyhow::Result<()>` gives the non-zero exit code on `Err` for free.

## Common Mistakes

| Mistake | Domain Violation | Fix |
|---------|-----------------|-----|
| Errors to stdout | Breaks piping | `eprintln!` |
| Panic on expected failure | Exit code 101, stack trace to user | `Result` propagation to main |
| No progress for long ops | User uncertainty, killed processes | `indicatif::ProgressBar` |
| Deleting before validating paths | Escapes workspace root | Canonicalize, then check prefix |
| Printing config with secrets | Tokens in CI logs | Redacted display types |

## Related Skills

| When | See |
|------|-----|
| Error handling, exit codes | m06-error-handling |
| Type-driven args | m05-type-driven |
| Progress bar as RAII | m12-lifecycle |
| Async CLI | m07-concurrency |
