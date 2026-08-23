# Forced Eval Hook 原理

> ⚠️ **历史设计文档** — 本文描述的强制评估 hook 方案已被**原生 hook（`rust-skills hook <claude|codex>`）+ 建议式路由契约**取代，不再反映当前实现。现行机制见 [hook-mechanism-zh.md](hook-mechanism-zh.md)。

> 解决 Claude Code Skills 自动触发不可靠的问题

## 问题背景

### Claude 的行为特点

> "Claude is so goal focused that it barrels ahead with what it thinks is the best approach. It doesn't check for tools unless explicitly told to."

Claude 非常专注于目标，会直接用它认为最好的方式处理问题，**不会主动检查可用的 skills**，即使 skill 的 description 中有匹配的关键词。

### 触发成功率对比

| 方法 | 成功率 | 说明 |
|------|--------|------|
| 仅靠 description 关键词 | **~20%** | Claude 很少主动检查 |
| 简单指令 hook | 40-50% | "建议"检查，Claude 可能忽略 |
| **Forced Eval Hook** | **~84%** | 强制评估，效果最好 |
| LLM Eval Hook | ~80% | 需要额外 API 调用 |

## Forced Eval Hook 原理

### 核心思想

**强制** Claude 在执行任务前必须评估每个 skill，而不是"建议"它检查。

关键在于使用 **强制性语言**：
- `MANDATORY` - 强制的
- `CRITICAL` - 关键的
- `MUST` - 必须
- `DO NOT skip` - 不要跳过

### 工作流程

```
┌─────────────────────────────────────────────────────────────┐
│                     User Prompt                              │
│              "E0382 错误怎么解决"                            │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              UserPromptSubmit Hook                           │
│                                                              │
│  1. Regex matcher 检查是否匹配                               │
│     (?i)(rust|cargo|E0\d{3,4}|...)                          │
│                                                              │
│  2. 匹配成功 → 执行 hook script                              │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              Hook Script 输出                                │
│                                                              │
│  === MANDATORY SKILL EVALUATION ===                         │
│                                                              │
│  CRITICAL: Before proceeding, you MUST:                     │
│  1. EVALUATE each skill against this prompt                 │
│  2. State: "[skill-name]: YES/NO - [reason]"                │
│  3. ACTIVATE matching skills using Skill(name)              │
│  4. Only THEN proceed with response                         │
│                                                              │
│  DO NOT skip this evaluation.                               │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              Claude 处理                                     │
│                                                              │
│  收到: Hook 输出 + User Prompt                               │
│                                                              │
│  执行:                                                       │
│  1. 评估每个 skill                                           │
│     m01-ownership: YES - E0382 是所有权错误                  │
│     m02-resource: NO - 不涉及智能指针                        │
│     ...                                                      │
│  2. 调用 Skill(m01-ownership)                                │
│  3. 使用 skill 内容回答问题                                   │
└─────────────────────────────────────────────────────────────┘
```

### 三步骤流程

```
EVALUATE → ACTIVATE → IMPLEMENT
  评估   →   激活   →   实现
```

1. **EVALUATE**: 对每个 skill 进行 YES/NO 判断
2. **ACTIVATE**: 使用 `Skill(skill-name)` 调用匹配的 skills
3. **IMPLEMENT**: 激活后才开始实际回答

## 实现细节

### 1. Hook 配置 (settings.json)

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": "(?i)(rust|cargo|crate|E0\\d{3,4}|...)",
        "command": ".claude/hooks/rust-skill-eval-hook.js"
      }
    ]
  }
}
```

**配置说明**：
- `UserPromptSubmit`: 用户提交 prompt 时触发
- `matcher`: 正则表达式，匹配时才执行 hook
- `command`: 要执行的脚本路径（相对于项目根目录）

### 2. Hook Script

```bash
#!/bin/bash
cat << 'EOF'

=== MANDATORY SKILL EVALUATION ===

CRITICAL: Before proceeding with this Rust-related request, you MUST:

1. EVALUATE each available rust-skill against this prompt:

   OWNERSHIP & MEMORY:
   - m01-ownership: ownership, borrow, lifetime, E0382, E0597
   - m02-resource: Box, Rc, Arc, RefCell, smart pointer
   ...

2. For EACH potentially relevant skill, state: "[skill-name]: YES/NO - [brief reason]"

3. ACTIVATE all YES skills using: Skill(skill-name)

4. Only THEN proceed with your response

DO NOT skip this evaluation.
DO NOT proceed without activating relevant skills first.
This is MANDATORY for all Rust-related requests.

===================================

EOF
```

**关键技巧**：

1. **使用强制性语言**: MANDATORY, CRITICAL, MUST, DO NOT
2. **列出所有 skills 及其关键词**: 减少 Claude 遗漏
3. **要求显式推理**: 必须写出 YES/NO 和原因
4. **明确执行顺序**: 评估 → 激活 → 实现

### 3. Matcher 正则表达式

```regex
(?i)(rust|cargo|crate|ownership|borrow|lifetime|async|await|
trait|generic|unsafe|ffi|error|result|option|tokio|serde|axum|
E0\d{3,4}|所有权|借用|生命周期|异步|并发|错误处理|版本|
创建.*项目|创建.*skill|create.*skill|动态.*skill)
```

**设计原则**：
- `(?i)` - 大小写不敏感
- 包含英文和中文关键词
- 包含常见 crate 名称
- 包含错误代码模式 `E0\d{3,4}`
- 尽量宽泛，宁可多触发不要漏

## 为什么有效

### 1. 心理学原理

Hook 注入的文本使用了类似"系统指令"的语气，Claude 会将其视为高优先级指令。

### 2. 明确的检查清单

列出所有 skills 和关键词，让 Claude 知道有哪些选项可用，而不是依赖它自己去发现。

### 3. 强制输出推理过程

要求输出 "YES/NO - reason" 格式，强制 Claude 进行显式推理，而不是直接跳过。

### 4. 延迟执行

"Only THEN proceed" 确保 Claude 先完成评估和激活，再开始实际回答。

## 局限性

| 局限 | 说明 |
|------|------|
| 不是 100% | 仍有 ~16% 失败率 |
| 增加 token | Hook 文本增加输入 token |
| 需要维护 | 新增 skill 需要更新 hook |
| Regex 匹配 | 可能漏掉一些查询 |

## 对比其他方案

### 方案 A: 仅靠 description 关键词

```yaml
# SKILL.md
description: "Keywords: ownership, borrow, lifetime..."
```

**问题**: Claude 不会主动检查 skill descriptions

### 方案 B: 简单提示 Hook

```
You might want to check available skills before responding.
```

**问题**: "might want" 太弱，Claude 经常忽略

### 方案 C: Forced Eval Hook (推荐)

```
CRITICAL: You MUST evaluate each skill. DO NOT skip.
```

**优势**: 强制性语言 + 明确清单 + 显式推理

### 方案 D: LLM Eval Hook

使用另一个 LLM 调用来决定激活哪些 skills。

**问题**: 需要额外 API 调用，增加延迟和成本

## 最佳实践

### 1. Hook 文本设计

```
✅ MUST, CRITICAL, MANDATORY, DO NOT skip
❌ should, might, consider, optionally
```

### 2. Skill 列表格式

```
✅ - skill-name: keyword1, keyword2, keyword3
❌ skill-name (没有关键词提示)
```

### 3. Matcher 覆盖度

```
✅ 宽泛匹配，宁可多触发
❌ 精确匹配，容易漏掉
```

### 4. 定期维护

- 新增 skill 时更新 hook 文本
- 新增关键词时更新 matcher
- 测试触发率并优化

## 参考资料

- [Scott Spence: Claude Code Skill Auto Activation](https://scottspence.com/posts/claude-code-skill-auto-activation)
- [Scott Spence: Claude Code Skill Auto Activation Follow Up](https://scottspence.com/posts/claude-code-skill-auto-activation-follow-up)
- [Claude Code Hooks Documentation](https://docs.anthropic.com/claude-code/hooks)
