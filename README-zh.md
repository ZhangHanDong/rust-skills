# Rust Skills

[English](./README.md) | [日本語](./README-ja.md)

> 基于元认知框架的 AI Rust 开发助手

[![Version](https://img.shields.io/badge/version-2.2.1-green.svg)](https://github.com/actionbook/rust-skills/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-Plugin-blue)](https://github.com/anthropics/claude-code)

## 什么是 Rust Skills？

**Rust Skills** 是一个 Claude Code 插件，它改变了 AI 辅助 Rust 开发的方式。它不再给出表面答案，而是通过认知层追溯，提供**领域正确的架构方案**。

### 问题

传统 AI 的 Rust 辅助：
```
用户: "我的交易系统报 E0382"
AI: "用 .clone()"  ← 表面修复，忽略领域约束
```

### 解决方案

带元认知的 Rust Skills：
```
用户: "我的交易系统报 E0382"

AI (使用 Rust Skills):
├── Layer 1: E0382 = 所有权错误 → 为什么需要这个数据？
│       ↑
├── Layer 3: 交易记录是不可变审计数据 → 应该共享而非复制
│       ↓
├── Layer 2: 使用 Arc<TradeRecord> 作为共享不可变值
│       ↓
└── 建议: 重新设计为 Arc<T>，而非 clone()
```

## 功能特性

- **元认知框架**: 三层认知模型 (领域 → 设计 → 机制)
- **实时信息获取**: 通过后台 agents 获取最新 Rust 版本和 crate 信息
- **动态 Skills**: 从 Cargo.toml 依赖自动生成 skills
- **领域扩展**: 金融科技、机器学习、云原生、物联网、嵌入式、Web、CLI 支持
- **编码规范**: 完整的 Rust 编码规范和最佳实践

## 安装

Rust Skills 支持三种安装模式：

- **本地 Runtime 模式**（Codex 和 Claude Code）：只暴露一个顶层 `rust-skills`，通过 hook 和 Rust-native `rust-skills` CLI 做真实路由。
- **Plugin 模式**（Claude Code）：完整功能，包含 hooks、agents 和自动元认知触发
- **Skills-only 模式**：适用于任何支持 skills 的编码助手（Claude Code、Vercel AI 等）

---

### 本地 Runtime 安装（Codex + Claude Code）

如果你希望本地 hook 自动触发，并且能用命令行真实验证路由，优先使用这个方式。安装器使用 Node 完成文件安装，并构建/复制 Rust-native CLI、runtime 数据、单一顶层 skill、hook，并在 `~/.local/bin/rust-skills` 放一个指向已安装 runtime CLI 的轻量 shim。

源码安装前提：

- Node.js 用于运行 `install.js` 和 hook。
- 如果没有现成的预编译 binary，需要 Rust/Cargo 来构建 native `rust-skills` CLI。

完整安装会把 UserPromptSubmit hook 直接接到原生二进制——`<targetRoot>/bin/rust-skills hook claude|codex`（每条 prompt 约 10ms）。触发判断在二进制内部完成：非 Rust prompt 不输出任何内容，只有路由决策为 `should_inject: true` 时才注入 Rust 上下文。不存在独立的 hook matcher；Node hook 脚本仅作为 repo checkout / plugin 布局的回退保留。

这样即使 prompt 里出现 `cargo`、`ownership`、`lifetime`、`Rocket`、`Tower`、`unsafe` 这类歧义词，非 Rust 工作也不会被打扰。

```bash
git clone https://github.com/actionbook/rust-skills.git
cd rust-skills
node install.js --codex --claude

rust-skills route --json "Rust E0382 value moved in axum state"
```

如果安装后找不到 `rust-skills` 命令，请确认 `~/.local/bin` 在 PATH 中（`export PATH="$HOME/.local/bin:$PATH"`），或直接用绝对路径调用 shim（`~/.local/bin/rust-skills`）。

安装内容：

- `~/.codex/skills/rust-skills/SKILL.md` 和/或 `~/.claude/skills/rust-skills/SKILL.md`
- 深层 skill 数据：`~/.codex/rust-skills/` 和/或 `~/.claude/rust-skills/`
- Hook 脚本：`~/.codex/hooks/` 和/或 `~/.claude/hooks/`
- Rust-native Runtime CLI：`~/.codex/bin/` 和/或 `~/.claude/bin/`
- 可选 PATH shim：`~/.local/bin/rust-skills`，会动态选择已安装 runtime。可以设置 `RUST_SKILLS_PROFILE=codex` 或 `RUST_SKILLS_PROFILE=claude` 强制选择。

安装器不会覆盖全局 `AGENTS.md`、Claude `agents/` 或 Claude `commands/`。它也不会默认移动旧的顶层 deep skills；只有显式传入 `--prune-legacy-top-level-skills` 才会移动到备份目录。

Codex 安装会启用当前格式的 feature flag：

```toml
[features]
hooks = true
```

安装时会移除已废弃的 `[features].codex_hooks`。

本地验证：

```bash
npm test
rust-skills verify --json
rust-skills route --json "今天天气怎么样"
rust-skills route --json "Rust Web API Rc cannot be sent between threads"
```

常用安装参数：

```bash
node install.js --all                         # 同时安装 Codex 和 Claude Code
node install.js --codex                       # 只安装 Codex
node install.js --claude                      # 只安装 Claude Code
node install.js --codex --dry-run             # 只打印计划，不写入文件
node install.js --codex --codex-dir ~/.codex2 # 覆盖 Codex home
node install.js --claude --claude-dir ~/.cc2  # 覆盖 Claude Code home
node install.js --codex --home /tmp/home      # 覆盖 ~/.local/bin 使用的 home
node install.js --codex --no-hooks            # 不合并 hook 设置
node install.js --codex --no-user-bin         # 不安装 ~/.local/bin shim
node install.js --codex --prune-legacy-top-level-skills
node install.js --codex --legacy-top-level-skills
RUST_SKILLS_DEBUG=1 rust-skills route --json "Rust E0382"
```

`--no-hooks` 仍会复制 runtime CLI 和 hook 文件，只是不合并 Codex/Claude
hook 设置。默认本地 runtime 只暴露一个顶层 `rust-skills`；只有兼容旧布局时
才使用 `--legacy-top-level-skills`。

---

### Skills-only 安装（推荐）

最简单的安装方式。适用于**任何支持 skills 的编码助手**，包括 Claude Code、[Vercel `add-skills`](https://github.com/nicepkg/add-skills) 等。

Skills 现已内置**内联回退逻辑** —— 当 agent 文件不可用时，skills 会使用内置工具（actionbook、agent-browser、WebFetch）直接执行。

#### 方式 A：NPX（最简单）

```bash
npx skills add actionbook/rust-skills
```

#### 方式 B：CoWork CLI

通过 [CoWork](https://crates.io/crates/cowork)（基于 Rust 的 skills 管理工具）安装：

```bash
# 安装 CoWork
cargo install cowork

# 方式 1：直接安装
cowork install actionbook/rust-skills

# 方式 2：配置文件安装（推荐团队使用）
cowork config init                    # 创建 .cowork/Skills.toml
# 编辑 Skills.toml 添加 rust-skills（见下方配置）
cowork config install                 # 安装所有配置的 skills
```

**Skills.toml 配置示例：**

```toml
[project]
name = "my-rust-project"

[skills.install]
rust-skills = "actionbook/rust-skills"

[security]
trusted_authors = ["ZhangHanDong"]
```

> CoWork（简写 `co`）提供版本管理、依赖解析、lock 文件和安全审计功能。详见 [CoWork 文档](https://crates.io/crates/cowork)。

#### 方式 C：手动复制

```bash
git clone https://github.com/actionbook/rust-skills.git
cp -r rust-skills/skills/* ~/.claude/skills/
```

> **注意**：Skills-only 模式不包含 hooks，元认知不会自动触发。可以手动调用 `/rust-router` 或特定 skills。后台 agents 会自动回退到内联执行模式。

---

### Claude Code Plugin 安装（完整功能）

适用于想要获得完整体验的 **Claude Code 用户**，包含 hooks、后台 agents 和自动元认知触发。

#### 方式 A：Marketplace

```bash
# 步骤 1: 添加 marketplace
/plugin marketplace add actionbook/rust-skills

# 步骤 2: 安装插件
/plugin install rust-skills@rust-skills
```

> **注意**：步骤 1 仅添加 marketplace（插件源）。步骤 2 才是真正安装 rust-skills 插件，启用所有功能。

#### 方式 B：完整插件（本地）

```bash
# 克隆仓库
git clone https://github.com/actionbook/rust-skills.git

# 使用插件目录启动
claude --plugin-dir /path/to/rust-skills
```

---

### 功能对比

| 功能 | 本地 Runtime | Plugin（Marketplace） | Plugin（本地） | Skills-only（NPX/CoWork/手动） |
|------|--------------|---------------------|---------------|-------------------------------|
| 全部 Skills | ✅ | ✅ | ✅ | ✅ |
| 单一顶层 skill | ✅ | ✅ | ✅ | ❌ |
| 本地 `rust-skills` CLI | ✅ | ❌ | ✅ | ❌ |
| 自动触发元认知 | ✅ | ✅ | ✅ | ❌（手动调用） |
| Hook 路由 | ✅ | ✅ | ✅ | ❌ |
| 后台 Agents | ✅ | ✅ | ✅ | ✅（内联回退） |
| 源码 runtime 安装需要 Rust/Cargo | 没有预编译 binary 时需要 | ❌ | 本地构建 native CLI 时需要 | ❌ |
| 兼容 Codex | ✅ | ❌ | ❌ | ✅ |

### 权限配置

后台 agents 需要运行 `agent-browser` 的权限。在项目中配置：

```bash
# 复制示例配置
cp /path/to/rust-skills/.claude/settings.example.json .claude/settings.local.json
```

或手动创建：

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

参见 [.claude/settings.example.json](.claude/settings.example.json) 示例。

### 其他平台

- **OpenCode**: 参见 [.opencode/INSTALL.md](.opencode/INSTALL.md)
- **Codex**: 参见 [.codex/INSTALL.md](.codex/INSTALL.md)

## 依赖 Skills

Rust Skills 依赖以下外部工具以获得完整功能：

| 工具 | 说明 | GitHub |
|------|------|--------|
| **actionbook** | 网站操作手册 MCP 服务器。用于 agents 获取结构化网页内容（Rust 版本、crate 信息、文档）。 | [actionbook/actionbook](https://github.com/actionbook/actionbook) |
| **agent-browser** | 浏览器自动化工具，用于获取实时网页数据。作为 actionbook 不可用时的备选方案。 | [vercel-labs/agent-browser](https://github.com/vercel-labs/agent-browser) |

## 元认知框架

### 核心理念

**不直接回答问题，先追溯认知层次。**

```
Layer 3: 领域约束 (WHY - 为什么)
├── 领域规则决定设计选择
└── 例：金融系统要求数据不可变、可审计

Layer 2: 设计选择 (WHAT - 是什么)
├── 设计模式和架构决策
└── 例：使用 Arc<T> 共享不可变数据

Layer 1: 语言机制 (HOW - 怎么做)
├── Rust 语言特性和编译器规则
└── 例：E0382 是所有权设计问题的表现
```

### 路由规则

| 用户信号 | 入口层 | 追溯方向 | 首选 Skill |
|----------|--------|----------|------------|
| E0xxx 错误 | Layer 1 | 向上追溯 ↑ | m01-m07 |
| "如何设计..." | Layer 2 | 双向追溯 | m09-m15 |
| "[领域]应用开发" | Layer 3 | 向下追溯 ↓ | domain-* |
| 性能问题 | Layer 1→2 | 先上后下 | m10-performance |

## Skills 概览

### 核心 Skills
- `rust-router` - Rust 问题主路由器 (首先调用)
- `rust-learner` - 获取最新 Rust/crate 版本信息
- `rust-env-setup` - Rust 工具链、Cargo 与 rust-skills runtime 安装配置
- `coding-guidelines` - 编码规范查询

### Layer 1: 语言机制 (m01-m07)

| Skill | 核心问题 | 触发信号 |
|-------|----------|----------|
| m01-ownership | 谁应该拥有这个数据？ | E0382, E0597, move, borrow |
| m02-resource | 需要什么所有权模式？ | Box, Rc, Arc, RefCell |
| m03-mutability | 为什么这个数据需要改变？ | mut, Cell, E0596, E0499 |
| m04-zero-cost | 编译时还是运行时多态？ | generic, trait, E0277 |
| m05-type-driven | 类型如何防止无效状态？ | newtype, PhantomData |
| m06-error-handling | 预期失败还是 bug？ | Result, Error, panic, ? |
| m07-concurrency | CPU 密集还是 I/O 密集？ | async, Send, Sync, thread |

### Layer 2: 设计选择 (m09-m15)

| Skill | 核心问题 | 触发信号 |
|-------|----------|----------|
| m09-domain | 这个概念的领域角色是什么？ | DDD, entity, value object |
| m10-performance | 瓶颈在哪里？ | benchmark, profiling |
| m11-ecosystem | 哪个 crate 适合这个任务？ | crate 选择, 依赖 |
| m12-lifecycle | 何时创建、使用、清理？ | RAII, Drop, lazy init |
| m13-domain-error | 谁处理这个错误？ | retry, circuit breaker |
| m14-mental-model | 如何正确思考这个概念？ | 学习 Rust, 为什么 |
| m15-anti-pattern | 这个模式隐藏了设计问题吗？ | code smell, 常见错误 |

### Layer 3: 领域约束 (domain-*)

| Skill | 领域 | 核心约束 |
|-------|------|----------|
| domain-fintech | 金融科技 | 审计追踪, 精度, 一致性 |
| domain-ml | 机器学习 | 内存效率, GPU 加速 |
| domain-cloud-native | 云原生 | 12-Factor, 可观测性, 优雅关闭 |
| domain-iot | 物联网 | 离线优先, 功耗管理, 安全 |
| domain-web | Web 服务 | 无状态, 延迟 SLA, 并发 |
| domain-cli | 命令行 | 用户体验, 配置优先级, 退出码 |
| domain-embedded | 嵌入式 | 无堆, no_std, 实时性 |

## 命令

### 查询与信息

| 命令 | 说明 |
|------|------|
| `/rust-features [version]` | 获取 Rust 版本特性 |
| `/crate-info <crate>` | 获取 crate 信息 |
| `/docs <crate> [item]` | 获取 API 文档 |
| `/guideline [--clippy] <rule>` | 查询编码规范 |
| `/skill-index <category>` | 按分类搜索 skills |
| `/rust-daily [day\|week\|month]` | Rust 生态新闻 |
| `/ai-daily [day\|week\|month]` | Reddit AI 社区日报 |

### 审计与代码审查

| 命令 | 说明 |
|------|------|
| `/unsafe-check <file>` | 分析文件的 unsafe 问题 |
| `/unsafe-review <file>` | 交互式 unsafe 代码审查 |
| `/rust-review <file>` | 轻量级 Clippy 风格审查 |
| `/audit [security\|safety\|concurrency\|full]` | 综合代码审计 |

### 动态 Skills

| 命令 | 说明 |
|------|------|
| `/sync-crate-skills` | 从 Cargo.toml 同步 skills |
| `/update-crate-skill <crate>` | 更新指定 crate skill |
| `/clean-crate-skills` | 清理本地 crate skills |
| `/create-skills-via-llms <crate> <path>` | 从 llms.txt 创建 skill |
| `/create-llms-for-skills <urls>` | 从 URL 生成 llms.txt |
| `/create-llms-from-source [path]` | 从本地源码生成 llms.txt |
| `/fix-skill-docs [--check-only]` | 修复 skill 文档 |

### 缓存管理

| 命令 | 说明 |
|------|------|
| `/cache-status [--verbose]` | 查看文档缓存状态 |
| `/cache-clean [--all\|--expired]` | 清理缓存条目 |

### 其他

| 命令 | 说明 |
|------|------|
| `/achievement [list\|stats]` | 查看编程成就与进度 |

## 动态 Skills

从项目依赖按需生成 skills：

```bash
# 进入 Rust 项目
cd my-rust-project

# 同步所有依赖
/sync-crate-skills

# Skills 创建在 ~/.claude/skills/{crate}/
```

### 特性
- **按需生成**: 从 Cargo.toml 依赖创建
- **本地存储**: `~/.claude/skills/`
- **版本追踪**: 每个 skill 记录 crate 版本
- **Workspace 支持**: 解析所有 workspace 成员

## 工作原理

```
用户问题
     │
     ▼
┌─────────────────────────────────────────┐
│           Hook 触发层                    │
│  每个 prompt 运行一次 CLI 路由器         │
│  should_inject 为 true 才注入，否则静默  │
└─────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│           rust-router                    │
│  识别入口层 + 领域                       │
│  决策: 双技能加载                        │
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
领域正确的架构方案
```

## 文档

- [架构设计](./docs/architecture-zh.md)
- [功能概览](./docs/functional-overview-zh.md)
- [Hook 机制](./docs/hook-mechanism-zh.md)
- [Prompt 约束技巧](./docs/prompt-engineering-zh.md)
- [元认知示例: E0382](./docs/meta-cognition-example-e0382.md)

## 贡献

欢迎贡献！提交 PR 前请阅读贡献指南。

## 致谢

- [@pinghe](https://github.com/pinghe) - `context: fork` 支持建议 ([#4](https://github.com/actionbook/rust-skills/issues/4))
- [@DoiiarX](https://github.com/DoiiarX) - OpenCode 安装修复 ([#6](https://github.com/actionbook/rust-skills/issues/6))

## 许可证

MIT 许可证 - 详见 [LICENSE](LICENSE)

## 链接

- **GitHub**: https://github.com/actionbook/rust-skills
- **Issues**: https://github.com/actionbook/rust-skills/issues
