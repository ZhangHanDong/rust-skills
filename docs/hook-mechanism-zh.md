# Hook 机制详解

> 如何利用 Hook 强制触发 Skills

## 问题背景

### 没有 Hook 的情况

```
用户: "Web API 报错 Rc cannot be sent"

Claude 默认行为:
  → 直接从知识库回答
  → "用 Arc 替代 Rc"
  → 不加载任何 Skill
  → 不追溯领域约束
```

**问题**: Skill 定义了很好的认知框架，但 Claude 不会主动使用。

### 有 Hook 的情况

```
用户: "Web API 报错 Rc cannot be sent"

Hook 触发:
  → 匹配关键词 "Web API", "Send"
  → 注入元认知指令
  → 强制加载 Skills
  → 强制输出推理链
```

**效果**: 确保每次 Rust 问题都经过元认知流程。

---

## Hook 工作原理

### 触发流程

```
┌─────────────────────────────────────────────────────────────┐
│                      用户输入                                │
│              "Web API 报错 Rc cannot be sent"               │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 hooks/hooks.json                             │
│                                                              │
│  {                                                           │
│    "hooks": {                                                │
│      "UserPromptSubmit": [{                                  │
│        "matcher": "(?i)(rust|Web API|Send|...)",            │
│        "hooks": [{                                           │
│          "type": "command",                                  │
│          "command": "...rust-skill-eval-hook.js"            │
│        }]                                                    │
│      }]                                                      │
│    }                                                         │
│  }                                                           │
│                                                              │
│  匹配成功! → 执行 hook 脚本                                  │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│           .claude/hooks/rust-skill-eval-hook.js             │
│                                                              │
│  输出元认知指令:                                             │
│  - 强制识别层级和领域                                        │
│  - 强制加载 Skills                                           │
│  - 强制输出格式                                              │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Claude 执行                               │
│                                                              │
│  1. 收到用户问题 + Hook 注入的指令                           │
│  2. 按指令加载 Skills                                        │
│  3. 按指令执行追溯                                           │
│  4. 按指令格式输出                                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 配置文件详解

### 1. hooks/hooks.json (触发配置)

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": "(?i)(rust|cargo|rustc|crate|Cargo\\.toml|E0\\d{3}|ownership|borrow|lifetime|Send|Sync|async|await|Arc|Rc|Mutex|trait|generic|Result|Error|panic|unsafe|FFI|Web API|HTTP|axum|actix|所有权|借用|生命周期|异步|并发|怎么|如何|为什么)",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/.claude/hooks/rust-skill-eval-hook.js"
          }
        ]
      }
    ]
  }
}
```

**关键点**:

| 字段 | 说明 |
|------|------|
| `UserPromptSubmit` | Hook 时机: 用户提交问题时 |
| `matcher` | 正则表达式，匹配触发条件 |
| `(?i)` | 忽略大小写 |
| `type: command` | 执行 shell 命令 |
| `${CLAUDE_PLUGIN_ROOT}` | 插件根目录变量 |

### 2. matcher 关键词设计

```regex
(?i)(
  # Rust 基础
  rust|cargo|rustc|crate|Cargo\.toml|

  # 错误码
  E0\d{3}|

  # 所有权系统
  ownership|borrow|lifetime|move|clone|

  # 并发
  Send|Sync|async|await|thread|spawn|

  # 智能指针
  Arc|Rc|Box|RefCell|Cell|Mutex|

  # 类型系统
  trait|generic|impl|dyn|

  # 错误处理
  Result|Error|panic|unwrap|

  # Unsafe
  unsafe|FFI|extern|

  # 领域关键词
  Web API|HTTP|axum|actix|payment|trading|CLI|embedded|

  # 中文
  所有权|借用|生命周期|异步|并发|智能指针|

  # 问题词
  怎么|如何|为什么|what|how|why
)
```

### 3. rust-skill-eval-hook.js (强制脚本)

```bash
#!/bin/bash
cat << 'EOF'

=== MANDATORY: META-COGNITION ROUTING ===

CRITICAL: You MUST follow the COMPLETE meta-cognition framework.

## STEP 1: IDENTIFY ENTRY LAYER + DOMAIN

| Keywords in Question | Domain Skill to Load |
|---------------------|---------------------|
| Web API, HTTP, axum | domain-web |
| payment, trading    | domain-fintech |
| CLI, clap, terminal | domain-cli |

**CRITICAL**: If domain keywords present, load BOTH L1 and L3 skills.

## STEP 2: EXECUTE TRACING (MANDATORY)

L1 Error → Trace UP to L3 → Find constraint → Trace DOWN to solution

## STEP 3: MANDATORY OUTPUT FORMAT

### Reasoning Chain
+-- Layer 1: [error]
|       ^
+-- Layer 3: [domain constraint]
|       v
+-- Layer 2: [design decision]

### Domain Constraints Analysis
[Reference domain skill rules]

### Recommended Solution
[Code following best practices]

EOF
```

**关键点**:

| 部分 | 作用 |
|------|------|
| 领域检测表 | 强制识别领域，加载对应 Skill |
| 双技能加载 | 同时加载 L1 + L3 |
| 追溯指令 | 强制执行 UP/DOWN 追溯 |
| 输出格式 | 强制要求推理链结构 |

---

## Hook 类型

### Claude Code 支持的 Hook 时机

| Hook 类型 | 触发时机 | 用途 |
|-----------|----------|------|
| `UserPromptSubmit` | 用户提交问题时 | **主要使用** - 注入元认知指令 |
| `PreToolUse` | 调用工具前 | 可用于工具调用前检查 |
| `PostToolUse` | 工具调用后 | 可用于结果后处理 |
| `Stop` | 会话结束时 | 可用于清理或总结 |

### rust-skills 使用的 Hook

```json
{
  "UserPromptSubmit": [
    {
      "matcher": "...",
      "hooks": [{ "type": "command", "command": "..." }]
    }
  ]
}
```

**为什么选择 UserPromptSubmit**:
- 最早时机，在 Claude 思考前注入
- 可以影响整个回答流程
- 不会遗漏任何匹配的问题

---

## 强制机制设计

### 1. 关键词覆盖策略

```
目标: 确保所有 Rust 相关问题都被触发

策略:
├── 语言关键词: rust, cargo, crate, ...
├── 错误码: E0xxx (正则匹配所有错误码)
├── 概念关键词: ownership, borrow, lifetime, ...
├── 类型关键词: Arc, Rc, Mutex, ...
├── 领域关键词: Web API, HTTP, payment, ...
├── 中文关键词: 所有权, 借用, 异步, ...
└── 问题词: 怎么, 如何, 为什么, how, why, ...
```

### 2. 双技能加载策略

```
问题: "Web API 报错 Send not satisfied"

传统方式 (只加载 L1):
  → 检测 "Send" → 加载 m07-concurrency
  → 输出: "用 Arc"
  → 缺失: Web 领域上下文

强制双加载:
  → 检测 "Web API" → 标记领域 = domain-web
  → 检测 "Send" → 标记机制 = m07-concurrency
  → 同时加载两个 Skills
  → 输出: 符合 Web 最佳实践的方案
```

**Hook 脚本中的实现**:

```
| Keywords in Question | Domain Skill to Load |
|---------------------|---------------------|
| Web API, HTTP, axum | domain-web |
| payment, trading    | domain-fintech |

**CRITICAL**: If domain keywords present, load BOTH L1 and L3 skills.
```

### 3. 输出格式强制

```
不强制输出格式的问题:
  → Claude 可能只输出 "用 Arc"
  → 没有推理过程
  → 用户不知道为什么

强制输出格式:
  → 必须输出 Reasoning Chain
  → 必须引用领域约束
  → 必须展示追溯过程
```

**Hook 脚本中的实现**:

```markdown
## STEP 3: MANDATORY OUTPUT FORMAT

Your response MUST include ALL of these sections:

### Reasoning Chain
+-- Layer 1: [specific error]
|       ^
+-- Layer 3: [domain constraint]
|       v
+-- Layer 2: [design decision]

### Domain Constraints Analysis
- MUST reference specific rules from domain-xxx skill

### Recommended Solution
- Not just fixing the compile error
```

---

## 配置位置

### 插件级 Hook (推荐)

```
rust-skills/
├── hooks/
│   └── hooks.json           ← Hook 触发配置
├── .claude/
│   └── hooks/
│       └── rust-skill-eval-hook.js  ← 强制脚本
└── .claude-plugin/
    └── plugin.json          ← 引用 hooks
```

**plugin.json**:
```json
{
  "name": "rust-skills",
  "skills": "./skills/",
  "hooks": "./hooks/hooks.json"   ← 关键配置
}
```

### 项目级 Hook

```
my-project/
└── .claude/
    ├── hooks/
    │   └── my-hook.sh
    └── settings.json        ← 配置 hooks
```

### 全局 Hook

```
~/.claude/
├── hooks/
│   └── global-hook.sh
└── settings.json            ← 配置 hooks
```

---

## 调试技巧

### 1. 测试关键词匹配

```python
# tests/hook-matcher-test.py
import re

matcher = r"(?i)(rust|cargo|E0\d{3}|ownership|borrow|Send|Sync|Web API|所有权)"

test_cases = [
    "Web API 报错 Rc cannot be sent",
    "E0382 错误怎么解决",
    "所有权问题",
    "how to use async",
]

for case in test_cases:
    if re.search(matcher, case):
        print(f"✓ 匹配: {case}")
    else:
        print(f"✗ 未匹配: {case}")
```

### 2. 查看 Hook 是否触发

在 Claude Code 中，Hook 触发会显示:

```
⏺ <user-prompt-submit-hook>
  [Hook 脚本输出的内容]
```

如果没有看到这个，说明:
- 关键词没匹配
- Hook 配置路径错误
- plugin.json 没有引用 hooks

### 3. 检查 Skill 是否加载

触发后应该看到:

```
⏺ Skill(rust-router)
  ⎿ Successfully loaded skill

⏺ Skill(m07-concurrency)
  ⎿ Successfully loaded skill

⏺ Skill(domain-web)
  ⎿ Successfully loaded skill
```

---

## 常见问题

### Q1: Hook 不触发

**检查清单**:

```
□ hooks/hooks.json 路径正确
□ plugin.json 中有 "hooks": "./hooks/hooks.json"
□ matcher 正则语法正确
□ 关键词覆盖了用户输入
□ 脚本有执行权限 (chmod +x)
```

### Q2: Skill 没有加载

**检查清单**:

```
□ Hook 脚本输出了正确的指令
□ Skill 文件存在于 skills/ 目录
□ SKILL.md 有正确的 name 字段
□ description 格式正确 (CRITICAL: Use for...)
```

### Q3: 输出没有推理链

**检查清单**:

```
□ Hook 脚本明确要求了输出格式
□ 输出格式要求足够具体
□ 提供了正确/错误示例对比
```

---

## 最佳实践总结

### 1. 关键词设计

```
✓ 覆盖所有 Rust 相关概念
✓ 包含错误码正则 (E0\d{3})
✓ 包含中英文关键词
✓ 包含领域关键词
✓ 包含问题词 (怎么, how, why)
```

### 2. 强制脚本设计

```
✓ 领域检测表 (关键词 → 领域 Skill)
✓ 双技能加载要求
✓ 追溯流程说明
✓ 输出格式模板
✓ 正确/错误示例对比
```

### 3. 配置管理

```
✓ 插件级 Hook 放在 hooks/hooks.json
✓ 脚本放在 .claude/hooks/
✓ plugin.json 正确引用
✓ 脚本有执行权限
```

---

## 完整示例

### hooks/hooks.json

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": "(?i)(rust|cargo|rustc|crate|Cargo\\.toml|E0\\d{3}|ownership|borrow|lifetime|move|clone|Send|Sync|async|await|thread|Arc|Rc|Box|RefCell|Mutex|trait|generic|Result|Error|panic|unsafe|FFI|Web API|HTTP|axum|actix|payment|trading|CLI|clap|embedded|no_std|所有权|借用|生命周期|异步|并发|智能指针|怎么|如何|为什么|how to|why)",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/.claude/hooks/rust-skill-eval-hook.js"
          }
        ]
      }
    ]
  }
}
```

### .claude/hooks/rust-skill-eval-hook.js

```bash
#!/bin/bash
cat << 'EOF'

=== MANDATORY: META-COGNITION ROUTING ===

CRITICAL: You MUST follow the COMPLETE meta-cognition framework.
Partial compliance (only loading L1 skill) is NOT acceptable.

## STEP 1: IDENTIFY ENTRY LAYER + DOMAIN

### Layer 3 Domain Detection (MUST load if keywords present):

| Keywords | Domain Skill |
|----------|--------------|
| Web API, HTTP, REST, axum, actix | domain-web |
| payment, trading, fintech, decimal | domain-fintech |
| CLI, clap, terminal | domain-cli |
| embedded, no_std, MCU | domain-embedded |

**CRITICAL**: Load BOTH L1 skill AND L3 domain skill.

## STEP 2: EXECUTE TRACING

L1 Error → Trace UP to L3 → Find constraint → Trace DOWN to L2

## STEP 3: MANDATORY OUTPUT FORMAT

### Reasoning Chain
+-- Layer 1: [error]
|       ^
+-- Layer 3: [domain constraint]
|       v
+-- Layer 2: [design decision]

### Domain Constraints Analysis
[Reference specific rules from domain skill]

### Recommended Solution
[Code following domain best practices]

===================================

EOF
```

### .claude-plugin/plugin.json

```json
{
  "name": "rust-skills",
  "version": "1.0.0",
  "description": "Rust development assistant with meta-cognition",
  "skills": "./skills/",
  "hooks": "./hooks/hooks.json"
}
```

---

## 效果对比

| 维度 | 无 Hook | 有 Hook |
|------|---------|---------|
| Skill 加载 | 不加载 | 强制加载 |
| 领域识别 | 无 | 自动检测 |
| 双技能 | 无 | L1 + L3 |
| 追溯 | 无 | 强制执行 |
| 输出格式 | 随意 | 推理链结构 |
| 回答质量 | 表面修复 | 领域正确方案 |
