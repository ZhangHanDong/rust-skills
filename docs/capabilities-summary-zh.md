# Rust-Skills 能力总结

> rust-skills Claude Code 插件的完整能力清单

## 概览

| 指标 | 数量 |
|------|------|
| Skills 总数 | 39 |
| 后台 Agents | 11 |
| 斜杠命令 | 22 |
| Unsafe 规则 | 47 |
| 编码规范 | 80+ |
| 触发关键词 | 400+ |

---

## 核心架构：元认知框架

### 三层认知模型

```
┌─────────────────────────────────────────────────────┐
│ Layer 3: 领域约束 (WHY)                              │
│ ├── domain-fintech: 审计、精度、不可变性              │
│ ├── domain-web: 无状态、线程安全、异步                │
│ ├── domain-cli: 单线程、用户交互                     │
│ ├── domain-embedded: no_std、资源约束                │
│ ├── domain-cloud-native: 分布式、可观测性            │
│ ├── domain-iot: 低资源、遥测                         │
│ └── domain-ml: 张量运算、推理优化                    │
├─────────────────────────────────────────────────────┤
│ Layer 2: 设计选择 (WHAT)                             │
│ ├── m09-domain: DDD、实体 vs 值对象                  │
│ ├── m10-performance: 基准测试、优化                  │
│ ├── m11-ecosystem: Crate 选择、集成                  │
│ ├── m12-lifecycle: RAII、Drop、资源模式              │
│ ├── m13-domain-error: 重试、熔断器                   │
│ ├── m14-mental-model: 学习、心智模型                 │
│ └── m15-anti-pattern: 代码异味、陷阱                 │
├─────────────────────────────────────────────────────┤
│ Layer 1: 语言机制 (HOW)                              │
│ ├── m01-ownership: 所有权、借用、生命周期            │
│ ├── m02-resource: Box、Rc、Arc、智能指针             │
│ ├── m03-mutability: mut、Cell、RefCell、内部可变性   │
│ ├── m04-zero-cost: 泛型、trait、分发                 │
│ ├── m05-type-driven: Newtype、PhantomData、状态      │
│ ├── m06-error-handling: Result、Error、panic         │
│ └── m07-concurrency: Send、Sync、async、channel      │
└─────────────────────────────────────────────────────┘
```

### 路由流程

```
用户问题
    │
    ▼
┌─────────────────┐
│ Hook 触发       │ ← 400+ 关键词 (中英文/错误码)
│ (UserPromptSubmit)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ rust-router     │ ← 识别入口层 + 领域
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌────────┐
│ L1    │ │ L3     │  ← 双技能加载
│ Skill │ │ Domain │
└───┬───┘ └────┬───┘
    │          │
    └────┬─────┘
         │
         ▼
┌─────────────────┐
│ 追溯 UP/DOWN    │ ← 跨层推理
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 上下文感知的    │ ← 领域最佳实践
│ 答案            │
└─────────────────┘
```

---

## Skills 清单 (共 39 个)

### Layer 1: 语言机制 (7 个)

| Skill | 核心问题 | 触发条件 |
|-------|----------|----------|
| **m01-ownership** | 谁应该拥有这个数据？ | E0382, E0597, E0506, E0507, E0515, E0716, move, borrow, lifetime |
| **m02-resource** | 需要什么所有权模型？ | Box, Rc, Arc, Weak, RefCell, Cell, 智能指针 |
| **m03-mutability** | 不可变性边界在哪里？ | E0596, E0499, E0502, mut, 内部可变性 |
| **m04-zero-cost** | 编译器能优化什么？ | E0277, E0308, E0599, generic, trait, 单态化 |
| **m05-type-driven** | 类型如何编码约束？ | PhantomData, newtype, 类型状态, 建造者模式 |
| **m06-error-handling** | 失败是预期还是异常？ | Result, Option, Error, panic, anyhow, thiserror |
| **m07-concurrency** | 如何在编译期保证安全？ | Send, Sync, thread, async, await, Mutex, channel |

### Layer 2: 设计选择 (7 个)

| Skill | 核心问题 | 关注点 |
|-------|----------|--------|
| **m09-domain** | 领域规则如何变成类型？ | DDD, 实体, 值对象, 聚合, 仓储 |
| **m10-performance** | 性能瓶颈在哪里？ | 基准测试, 性能分析, flamegraph, criterion |
| **m11-ecosystem** | 如何与现有系统集成？ | Crate 选择, FFI, PyO3, WASM, feature flags |
| **m12-lifecycle** | 领域资源模式是什么？ | RAII, Drop, 连接池, OnceCell |
| **m13-domain-error** | 失败恢复策略是什么？ | 重试, 熔断器, 优雅降级 |
| **m14-mental-model** | 正确的心智模型是什么？ | 学习 Rust, 可视化内存, 类比 |
| **m15-anti-pattern** | 常见认知陷阱有哪些？ | 代码异味, 新手错误, 惯用写法 |

### Layer 3: 领域约束 (7 个)

| Skill | 领域 | 关键约束 |
|-------|------|----------|
| **domain-fintech** | 金融 | 审计追踪, 小数精度, 不可变交易 |
| **domain-web** | Web 服务 | 无状态 HTTP, 线程安全状态, 异步处理器 |
| **domain-cli** | 命令行 | 参数解析, TUI, 进度条, 配置文件 |
| **domain-embedded** | 嵌入式/no_std | MCU, 裸机, HAL, 中断, 资源限制 |
| **domain-cloud-native** | 云原生 | Kubernetes, gRPC, 可观测性, 分布式追踪 |
| **domain-iot** | 物联网 | MQTT, 传感器, 边缘计算, 低资源 |
| **domain-ml** | 机器学习 | 张量, 推理, 模型优化 |

### 核心 Skills (4 个)

| Skill | 用途 |
|-------|------|
| **rust-router** | 路由所有 Rust 问题，实现元认知 |
| **rust-learner** | 通过 agents 获取最新 Rust/crate 版本 |
| **coding-guidelines** | 80+ Rust 编码规则（命名、风格、模式） |
| **unsafe-checker** | 47 条 unsafe 规则，SAFETY 注释，FFI 审查 |

### 工具 Skills (13 个)

| Skill | 用途 |
|-------|------|
| **rust-env-setup** | Rust 工具链、Cargo 与 rust-skills runtime 安装配置 |
| **rust-daily** | 聚合 Reddit、TWIR、博客的 Rust 新闻 |
| **rust-skill-creator** | 从文档生成新 skills |
| **core-actionbook** | 预计算的网站选择器 |
| **core-agent-browser** | 浏览器自动化基础设施 |
| **core-dynamic-skills** | 从 Cargo.toml 动态生成 skills |
| **core-fix-skill-docs** | Skill 文档维护 |
| **rust-code-navigator** | LSP 代码导航（定义跳转、引用查找） |
| **rust-call-graph** | 函数调用层次可视化 |
| **rust-symbol-analyzer** | 项目结构符号分析 |
| **rust-trait-explorer** | Trait 实现探索 |
| **rust-refactor-helper** | 安全重构与影响分析 |
| **rust-deps-visualizer** | 依赖图 ASCII 可视化 |

### 实验性 Skills (1 个)

| Skill | 用途 |
|-------|------|
| **meta-cognition-parallel** | 三层并行元认知分析（/meta-cognition-parallel） |

---

## Agents (11 个后台研究员)

| Agent | 数据源 | 用途 |
|-------|--------|------|
| **rust-changelog** | releases.rs | Rust 版本特性，破坏性变更 |
| **crate-researcher** | lib.rs, crates.io | Crate 元数据，版本，features |
| **docs-researcher** | docs.rs | 第三方 crate API 文档 |
| **std-docs-researcher** | doc.rust-lang.org | 标准库文档 |
| **clippy-researcher** | rust-clippy | Lint 解释，分类 |
| **rust-daily-reporter** | Reddit, TWIR, Blog | 生态新闻（日/周/月） |
| **browser-fetcher** | WebFetch | 通用网页内容回退 |
| **layer1-analyzer** | 内部 | 语言机制层（L1）并行分析 |
| **layer2-analyzer** | 内部 | 设计选择层（L2）并行分析 |
| **layer3-analyzer** | 内部 | 领域约束层（L3）并行分析 |
| **docs-cache** | 本地缓存 | 文档缓存读写管理 |

### 工具链优先级

```
1. actionbook MCP    → 预计算选择器
2. agent-browser CLI → 浏览器自动化
3. WebFetch          → 最后回退
```

---

## 命令 (22 个斜杠命令)

### 查询命令

| 命令 | 用途 |
|------|------|
| `/rust-router` | 将问题路由到合适的 skill |
| `/guideline [--clippy] rule` | 查询编码规范 |
| `/skill-index category` | 按分类搜索 skills |
| `/docs crate [item]` | 获取 API 文档 |

### 版本与信息命令

| 命令 | 用途 |
|------|------|
| `/rust-features [version]` | Rust 更新日志/特性 |
| `/crate-info crate` | Crate 元数据 |
| `/rust-daily [day\|week\|month]` | Rust 生态新闻 |
| `/ai-daily [day\|week\|month]` | AI 社区日报（Reddit 多社区） |

### 审计命令

| 命令 | 用途 |
|------|------|
| `/unsafe-check file` | 分析文件的 unsafe 问题 |
| `/unsafe-review file` | 交互式 unsafe 审查 |
| `/rust-review file` | 轻量级 clippy 审查 |
| `/audit [security\|safety\|concurrency\|full]` | 重量级审计 |

### 缓存命令

| 命令 | 用途 |
|------|------|
| `/cache-status [--verbose]` | 显示缓存状态 |
| `/cache-clean [--all\|--expired\|crate]` | 清理缓存 |

### 动态 Skill 命令

| 命令 | 用途 |
|------|------|
| `/sync-crate-skills [--force]` | 从 Cargo.toml 生成 skills |
| `/update-crate-skill crate` | 更新特定 crate skill |
| `/clean-crate-skills [--all]` | 删除动态 skills |
| `/create-skills-via-llms crate path` | 从 llms.txt 创建 skill |
| `/create-llms-for-skills urls` | 从 URL 生成 llms.txt |
| `/create-llms-from-source [path]` | 从本地源码生成 llms.txt |
| `/fix-skill-docs [--check-only]` | 修复 skill 文档 |

### 其他命令

| 命令 | 用途 |
|------|------|
| `/achievement [list\|stats]` | 查看编程成就与进度 |

---

## Unsafe 检查器 (47 条规则)

### 分类

| 类别 | 规则数 | 关注点 |
|------|--------|--------|
| 内存安全 | 12 | 指针有效性, 对齐, 初始化 |
| FFI 安全 | 10 | C 互操作, ABI, extern 函数 |
| 并发 | 8 | Send/Sync 实现, 数据竞争 |
| 未定义行为 | 10 | Transmute, union, 别名 |
| 文档 | 7 | SAFETY 注释, 不变量 |

### SAFETY 注释要求

```rust
// SAFETY: [前置条件] 满足，因为 [理由]
unsafe {
    // 代码
}
```

---

## 编码规范 (80+ 条规则)

### 分类

| 类别 | 规则数 | 示例 |
|------|--------|------|
| 命名 | 15 | snake_case, PascalCase, SCREAMING_SNAKE |
| 数据类型 | 12 | 优先 &str 而非 String, 使用 newtype |
| 错误处理 | 10 | 库中禁止 unwrap, 使用 thiserror |
| 内存 | 8 | 避免不必要的分配 |
| 并发 | 10 | 优先 channel 而非共享状态 |
| 异步 | 8 | 异步中不要阻塞, 限制锁范围 |
| 宏 | 5 | 优先函数而非宏 |
| 文档 | 12 | 文档示例, # Panics, # Errors |

---

## 元认知框架 (_meta/)

| 文件 | 用途 |
|------|------|
| **reasoning-framework.md** | 三层追溯方法论 |
| **layer-definitions.md** | L1/L2/L3 范围和信号 |
| **error-protocol.md** | 3-Strike 升级规则 |
| **externalization.md** | 文件系统作为外部记忆 |
| **hooks-patterns.md** | 认知触发器模式 |

---

## Hook 系统

### 触发关键词 (400+)

| 类别 | 示例 |
|------|------|
| 错误码 | E0382, E0597, E0277, E0499, E0502, E0596 |
| 所有权 | ownership, borrow, lifetime, move, clone |
| 并发 | async, await, Send, Sync, thread, spawn |
| 智能指针 | Box, Rc, Arc, RefCell, Cell, Mutex |
| 领域 | Web API, HTTP, axum, payment, trading, CLI |
| 中文 | 所有权, 借用, 生命周期, 异步, 并发, 智能指针 |
| 问题词 | how to, why, what is, 怎么, 为什么, 如何 |

### Hook 行为

1. **检测领域关键词** → 同时加载 L1 和 L3 skills
2. **强制输出格式** → 要求推理链
3. **强制追溯** → 必须追溯相关层级

---

## 缓存系统

### 配置

| 缓存 | TTL | 用途 |
|------|-----|------|
| Crates | 24h | Crate 元数据 |
| Rust 版本 | 168h | 发布信息 |
| 文档 | 72h | API 文档 |
| Clippy Lints | 168h | Lint 数据 |

### 特性

- 自动清理过期条目
- Stale-while-revalidate 策略
- 每类别大小限制

---

## 项目配置

### 默认 Rust 项目设置

```toml
[package]
edition = "2024"
rust-version = "1.85"

[lints.rust]
unsafe_code = "warn"

[lints.clippy]
all = "warn"
pedantic = "warn"
```

### 插件清单

```json
{
  "name": "rust-skills",
  "version": "1.0.0",
  "skills": "./skills/",
  "hooks": "./hooks/hooks.json"
}
```

---

## 独特能力

### 1. 元认知路由

不只是回答问题，而是**追溯认知层级**提供领域感知的方案。

### 2. 双技能加载

检测到领域上下文时，自动加载两个技能：
- Layer 1 skill (语言机制)
- Layer 3 skill (领域约束)

### 3. 动态 Skill 生成

从 Cargo.toml 依赖自动生成 crate 专属 skills。

### 4. 后台研究 Agents

8 个专业 agents 在后台获取实时数据，不阻塞对话。

### 5. 全面 Unsafe 审计

47 条规则覆盖内存安全、FFI、并发和文档。

### 6. 双语支持

400+ 触发关键词支持中英文。

---

## 示例：元认知实战

**问题**: "我的 Web API 报错 Rc cannot be sent between threads"

**传统回答**:
```
用 Arc 替代 Rc。
```

**元认知回答**:
```
### 推理链
+-- Layer 1: Send/Sync 错误
|   问题: Rc<T> 不能跨线程传递
|       ^
+-- Layer 3: Web 领域 (domain-web)
|   约束: Handlers 在任意线程运行
|   规则: 共享状态必须线程安全
|       v
+-- Layer 2: 设计选择
    决策: 使用 Arc<T> + State extractor

### 领域约束分析
来自 domain-web:
- "Rc in state" 被列为常见错误
- Web handlers 需要 Send + Sync 约束
- 推荐模式: axum State<Arc<T>>

### 推荐方案
[使用 axum State extractor 和 Arc 的完整代码，
遵循 Web 领域最佳实践]
```

---

## 总结

**rust-skills** 将 Claude 从 Rust 知识库转变为**领域感知的 Rust 架构师**：

1. **路由** 问题通过合适的认知层级
2. **追溯** 找到底层领域约束
3. **推荐** 符合领域最佳实践的方案
4. **研究** 通过后台 agents 获取实时数据
5. **审计** 代码的安全性和风格合规性

**目标**: 表面修复 → 架构合理、领域感知的方案
