# Rust-Skills 架构设计

> 当前架构:路由逻辑全部在原生二进制 `rust-skills` 中,路由数据全部在 `index/routes.json` 中。
> Hook 与 JS 包装层不含任何路由逻辑。

## 整体数据流

```
用户提交 prompt
      │
      ▼
UserPromptSubmit hook (Claude Code / Codex)
      │  hook 事件 JSON 通过 stdin 传入
      ▼
┌─────────────────────────────────────────────────────────────┐
│  原生二进制  rust-skills hook <claude|codex>                │
│  (crates/rust-skills-cli/src/main.rs, 每次 ~10ms)           │
│                                                             │
│  1. extract_hook_prompt: 从 hook 事件 JSON 中提取 prompt    │
│  2. 定位 runtime root, 加载 index/routes.json               │
│  3. rust_signals 全局门控 (关键词 + 正则 + 否决正则)        │
│  4. 38 条 route 匹配 → 映射到 35 个已注册 skill             │
│  5. 注入上限 5 个 skill (层级配额截断)                      │
└─────────────────────────────────────────────────────────────┘
      │
      ├─ 非 Rust prompt → 不注入 (claude: 空输出; codex: {})
      │
      ▼ Rust prompt
注入上下文:
  - claude: 纯文本 (AUTO ROUTE 块 + ROUTING CONTRACT 块)
  - codex:  JSON envelope (hookSpecificOutput.additionalContext)
      │
      ▼
Agent 按注入的列表加载 rust-router 及匹配的 SKILL.md
```

## 组件

| 组件 | 路径 | 职责 |
|------|------|------|
| 原生路由引擎 | `crates/rust-skills-cli/` | 唯一的路由实现:门控、匹配、截断、上下文格式化 |
| 路由注册表 | `index/routes.json` | 唯一的路由数据:rust_signals + routes + skills |
| Skills | `skills/*/SKILL.md` | 35 个已注册技能 (认知框架内容) |
| Node 包装 hook | `.claude/hooks/rust-skill-eval-hook.js`<br>`.codex/hooks/rust-skill-router-hook.js` | 仅用于 repo checkout / plugin 布局的薄透传层 |
| 包装核心 | `lib/hook-core.js` | 定位二进制并以 stdin 透传方式 spawn `rust-skills hook <platform>` |
| 安装器 | `install.js` | 复制运行时数据、安装二进制、写入 hook 设置 |
| 测试门 | `tests/verify-all.mjs` | 全量验证 (~15s),必须以 `verify all: PASS` 结束 |

完整安装 (`node install.js`) 写入的 hook 设置**直接调用二进制**:
`<targetRoot>/bin/rust-skills hook claude|codex`,不经过任何 JS。
Node 包装 hook 只为尚未完整安装的布局保留,它们没有路由逻辑,
找不到二进制时只打印一条 stderr 提示、不注入、exit 0——hook 永远不会触发 cargo 构建。

## 路由注册表 (index/routes.json)

### rust_signals — 全局门控

判断 prompt 是否是 Rust 相关,分两级证据:

- **强证据** (`regexes`,30 条):`\bE0\d{3,4}\b`、`cargo build|test|...`、`crates.io` 等,命中即通过。
- **弱证据** (`keywords`,34 个):`rust`、`rustc`、`tokio`、`Cargo.toml`、`borrow checker` 等。
  弱证据可被 **否决正则** (`not_regexes`,4 条) 推翻,用于排除
  "rust stains"(铁锈)、"rust the game"、"Tokio Marine"(东京海上)、"铁锈/生锈/除锈" 这类假阳性。
  强证据始终压过否决。

### routes — 38 条路由

每条 route 含 `keywords` / `regexes` / `priority` / `requires_rust_signal`。
36 条要求 rust_signal 通过才参与匹配(例外:`learner-clippy`、`rust-daily`)。
命中任一关键词或正则即匹配,匹配结果按 router 优先、再按 priority 降序排序。

### skills — 35 个技能,按层组织

| 层 | 数量 | 技能 |
|----|------|------|
| router | 1 | rust-router |
| layer1 (语言机制) | 8 | m01-ownership ... m07-concurrency, unsafe-checker |
| layer2 (设计选择) | 7 | m09-domain ... m15-anti-pattern |
| layer3 (领域约束) | 7 | domain-fintech, domain-web, domain-cli, domain-embedded, domain-cloud-native, domain-iot, domain-ml |
| utility | 12 | rust-learner, coding-guidelines, rust-daily, rust-code-navigator 等 |
| experimental | 0 | (预留层) |

### 注入截断:上限 5 个,带层级配额

关键词堆叠的 prompt 可能命中很多 route。注入列表硬上限为 5 个 skill
(`MAX_INJECTED_SKILLS`),截断时不是纯按 priority,而是:
**router + 最佳 layer3 + 最佳 layer2 各保底一个名额**,剩余名额按 priority 填充。
这是系统的核心论点——领域约束 (L3) 与设计选择 (L2) 必须和语言机制 (L1) 共同加载。
完整匹配仍然全部保留在 JSON 输出的 `matches` 中,只有注入列表被截断 (`truncated: true`)。

### 路由输出 JSON (schema_version: 2)

```json
{
  "schema_version": 2,
  "decision": "inject | no-op",
  "should_inject": true,
  "rust_signal": true,
  "skills": ["rust-router", "m01-ownership", "domain-fintech"],
  "layers": { "router": [...], "layer1": [...], "layer2": [...], "layer3": [...], "utility": [...], "experimental": [...] },
  "matches": [ { "route": "...", "skill": "...", "priority": 930, "matched": { "kind": "regex", "value": "..." } } ],
  "paths": { "m01-ownership": "skills/m01-ownership/SKILL.md" },
  "truncated": false,
  "runtime_root": "/path/to/runtime"
}
```

## 匹配引擎细节

- **正则按 JS RegExp 语义编译**:注册表正则原本写给 JS `RegExp`(`\b`/`\w` 为 ASCII 语义),
  Rust regex crate 默认 Unicode 语义会让 `\b` 在 CJK 邻接处失效。
  引擎在编译前重写 `\b → (?-u:\b)`、`\w → [0-9A-Za-z_]`、`\d → [0-9]`,
  所以 "E0382错误"、"main.rs报错" 这类中英混排照常命中。正则统一忽略大小写。
- **关键词匹配是手写的 ASCII 边界子串搜索**:两侧要求非 ASCII 单词字符
  (CJK 字符算边界),避免 "Rocket" 命中 `Rc`、"trusted" 命中 `rust`。
  12 个标准库token保持大小写敏感:`Rc, Arc, Box, RefCell, Cell, Mutex, RwLock, Send, Sync, Drop, Result, Option`。
- **prompt 输入**:`route`/`detect` 可从 argv 取,或用 `-` 从 stdin 读;`hook` 始终读 stdin 的事件 JSON。

## CLI 命令面

```
rust-skills route [--json] <prompt | ->    # 主命令: 路由并输出匹配 skill
rust-skills hook <claude|codex>            # hook 入口: stdin 读事件 JSON, 输出注入内容
rust-skills index list [--json]            # 列出注册表中所有 skill
rust-skills index query <skill-id>         # 查询单个 skill 路径与元数据
rust-skills verify [--json]                # 注册表完整性检查
rust-skills detect [--json] <prompt | ->   # 已废弃, route 的别名 (输出字段更少)
```

`verify` 会编译注册表里的**每一条**正则、检测重复 skill/route id、缺失的 SKILL.md 文件、
不可达 skill(无任何 route 指向,报 warning),并对 rust-router 的 SKILL.md 做结构检查。

## Runtime Root 发现顺序

二进制按以下顺序找到包含 `index/routes.json` 的数据根:

1. `RUST_SKILLS_ROOT` 环境变量 —— 设置了但目录无效会**报错退出**,不静默回退
2. 可执行文件相对路径:`bin/../rust-skills`、`bin/..`、repo 布局 `target/<profile>/../..`
3. 当前工作目录
4. `~/.codex/rust-skills` → `~/.claude/rust-skills` → `~/.local/share/rust-skills`

## 测试

```
node tests/verify-all.mjs    # 全量门, ~15s, 必须以 "verify all: PASS" 结束
```

包含 cargo build/test、`rust-skills verify`、Rust/JS CLI 一致性、AOM 路由评测、
hook 路由、安装 e2e、打包安全等。两个语料各司其职:

- `tests/routing-corpus.json`(56 条):与 routes.json 共同演化的**回归钉子**,期望逐条精确。
- `tests/fixtures/heldout-corpus.json`(71 条):**盲写的留出集**,只设泛化下限阈值;
  如果要改这个语料才能让路由通过,说明路由失去了泛化能力——应该修路由而不是改语料。

## Hook 细节

hook 触发链、平台输出格式、降级行为见 [hook-mechanism-zh.md](hook-mechanism-zh.md)。
