# Hook 机制详解

> Hook 只做一件事:在 UserPromptSubmit 时把 hook 事件交给原生二进制
> `rust-skills hook <claude|codex>`。门控、路由、上下文格式化全部在二进制内完成。
> 路由数据与引擎本身见 [architecture-zh.md](architecture-zh.md)。

## 触发链路

两种布局,同一个二进制:

```
完整安装 (node install.js):
  UserPromptSubmit
        │  设置文件中的 command 直接是二进制
        ▼
  <targetRoot>/bin/rust-skills hook claude|codex
        │  stdin: hook 事件 JSON
        ▼
  路由 → 输出注入内容 (或空)

repo checkout / plugin 布局:
  UserPromptSubmit
        │  hooks/hooks.json: node .claude/hooks/rust-skill-eval-hook.js
        ▼
  Node 包装 hook (.claude/ 或 .codex/ 下)        ── 无路由逻辑
        │  定位 lib/hook-core.js
        ▼
  lib/hook-core.js                               ── 无路由逻辑
        │  定位二进制, stdin 透传 spawn (5s 超时)
        ▼
  rust-skills hook claude|codex
```

`install.js` 写入的 hook 设置(`~/.claude/settings.json` / `~/.codex/hooks.json`)
直接调用 `<targetRoot>/bin/rust-skills hook <platform>`,完整安装下不经过任何 JS。

### hooks.json 没有 matcher

```json
{
  "hooks": {
    "UserPromptSubmit": [
      { "hooks": [{ "type": "command", "command": "node ${CLAUDE_PLUGIN_ROOT}/.claude/hooks/rust-skill-eval-hook.js" }] }
    ]
  }
}
```

Claude Code 对 UserPromptSubmit **不应用 matcher**,所以配置里也不写。
"这条 prompt 是不是 Rust" 的判定全部发生在二进制内部,
依据 `index/routes.json` 的 `rust_signals` 门控(含否决正则,见架构文档)。

## 输入:prompt 提取

`hook` 子命令从 stdin 读 hook 事件 JSON,由 `extract_hook_prompt`
(crates/rust-skills-cli/src/main.rs) 提取 prompt,兼容常见 payload 形状:

- 顶层字段:`prompt` / `user_prompt` / `userPrompt` / `user_input` / `input_text` 等
- `message` / `input` 对象的 `content` / `text`
- `messages` 数组(含 `conversation.messages` / `thread.messages`):取最后一条 user 消息,
  支持 `content` 为字符串或 `[{type:"text", text:...}]` 数组
- 嵌套容器:`payload` / `event` / `request` / `body` 递归一层

非 JSON 输入按原样当作 prompt;无法识别的 JSON 形状**安全失败**(空 prompt → 不注入)。

## 输出:按平台分流

| 情形 | `hook claude` | `hook codex` |
|------|---------------|--------------|
| Rust prompt | 纯文本上下文 | `{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":"..."}}` |
| 非 Rust prompt | 空输出 | `{}` |

注入的上下文文本包含两个块:

```
=== RUST SKILLS AUTO ROUTE ===
matched skills: rust-router, m01-ownership, domain-fintech
runtime root: /path/to/runtime
skill files:
- rust-router: skills/rust-router/SKILL.md
- ...
match reasons: signal: rust; regex: \bE(0382|...)\b; keyword: 交易
===

=== RUST SKILLS ROUTING CONTRACT ===
(建议式契约, 仅约束 Rust 相关工作:
 1. 匹配到的 skill 携带项目约定、领域约束、版本事实与已知坑, 查这些内容时以 skill 为准;
 2. 一般推理以 agent 自身的 Rust 专业知识优先, 不要让 skill 模板限制回答深度;
 3. 当匹配 skill 标注的护栏与当前任务相关时 (如跨 await 持锁、退出码契约、unsafe 不变量), 应当应用;
 4. 深层 skill 文件位于已安装 runtime 数据根之下)
===
```

注入的 skill 列表最多 5 个,截断时 router / layer3 / layer2 各有保底名额(见架构文档)。

## 失败行为:hook 永不阻塞宿主 prompt

- `rust-skills hook` **始终 exit 0**;运行时损坏(注册表缺失/解析失败)只上报 stderr,
  输出退化为"不注入"。
- Node 包装层找不到 `lib/hook-core.js` 或二进制时:打印**一条** stderr 提示
  (`routing disabled: ... run node install.js or cargo build --release`),不注入,exit 0。
- hook 链路**永远不触发 cargo 构建**;包装层 spawn 二进制带 5 秒超时。

## 性能

整条链路是一次原生进程调用,每条 prompt 约 **10ms**(release 构建,热路径实测含 spawn 约 12ms)。

## 调试

```bash
# 模拟 hook 调用
echo '{"prompt":"交易系统里 E0382 怎么解决"}' | rust-skills hook claude

# 直接看路由决策 (含 layers / matches / truncated 等完整字段)
rust-skills route --json "fix E0382 in my tokio web service"

# 在注入内容中附带原始路由 JSON
RUST_SKILLS_DEBUG=1 ...   # 二进制: 注入内容追加 ROUTE JSON 块; 包装层: stderr 打印定位细节
```

包装层定位二进制的顺序:`RUST_SKILLS_BIN` 环境变量 → `<platformRoot>/bin/` →
仓库 `target/release|debug/` → `~/.claude/bin`、`~/.codex/bin` → `~/.local/bin` → `PATH`。
二进制定位路由数据的顺序见架构文档的 "Runtime Root 发现顺序"。

### Hook 没生效时的检查单

```
□ rust-skills 二进制存在 (node install.js 或 cargo build --release)
□ 设置文件里有 UserPromptSubmit 条目 (完整安装: 直接指向 bin/rust-skills)
□ echo '{"prompt":"cargo build 报错"}' | rust-skills hook claude 有输出
□ rust-skills verify 输出 PASS
□ 非 Rust prompt 本来就不注入 —— 用含强信号的 prompt 测试 (E0382 / cargo build)
```

## 测试

`node tests/verify-all.mjs` 是统一的门(必须以 `verify all: PASS` 结束),
其中 `tests/hook-routing-test.mjs` 覆盖 hook 链路本身,
`tests/routing-corpus.json`(回归钉子)与 `tests/fixtures/heldout-corpus.json`
(盲写留出集,泛化下限)覆盖路由质量。
