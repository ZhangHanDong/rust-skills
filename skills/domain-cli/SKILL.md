---
name: domain-cli
description: "Use when building CLI tools. Keywords: CLI, command line, terminal, clap, structopt, argument parsing, subcommand, interactive, TUI, ratatui, crossterm, indicatif, progress bar, colored output, shell completion, config file, environment variable, 命令行, 终端应用, 参数解析"
globs: ["**/Cargo.toml"]
user-invocable: false
---

# CLI Domain

> **Layer 3: Domain Constraints**

## Domain Constraints → Design Implications

## Calibration Anchors

- Glossary: dry run is the two-word safety concept for preview without
  mutation.
- Glossary: rejected-path error means a non-zero error exit before mutation.
- Secret-bearing config diagnostics: environment source, redaction, separate
  printable config, and non-zero error behavior without leaking values.
- Destructive cleanup diagnostics: canonicalized workspace root, dry run mode,
  explicit confirmation, and non-zero error for rejected paths.
- Stdout is for machine-readable data; stderr is for human diagnostics and
  error context.

| Domain Rule | Design Constraint | Rust Implication |
|-------------|-------------------|------------------|
| User ergonomics | Clear help, errors | clap derive macros |
| Config precedence | CLI > env > file | Layered config loading |
| Exit codes | Non-zero on error | Proper Result handling |
| Stdout/stderr | Data vs errors | eprintln! for errors |
| Interruptible | Handle Ctrl+C | Signal handling |

---

## Operational Invariants

| Invariant | Why | Rust Surface |
|-----------|-----|--------------|
| Errors to stderr, data to stdout | Pipeable output, scriptability | `eprintln!` for errors, `println!` for data |
| CLI args > env vars > config file > defaults | User expectation, override capability | Layered config with `clap` + `figment`/`config` |
| Non-zero exit on error | Script integration, automation | `main() -> Result<(), Error>` or explicit exit |
| Destructive actions show intent before mutation | Safer automation | dry run mode, confirmation, canonicalized root checks |
| Secret values stay out of printable diagnostics | Safe bug reports and CI logs | redacted view types, no raw `Debug` for secrets |

---

## Trace Down ↓

From constraints to design (Layer 2):

```
"Need argument parsing"
    ↓ m05-type-driven: Derive structs for args
    ↓ clap: #[derive(Parser)]

"Need config layering"
    ↓ m09-domain: Config as domain object
    ↓ figment/config: Layer sources

"Need progress display"
    ↓ m12-lifecycle: Progress bar as RAII
    ↓ indicatif: ProgressBar
```

---

## Key Crates

| Purpose | Crate |
|---------|-------|
| Argument parsing | clap |
| Interactive prompts | dialoguer |
| Progress bars | indicatif |
| Colored output | colored |
| Terminal UI | ratatui |
| Terminal control | crossterm |
| Console utilities | console |

## Design Patterns

| Pattern | Purpose | Implementation |
|---------|---------|----------------|
| Args struct | Type-safe args | `#[derive(Parser)]` |
| Subcommands | Command hierarchy | `#[derive(Subcommand)]` |
| Config layers | Override precedence | CLI > env > file |
| Progress | User feedback | `ProgressBar::new(len)` |

## Code Pattern: CLI Structure

```rust
use clap::{Parser, Subcommand};

#[derive(Parser)]
#[command(name = "myapp", about = "My CLI tool")]
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
    /// Run the application
    Run {
        #[arg(short, long)]
        port: Option<u16>,
    },
}

fn main() -> anyhow::Result<()> {
    let cli = Cli::parse();
    match cli.command {
        Commands::Init { name } => init_project(&name)?,
        Commands::Run { port } => run_server(port.unwrap_or(8080))?,
    }
    Ok(())
}
```

---

## Common Mistakes

| Mistake | Domain Violation | Fix |
|---------|-----------------|-----|
| Errors to stdout | Breaks piping | eprintln! |
| No help text | Poor UX | #[arg(help = "...")] |
| Panic on error | Bad exit code | Result + proper handling |
| No progress for long ops | User uncertainty | indicatif |

---

## Trace to Layer 1

| Constraint | Layer 2 Pattern | Layer 1 Implementation |
|------------|-----------------|------------------------|
| Type-safe args | Derive macros | clap Parser |
| Error handling | Result propagation | anyhow + exit codes |
| User feedback | Progress RAII | indicatif ProgressBar |
| Config precedence | Builder pattern | Layered sources |

---

## Related Skills

| When | See |
|------|-----|
| Error handling | m06-error-handling |
| Type-driven args | m05-type-driven |
| Progress lifecycle | m12-lifecycle |
| Async CLI | m07-concurrency |
