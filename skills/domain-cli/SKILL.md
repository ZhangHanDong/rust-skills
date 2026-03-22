---
name: domain-cli
description: "Use when building CLI tools. Keywords: CLI, command line, terminal, clap, structopt, argument parsing, subcommand, interactive, TUI, ratatui, crossterm, indicatif, progress bar, colored output, shell completion, config file, environment variable, 命令行, 终端应用, 参数解析"
globs: ["**/Cargo.toml"]
user-invocable: false
---

# CLI Domain

> **Layer 3: Domain Constraints**

## Domain Constraints → Design Implications

| Domain Rule | Design Constraint | Rust Implication |
|-------------|-------------------|------------------|
| User ergonomics | Clear help, errors | clap derive macros |
| Config precedence | CLI > env > file | Layered config loading |
| Exit codes | Non-zero on error | Proper Result handling |
| Stdout/stderr | Data vs errors | eprintln! for errors |
| Interruptible | Handle Ctrl+C | Signal handling |

---

## Workflow

1. **Define CLI structure** — derive `Parser` and `Subcommand` structs for type-safe args
2. **Layer configuration** — load CLI args > env vars > config file > defaults
3. **Set up error handling** — return `Result` from `main()`, errors to stderr, data to stdout
4. **Add user feedback** — progress bars for long ops, colored output for status
5. **Handle signals** — register Ctrl+C handler for graceful shutdown
6. **Validate** — run `cargo clippy`, test `--help` output, verify exit codes in scripts

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

## Code Pattern: CLI with Config Layering and Signal Handling

```rust
use clap::{Parser, Subcommand};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

#[derive(Parser)]
#[command(name = "myapp", version, about = "My CLI tool")]
struct Cli {
    /// Enable verbose output
    #[arg(short, long, env = "MYAPP_VERBOSE")]
    verbose: bool,

    /// Config file path
    #[arg(short, long, default_value = "~/.config/myapp/config.toml")]
    config: Option<std::path::PathBuf>,

    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Initialize a new project
    Init { name: String },
    /// Run the application
    Run {
        #[arg(short, long, env = "MYAPP_PORT", default_value_t = 8080)]
        port: u16,
    },
}

fn main() -> anyhow::Result<()> {
    let cli = Cli::parse();

    // Ctrl+C handler for graceful shutdown
    let running = Arc::new(AtomicBool::new(true));
    let r = running.clone();
    ctrlc::set_handler(move || {
        eprintln!("\nShutting down...");
        r.store(false, Ordering::SeqCst);
    })?;

    match cli.command {
        Commands::Init { name } => {
            init_project(&name)?;
            println!("Project '{name}' created"); // data to stdout
        }
        Commands::Run { port } => run_server(port, running)?,
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

## Code Pattern: Progress Bar for Long Operations

```rust
use indicatif::{ProgressBar, ProgressStyle};

fn process_files(files: &[std::path::PathBuf]) -> anyhow::Result<()> {
    let pb = ProgressBar::new(files.len() as u64);
    pb.set_style(ProgressStyle::default_bar()
        .template("{spinner:.green} [{bar:40}] {pos}/{len} {msg}")?);

    for file in files {
        pb.set_message(file.display().to_string());
        process_one(file)?;
        pb.inc(1);
    }
    pb.finish_with_message("done");
    Ok(())
}
```
