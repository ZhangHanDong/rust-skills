# Rust Skills

[中文](./README-zh.md) | [日本語](./README-ja.md)

> AI-powered Rust development assistant with meta-cognition framework

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-Plugin-blue)](https://github.com/anthropics/claude-code)

## What is Rust Skills?

**Rust Skills** is a Claude Code plugin that transforms how AI assists with Rust development. Instead of giving surface-level answers, it traces through cognitive layers to provide **domain-correct architectural solutions**.

### The Problem

Traditional AI assistance for Rust:
```
User: "My trading system reports E0382"
AI: "Use .clone()"  ← Surface fix, ignores domain constraints
```

### The Solution

Rust Skills with meta-cognition:
```
User: "My trading system reports E0382"

AI (with Rust Skills):
├── Layer 1: E0382 = ownership error → Why is this data needed?
│       ↑
├── Layer 3: Trade records are immutable audit data → Should share, not copy
│       ↓
├── Layer 2: Use Arc<TradeRecord> as shared immutable value
│       ↓
└── Recommendation: Redesign as Arc<T>, not clone()
```

## Features

- **Meta-Cognition Framework**: Three-layer cognitive model (Domain → Design → Mechanics)
- **Real-time Information**: Fetch latest Rust versions and crate info via background agents
- **Dynamic Skills**: Auto-generate skills from your Cargo.toml dependencies
- **Domain Extensions**: FinTech, ML, Cloud-Native, IoT, Embedded, Web, CLI support
- **Coding Guidelines**: Complete Rust coding conventions and best practices

## Installation

### Method 1: Full Plugin (Recommended)

This method enables **all features including hooks** for automatic meta-cognition triggering.

**Option A: Global Installation (Recommended)**

Add to your `~/.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "rust-skills": {
      "source": {
        "source": "directory",
        "path": "/path/to/rust-skills"
      }
    }
  },
  "enabledPlugins": {
    "rust-skills@rust-skills": true
  }
}
```

Then just run `claude` - no flags needed.

**Option B: Per-Session**

```bash
# Clone the repository
git clone https://github.com/ZhangHanDong/rust-skills.git

# Launch with plugin directory
claude --plugin-dir /path/to/rust-skills
```

### Method 2: Skills Only

This method only installs skills without hooks. You need to manually invoke skills.

**Option A: Using npx (Recommended)**

```bash
npx add-skill ZhangHanDong/rust-skills
```

> ⚠️ **Important**: npx only copies skills. For background agents (rust-learner, rust-daily), also copy agents manually - see Option B.

**Option B: Manual Installation**

```bash
# Clone repository
git clone https://github.com/ZhangHanDong/rust-skills.git

# Copy skills
cp -r rust-skills/skills/* ~/.claude/skills/

# Copy agents (REQUIRED for rust-learner, rust-daily, /docs, /crate-info commands)
mkdir -p ~/.claude/agents
cp -r rust-skills/agents/* ~/.claude/agents/
```

> ⚠️ **Note**: Without hooks, meta-cognition won't trigger automatically. You must manually call `/rust-router` or specific skills.

**Why copy agents?**

Skills like `rust-learner` and `rust-daily` reference agent files via relative paths (`../../agents/*.md`). Without copying agents to `~/.claude/agents/`, these skills will fail with "file not found" errors.

### Feature Comparison

| Feature | Full Plugin | Skills Only |
|---------|-------------|-------------|
| All Skills | ✅ | ✅ |
| Auto meta-cognition trigger | ✅ | ❌ |
| Hook-based routing | ✅ | ❌ |
| Background agents | ✅ | ✅ (requires agent copy) |

### Permission Configuration

Background agents require permission to run `agent-browser`. Configure in your project:

```bash
# Copy example config
cp /path/to/rust-skills/.claude/settings.example.json .claude/settings.local.json
```

Or create manually:

```bash
mkdir -p .claude
cat > .claude/settings.local.json << 'EOF'
{
  "permissions": {
    "allow": [
      "Bash(agent-browser *)"
    ]
  }
}
EOF
```

See [.claude/settings.example.json](.claude/settings.example.json) for reference.

### Other Platforms

- **OpenCode**: See [.opencode/INSTALL.md](.opencode/INSTALL.md)
- **Codex**: See [.codex/INSTALL.md](.codex/INSTALL.md)

## Meta-Cognition Framework

### Core Concept

**Don't answer directly. Trace through cognitive layers first.**

```
Layer 3: Domain Constraints (WHY)
├── Domain rules determine design choices
└── Example: Financial systems require immutable, auditable data

Layer 2: Design Choices (WHAT)
├── Design patterns and architectural decisions
└── Example: Use Arc<T> for shared immutable data

Layer 1: Language Mechanics (HOW)
├── Rust language features and compiler rules
└── Example: E0382 is a symptom of ownership design issues
```

### Routing Rules

| User Signal | Entry Layer | Trace Direction | Primary Skill |
|-------------|-------------|-----------------|---------------|
| E0xxx errors | Layer 1 | Trace UP ↑ | m01-m07 |
| "How to design..." | Layer 2 | Bidirectional | m09-m15 |
| "[Domain] app development" | Layer 3 | Trace DOWN ↓ | domain-* |
| Performance issues | Layer 1→2 | Up then Down | m10-performance |

## Skills Overview

### Core Skills
- `rust-router` - Master router for all Rust questions (invoked first)
- `rust-learner` - Fetch latest Rust/crate version info
- `coding-guidelines` - Coding conventions lookup

### Layer 1: Language Mechanics (m01-m07)

| Skill | Core Question | Triggers |
|-------|---------------|----------|
| m01-ownership | Who should own this data? | E0382, E0597, move, borrow |
| m02-resource | What ownership pattern fits? | Box, Rc, Arc, RefCell |
| m03-mutability | Why does this data need to change? | mut, Cell, E0596, E0499 |
| m04-zero-cost | Compile-time or runtime polymorphism? | generic, trait, E0277 |
| m05-type-driven | How can types prevent invalid states? | newtype, PhantomData |
| m06-error-handling | Expected failure or bug? | Result, Error, panic, ? |
| m07-concurrency | CPU-bound or I/O-bound? | async, Send, Sync, thread |

### Layer 2: Design Choices (m09-m15)

| Skill | Core Question | Triggers |
|-------|---------------|----------|
| m09-domain | What role does this concept play? | DDD, entity, value object |
| m10-performance | Where's the bottleneck? | benchmark, profiling |
| m11-ecosystem | Which crate fits this task? | crate selection, dependencies |
| m12-lifecycle | When to create, use, cleanup? | RAII, Drop, lazy init |
| m13-domain-error | Who handles this error? | retry, circuit breaker |
| m14-mental-model | How to think about this correctly? | learning Rust, why |
| m15-anti-pattern | Does this pattern hide design issues? | code smell, common mistakes |

### Layer 3: Domain Constraints (domain-*)

| Skill | Domain | Core Constraints |
|-------|--------|------------------|
| domain-fintech | FinTech | Audit trail, precision, consistency |
| domain-ml | Machine Learning | Memory efficiency, GPU acceleration |
| domain-cloud-native | Cloud Native | 12-Factor, observability, graceful shutdown |
| domain-iot | IoT | Offline-first, power management, security |
| domain-web | Web Services | Stateless, latency SLA, concurrency |
| domain-cli | CLI | UX, config precedence, exit codes |
| domain-embedded | Embedded | No heap, no_std, real-time |

## Commands

| Command | Description |
|---------|-------------|
| `/rust-features [version]` | Get Rust version features |
| `/crate-info <crate>` | Get crate information |
| `/docs <crate> [item]` | Get API documentation |
| `/sync-crate-skills` | Sync skills from Cargo.toml dependencies |
| `/update-crate-skill <crate>` | Update specific crate skill |
| `/clean-crate-skills` | Clean local crate skills |

## Dynamic Skills

Generate skills on-demand from your project dependencies:

```bash
# Enter your Rust project
cd my-rust-project

# Sync all dependencies
/sync-crate-skills

# Skills are created at ~/.claude/skills/{crate}/
```

### Features
- **On-demand generation**: Created from Cargo.toml dependencies
- **Local storage**: `~/.claude/skills/`
- **Version tracking**: Each skill records crate version
- **Workspace support**: Parses all workspace members

## How It Works

```
User Question
     │
     ▼
┌─────────────────────────────────────────┐
│           Hook Layer                     │
│  400+ keywords trigger meta-cognition    │
└─────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│           rust-router                    │
│  Identify entry layer + domain           │
│  Decision: dual-skill loading            │
└─────────────────────────────────────────┘
     │
     ├──────────────┬──────────────┐
     ▼              ▼              ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│ Layer 1  │  │ Layer 2  │  │ Layer 3  │
│ m01-m07  │  │ m09-m15  │  │ domain-* │
└──────────┘  └──────────┘  └──────────┘
     │
     ▼
Domain-correct architectural solution
```

## Documentation

- [Architecture (中文)](./docs/architecture-zh.md)
- [Functional Overview (中文)](./docs/functional-overview-zh.md)
- [Hook Mechanism (中文)](./docs/hook-mechanism-zh.md)
- [Prompt Engineering (中文)](./docs/prompt-engineering-zh.md)
- [Meta-Cognition Example: E0382](./docs/meta-cognition-example-e0382.md)

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Links

- **GitHub**: https://github.com/ZhangHanDong/rust-skills
- **Issues**: https://github.com/ZhangHanDong/rust-skills/issues
