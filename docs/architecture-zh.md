# Rust-Skills 架构设计

> Skills 系统架构与最佳实践

## 整体架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                          用户问题                                    │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Hook 触发层                                   │
│  hooks/hooks.json + .claude/hooks/rust-skill-eval-hook.js           │
│  - 400+ 关键词匹配 (中/英/错误码)                                    │
│  - 强制元认知流程                                                    │
│  - 强制输出格式                                                      │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        路由层 (rust-router)                          │
│  - 识别入口层 (L1/L2/L3)                                            │
│  - 检测领域关键词                                                    │
│  - 决策: 双技能加载                                                  │
└───────────┬─────────────────────────────────┬───────────────────────┘
            │                                 │
            ▼                                 ▼
┌───────────────────────┐       ┌───────────────────────────────────┐
│    静态 Skills 层      │       │         动态 Skills 层             │
│                        │       │                                    │
│  skills/               │       │  ~/.claude/skills/ (全局)          │
│  ├── m01-m07 (L1)     │       │  ├── tokio/                        │
│  ├── m09-m15 (L2)     │       │  ├── serde/                        │
│  ├── domain-* (L3)    │       │  └── std/                          │
│  ├── rust-router      │       │                                    │
│  ├── coding-guidelines│       │  .claude/skills/ (项目级)          │
│  └── unsafe-checker   │       │  └── project-specific-crate/       │
└───────────┬───────────┘       └───────────────┬───────────────────┘
            │                                   │
            └─────────────┬─────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Agents 层                                     │
│  agents/                                                             │
│  ├── rust-changelog      (Rust 版本信息)                            │
│  ├── crate-researcher    (Crate 元数据)                             │
│  ├── docs-researcher     (API 文档)                                 │
│  └── rust-daily-reporter (生态新闻)                                 │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        输出层                                        │
│  - 推理链 (Reasoning Chain)                                         │
│  - 领域约束分析                                                      │
│  - 推荐方案                                                          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 目录结构

```
rust-skills/
│
├── .claude-plugin/
│   └── plugin.json              # 插件清单 (name, skills, hooks)
│
├── .claude/
│   ├── hooks/
│   │   └── rust-skill-eval-hook.js  # 元认知强制脚本
│   └── settings.json            # 本地设置
│
├── hooks/
│   └── hooks.json               # Hook 触发配置 (400+ 关键词)
│
├── skills/                      # 静态 Skills
│   │
│   ├── rust-router/             # 入口路由
│   │   └── SKILL.md
│   │
│   ├── m01-ownership/           # Layer 1: 语言机制
│   ├── m02-resource/
│   ├── m03-mutability/
│   ├── m04-zero-cost/
│   ├── m05-type-driven/
│   ├── m06-error-handling/
│   ├── m07-concurrency/
│   │
│   ├── m09-domain/              # Layer 2: 设计选择
│   ├── m10-performance/
│   ├── m11-ecosystem/
│   ├── m12-lifecycle/
│   ├── m13-domain-error/
│   ├── m14-mental-model/
│   ├── m15-anti-pattern/
│   │
│   ├── domain-fintech/          # Layer 3: 领域约束
│   ├── domain-web/
│   ├── domain-cli/
│   ├── domain-embedded/
│   ├── domain-cloud-native/
│   ├── domain-iot/
│   ├── domain-ml/
│   │
│   ├── coding-guidelines/       # 编码规范
│   ├── unsafe-checker/          # Unsafe 审查
│   ├── rust-learner/            # 信息获取路由
│   ├── rust-daily/              # 新闻聚合
│   │
│   ├── core-dynamic-skills/     # 动态 Skill 框架
│   ├── core-actionbook/         # 网站选择器
│   ├── core-agent-browser/      # 浏览器自动化
│   └── core-fix-skill-docs/     # 文档维护
│
├── agents/                      # 后台研究 Agents
│   ├── rust-changelog.md
│   ├── crate-researcher.md
│   ├── docs-researcher.md
│   ├── std-docs-researcher.md
│   ├── clippy-researcher.md
│   ├── rust-daily-reporter.md
│   └── browser-fetcher.md
│
├── commands/                    # 斜杠命令
│   ├── rust-features.md
│   ├── crate-info.md
│   ├── sync-crate-skills.md
│   └── ...
│
├── _meta/                       # 元认知框架
│   ├── reasoning-framework.md
│   ├── layer-definitions.md
│   ├── error-protocol.md
│   ├── externalization.md
│   └── hooks-patterns.md
│
├── cache/                       # 缓存
│   ├── config.yaml
│   ├── crates/
│   ├── rust-versions/
│   └── docs/
│
├── docs/                        # 文档
│   ├── capabilities-summary.md
│   ├── capabilities-summary-zh.md
│   ├── functional-overview-zh.md
│   ├── architecture-zh.md
│   ├── what-is-a-skill.md
│   ├── problem-solved.md
│   └── skills-design-lessons.md
│
└── templates/                   # 模板
    ├── trace.md
    ├── findings.md
    └── decision.md
```

---

## Skill 文件结构

### SKILL.md 标准格式

```yaml
---
name: skill-name
description: "CRITICAL: Use for [purpose]. Triggers on: keyword1, keyword2, ..."
globs: ["**/*.rs"]  # 可选
---

# Skill 标题

> Layer X: 类别

## Core Question
[元问题 - 引导思考而非直接给答案]

## Error → Design Question
[错误到设计问题的映射表]

## Trace Up ↑
[向上追溯的指引]

## Trace Down ↓
[向下实现的指引]

## Quick Reference
[快速参考表/决策树]

## Common Errors / Anti-Patterns
[常见错误和反模式]

## Related Skills
[相关技能链接]
```

### description 格式 (关键)

```yaml
# 正确格式 - 会被自动触发
description: "CRITICAL: Use for [purpose]. Triggers on: keyword1, keyword2, ..."

# 错误格式 - 不会触发
description: "A skill for handling ownership"
```

---

## 组件关系

### 1. Hook → Router → Skills

```
hooks/hooks.json
    │
    │ 匹配关键词
    ▼
.claude/hooks/rust-skill-eval-hook.js
    │
    │ 注入元认知指令
    ▼
skills/rust-router/SKILL.md
    │
    │ 路由决策
    ▼
skills/m0x-* + skills/domain-*
```

### 2. 静态 Skills vs 动态 Skills

```
┌─────────────────────────────────────────────────────────┐
│                    Claude Code                           │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  插件 Skills (rust-skills/)      用户 Skills             │
│  ┌────────────────────┐         ┌────────────────────┐  │
│  │ skills/            │         │ ~/.claude/skills/  │  │
│  │ - 元认知框架       │         │ - tokio            │  │
│  │ - 领域约束         │         │ - serde            │  │
│  │ - 编码规范         │         │ - std              │  │
│  └────────────────────┘         └────────────────────┘  │
│                                                          │
│                                  ┌────────────────────┐  │
│                                  │ .claude/skills/    │  │
│                                  │ (项目级)           │  │
│                                  │ - sqlx             │  │
│                                  │ - sea-orm          │  │
│                                  └────────────────────┘  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 3. Agents 与 Skills 协作

```
Skills (知识框架)          Agents (信息获取)
       │                         │
       │                         │
       ▼                         ▼
┌─────────────┐           ┌─────────────┐
│ rust-learner│ ────────► │ crate-      │
│ (路由)      │           │ researcher  │
└─────────────┘           └─────────────┘
       │                         │
       │                         │
       ▼                         ▼
┌─────────────┐           ┌─────────────┐
│ 决策框架    │           │ 实时数据    │
│ 如何思考    │           │ 最新信息    │
└─────────────┘           └─────────────┘
       │                         │
       └───────────┬─────────────┘
                   │
                   ▼
            ┌─────────────┐
            │ 准确且符合  │
            │ 最佳实践的  │
            │ 回答        │
            └─────────────┘
```

---

## 数据流

### 完整请求流程

```
1. 用户输入
   "Web API 报错 Rc cannot be sent"
        │
        ▼
2. Hook 触发 (hooks/hooks.json)
   匹配: "Web API", "Rc", "Send"
        │
        ▼
3. Hook 脚本 (rust-skill-eval-hook.js)
   注入: 元认知指令 + 输出格式要求
        │
        ▼
4. Router (rust-router)
   识别: L1 = m07-concurrency
         L3 = domain-web
   决策: 双技能加载
        │
        ▼
5. Skill 加载
   Skill(m07-concurrency) → Send/Sync 机制
   Skill(domain-web) → Web 领域约束
        │
        ▼
6. 追溯推理
   L1: Rc 不是 Send
    ↑
   L3: Web handlers 在任意线程运行
    ↓
   L2: 使用 Arc + State extractor
        │
        ▼
7. 输出
   - 推理链
   - 领域约束分析
   - 推荐方案 (符合 Web 最佳实践)
```

---

## 最佳实践

### 1. Skill 设计

| 原则 | 说明 |
|------|------|
| **是认知协议，不是知识库** | 提供思考框架，不是堆砌知识 |
| **有元问题 (Core Question)** | 引导思考，不是直接给答案 |
| **有追溯指引 (Trace Up/Down)** | 连接到其他层级 |
| **有决策框架** | 决策树/表格，帮助选择 |
| **有反模式** | 明确什么不要做 |

### 2. Description 格式

```yaml
# 好 - 会被自动触发
description: "CRITICAL: Use for concurrency. Triggers on: Send, Sync, async, thread, E0277"

# 好 - 中英文关键词
description: "CRITICAL: Use for ownership. Triggers on: E0382, borrow, 所有权, 借用"

# 差 - 不会触发
description: "Helps with Rust ownership"

# 差 - 关键词太少
description: "CRITICAL: Use for errors"
```

### 3. 目录结构

```
# 好 - 扁平结构
skills/
├── domain-web/
├── domain-fintech/
└── m01-ownership/

# 差 - 嵌套结构 (不会被识别)
skills/
├── domains/
│   ├── web/
│   └── fintech/
└── layers/
    └── m01/
```

### 4. Hook 配置

```json
// 好 - 领域关键词检测 + 强制双技能加载
{
  "matcher": "(?i)(Web API|HTTP|axum).*?(Send|Sync|thread)",
  "action": "Load domain-web AND m07-concurrency"
}

// 差 - 只匹配错误码
{
  "matcher": "E0277",
  "action": "Load m07-concurrency"
}
```

### 5. 输出格式

```markdown
# 好 - 完整推理链
### 推理链
+-- Layer 1: Send/Sync 错误
|       ^
+-- Layer 3: Web 领域约束
|       v
+-- Layer 2: 设计决策

### 领域约束分析
[引用 domain-web 中的规则]

### 推荐方案
[代码]

# 差 - 只有答案
用 Arc 替代 Rc。
```

### 6. 动态 Skills 存储

| 场景 | 存储位置 |
|------|----------|
| 常用 crate (tokio, serde, std) | `~/.claude/skills/` |
| 项目特定依赖 | `项目/.claude/skills/` |
| 临时学习 | 项目级，用完删除 |

### 7. Skill 继承模式

对于复杂的 crate，采用 **父子 Skill** 结构：

```
~/.claude/skills/
├── tokio/                     # 父 Skill (入口)
│   ├── SKILL.md              # 广泛触发词，概览性内容
│   └── references/
│       └── rust-defaults.md  # 共享规则
│
├── tokio-task/               # 子 Skill (专门领域)
│   ├── SKILL.md
│   └── references/
│       └── rust-defaults.md  → symlink to ../tokio/references/
│
├── tokio-sync/               # 子 Skill
├── tokio-time/               # 子 Skill
├── tokio-io/                 # 子 Skill
└── tokio-net/                # 子 Skill
```

**父 Skill** (`tokio/SKILL.md`):

```yaml
---
name: tokio
description: |
  CRITICAL: Use for tokio async runtime questions. Triggers on:
  tokio, spawn, select!, join!, mpsc, timeout, sleep, ...
---
# 广泛的触发词，覆盖整个 crate
# 概览性内容：核心概念、模块列表
# 引导到子 Skills
```

**子 Skill** (`tokio-task/SKILL.md`):

```yaml
---
name: tokio-task
description: |
  CRITICAL: Use for tokio task management. Triggers on:
  tokio::spawn, JoinHandle, JoinSet, spawn_blocking, abort, ...
---
# 专门领域的深入内容
# 更具体的触发词
# 引用共享规则
```

**共享规则** (`references/rust-defaults.md`):

```markdown
# Rust Code Generation Defaults

## Cargo.toml Defaults
edition = "2024"   # 所有子 Skill 共享

## Common Dependencies
| Crate | Version |
|-------|---------|
| tokio | 1.49    |

## Code Style
...
```

**继承优势**:

| 问题 | 继承方案 |
|------|----------|
| 触发精度 | 父 Skill 广泛匹配，子 Skill 精确匹配 |
| 内容深度 | 父 Skill 概览，子 Skill 深入 |
| 规则复用 | 共享 `rust-defaults.md` |
| 维护成本 | 更新共享规则自动生效 |
| 上下文节省 | 只加载需要的子 Skill |

**实现步骤**:

```bash
# 1. 创建父 Skill
~/.claude/skills/tokio/SKILL.md
~/.claude/skills/tokio/references/rust-defaults.md

# 2. 创建子 Skills，symlink 共享规则
cd ~/.claude/skills/tokio-task/references
ln -s ../../tokio/references/rust-defaults.md .

# 3. 子 Skill 引用共享规则
# 在 SKILL.md 中：
# **IMPORTANT: Before generating any Rust code,
#  read `./references/rust-defaults.md` for shared rules.**
```

### 8. Agent 使用

```
# 好 - 通过 rust-learner 路由
/crate-info tokio

# 好 - 有缓存策略
检查缓存 → 过期则获取 → 更新缓存

# 差 - 直接 WebSearch
不要用 WebSearch 查 Rust/crate 信息
```

---

## 扩展指南

### 添加新的 Layer 1 Skill

```markdown
---
name: m08-new-skill
description: "CRITICAL: Use for [topic]. Triggers on: keyword1, keyword2"
---

# New Skill Title

> Layer 1: Language Mechanics

## Core Question
**[引导性问题]?**

## Trace Up ↑
[什么时候向上追溯到 L2/L3]

## Trace Down ↓
[从设计决策如何实现]
```

### 添加新的 Domain Skill

```markdown
---
name: domain-new
description: "CRITICAL: Use for [domain]. Triggers on: keyword1, keyword2"
---

# Domain Name

> Layer 3: Domain Constraints

## Domain Constraints → Design Implications
| 领域规则 | 设计约束 | Rust 实现 |

## Trace Down ↓
[从约束到设计到实现]
```

### 添加新的 Agent

```markdown
# agent-name.md

## Purpose
[获取什么信息]

## Data Source
[从哪里获取]

## Output Format
[返回什么格式]

## Cache Strategy
[缓存多久]
```

---

## 总结

### 架构要点

| 层级 | 组件 | 职责 |
|------|------|------|
| 触发层 | hooks/hooks.json | 关键词匹配，触发流程 |
| 强制层 | rust-skill-eval-hook.js | 注入元认知指令 |
| 路由层 | rust-router | 识别层级，双技能加载 |
| 知识层 | skills/* | 认知框架，决策指引 |
| 扩展层 | ~/.claude/skills/ | 动态生成的 crate skills |
| 数据层 | agents/* | 实时获取最新信息 |
| 缓存层 | cache/ | 减少重复请求 |

### 设计原则

1. **Skills 是认知协议，不是知识库**
2. **强制追溯，不能停在 Layer 1**
3. **领域检测，双技能加载**
4. **输出格式强制推理链**
5. **扁平目录结构**
6. **动态 Skills 按需生成**
7. **Agents 获取实时信息**
