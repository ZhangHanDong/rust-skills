# Rust Skills

[English](./README.md) | [日本語](./README-ja.md)

> 基于元认知框架的 AI Rust 开发助手

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

### 方式一：完整插件安装（推荐）

此方式启用**所有功能，包括 hooks**，自动触发元认知流程。

**选项 A：全局安装（推荐）**

在 `~/.claude/settings.json` 中添加：

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

然后直接运行 `claude`，无需任何参数。

**选项 B：单次会话**

```bash
# 克隆仓库
git clone https://github.com/ZhangHanDong/rust-skills.git

# 使用插件目录启动
claude --plugin-dir /path/to/rust-skills
```

### 方式二：仅安装 Skills

此方式仅安装 skills，不包含 hooks。需要手动调用 skills。

**选项 A：使用 npx（推荐）**

```bash
npx add-skill ZhangHanDong/rust-skills
```

> ⚠️ **重要**：npx 仅复制 skills。如需使用后台 agents（rust-learner、rust-daily），还需手动复制 agents - 参见选项 B。

**选项 B：手动安装**

```bash
# 克隆仓库
git clone https://github.com/ZhangHanDong/rust-skills.git

# 复制 skills
cp -r rust-skills/skills/* ~/.claude/skills/

# 复制 agents（rust-learner、rust-daily、/docs、/crate-info 命令必需）
mkdir -p ~/.claude/agents
cp -r rust-skills/agents/* ~/.claude/agents/
```

> ⚠️ **注意**：没有 hooks，元认知不会自动触发。需要手动调用 `/rust-router` 或特定 skills。

**为什么需要复制 agents？**

`rust-learner` 和 `rust-daily` 等 skills 通过相对路径（`../../agents/*.md`）引用 agent 文件。如果不将 agents 复制到 `~/.claude/agents/`，这些 skills 会报 "file not found" 错误。

### 功能对比

| 功能 | 完整插件 | 仅 Skills |
|------|----------|-----------|
| 所有 Skills | ✅ | ✅ |
| 自动触发元认知 | ✅ | ❌ |
| Hook 路由 | ✅ | ❌ |
| 后台 Agents | ✅ | ✅（需复制 agents） |

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

| 命令 | 说明 |
|------|------|
| `/rust-features [version]` | 获取 Rust 版本特性 |
| `/crate-info <crate>` | 获取 crate 信息 |
| `/docs <crate> [item]` | 获取 API 文档 |
| `/sync-crate-skills` | 从 Cargo.toml 同步 skills |
| `/update-crate-skill <crate>` | 更新指定 crate skill |
| `/clean-crate-skills` | 清理本地 crate skills |

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
│  400+ 关键词触发元认知流程               │
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

## 许可证

MIT 许可证 - 详见 [LICENSE](LICENSE)

## 链接

- **GitHub**: https://github.com/ZhangHanDong/rust-skills
- **Issues**: https://github.com/ZhangHanDong/rust-skills/issues
