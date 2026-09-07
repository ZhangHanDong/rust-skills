# Skill 继承机制

> Claude Code Skills 没有原生继承，但可以通过多种方法实现类似效果

## 问题背景

Claude Code 的 Skills 是独立的：
- 每个 skill 根据 `description` 关键词独立触发
- 不会自动加载"父" skill
- 共享规则需要重复写在每个 skill 中

## 解决方案对比

| 方案 | 可移植性 | 维护成本 | 适用场景 |
|------|----------|----------|----------|
| A: 符号链接 + 显式读取 | 低 | 低 | 本地个人 skills |
| B: Hook 注入 | 高 | 低 | 分发的 plugin |
| C: 全局 CLAUDE.md | 高 | 低 | 通用规则 |
| D: 复制内联 | 高 | 高 | 简单场景 |

---

## 方案 A: 符号链接 + 显式读取

**适用**: 本地个人 skills（`~/.claude/skills/`）

### 目录结构

```
~/.claude/skills/
├── _shared/                          # 共享文件目录
│   ├── rust-defaults.md              # Rust 通用规则
│   └── python-defaults.md            # Python 通用规则
│
├── tokio/
│   ├── SKILL.md
│   └── references/
│       └── rust-defaults.md → ../../_shared/rust-defaults.md
│
├── tokio-task/
│   ├── SKILL.md
│   └── references/
│       └── rust-defaults.md → ../../_shared/rust-defaults.md
│
└── serde/
    ├── SKILL.md
    └── references/
        └── rust-defaults.md → ../../_shared/rust-defaults.md
```

### 设置步骤

```bash
# 1. 创建共享目录
mkdir -p ~/.claude/skills/_shared

# 2. 创建共享规则文件
cat > ~/.claude/skills/_shared/rust-defaults.md << 'EOF'
# Rust Code Generation Defaults

## Cargo.toml
- edition = "2024" (NOT 2021)
- Use latest stable crate versions

## Code Style
- Prefer explicit error handling over .unwrap()
- Use anyhow/thiserror for errors
EOF

# 3. 为每个 skill 创建符号链接
for skill in tokio tokio-task tokio-sync serde axum; do
    mkdir -p ~/.claude/skills/$skill/references
    ln -sf ../../_shared/rust-defaults.md ~/.claude/skills/$skill/references/rust-defaults.md
done
```

### SKILL.md 中引用

```markdown
## Code Generation Rules

**IMPORTANT: Before generating code, read `./references/rust-defaults.md`**

Key rules (see rust-defaults.md for full list):
- Use edition = "2024"
- Use latest crate versions
```

### 优缺点

| 优点 | 缺点 |
|------|------|
| 修改一处，全部生效 | 符号链接不可移植 |
| 清晰的文件组织 | 分发给他人会断链 |
| 支持多个共享文件 | 需要初始设置 |

---

## 方案 B: Hook 注入

**适用**: 分发的 plugin（如 rust-skills）

### 原理

通过 `UserPromptSubmit` hook 在用户输入时注入共享规则：

```
用户输入 → Hook 触发 → 注入规则 → Claude 处理
```

### 目录结构

```
my-plugin/
├── .claude/
│   ├── settings.json           # Hook 配置
│   └── hooks/
│       └── inject-rules.sh     # 规则注入脚本
└── skills/
    └── ...                     # 不需要符号链接
```

### 配置文件

**.claude/settings.json**:
```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": "(?i)(rust|cargo|tokio|async|await)",
        "command": ".claude/hooks/inject-rules.sh"
      }
    ]
  }
}
```

**.claude/hooks/inject-rules.sh**:
```bash
#!/usr/bin/env bash
cat << 'EOF'

=== CODE GENERATION RULES ===

When generating Rust code:
- Use edition = "2024" in Cargo.toml
- Use latest stable crate versions
- Prefer explicit error handling

===

EOF
```

### 优缺点

| 优点 | 缺点 |
|------|------|
| 完全可移植 | 每次请求都注入（增加 token） |
| 不依赖文件结构 | 需要 hook 支持 |
| 用户安装即生效 | 规则在脚本中，不易编辑 |

---

## 方案 C: 全局 CLAUDE.md

**适用**: 所有项目通用的规则

### 文件位置

```
~/.claude/CLAUDE.md    # 全局，所有会话生效
```

### 示例内容

```markdown
# Global Claude Code Rules

## Rust Defaults
- Use edition = "2024"
- Use latest crate versions

## Python Defaults
- Use Python 3.12+
- Use type hints
```

### 优缺点

| 优点 | 缺点 |
|------|------|
| 最简单 | 所有项目都应用（可能过于宽泛） |
| 一处配置 | 不能按领域区分 |
| 总是生效 | 可能与项目规则冲突 |

---

## 方案 D: 复制内联

**适用**: 简单场景，少量 skills

### 做法

直接在每个 SKILL.md 中复制相同的规则：

```markdown
# tokio/SKILL.md

## Code Generation Rules
- Use edition = "2024"
- Use latest crate versions

# tokio-task/SKILL.md

## Code Generation Rules
- Use edition = "2024"        # 重复
- Use latest crate versions   # 重复
```

### 优缺点

| 优点 | 缺点 |
|------|------|
| 最可移植 | 规则重复，难维护 |
| 无依赖 | 更新需改多处 |
| 简单直接 | 容易不一致 |

---

## 推荐组合

```
┌─────────────────────────────────────────────────────────┐
│                    使用场景决策树                        │
└─────────────────────────────────────────────────────────┘

是个人使用还是分发？
    │
    ├── 个人使用 → 符号链接 + 显式读取 (方案 A)
    │              └── 方便维护，修改一处全部生效
    │
    └── 分发给他人 → 是 plugin 还是独立 skill？
                      │
                      ├── Plugin → Hook 注入 (方案 B)
                      │            └── 可移植，用户安装即生效
                      │
                      └── 独立 skill → 复制内联 (方案 D)
                                       └── 简单，无依赖
```

---

## 实际案例

### 案例 1: 个人 tokio skills 系列

```bash
# 使用方案 A
~/.claude/skills/
├── _shared/rust-defaults.md
├── tokio/references/rust-defaults.md → ...
├── tokio-task/references/rust-defaults.md → ...
└── tokio-sync/references/rust-defaults.md → ...
```

### 案例 2: rust-skills 插件

```bash
# 使用方案 B
rust-skills/
├── .claude/hooks/rust-skill-eval-hook.sh  # 注入 edition 2024 等规则
└── skills/m01-ownership/SKILL.md          # 不需要符号链接
```

### 案例 3: 通用代码风格

```bash
# 使用方案 C
~/.claude/CLAUDE.md  # 写入通用规则，所有项目生效
```

---

## 自动化脚本

### 批量创建符号链接

```bash
#!/usr/bin/env bash
# setup-skill-inheritance.sh

SHARED_DIR="$HOME/.claude/skills/_shared"
SHARED_FILE="rust-defaults.md"

# 创建共享目录
mkdir -p "$SHARED_DIR"

# 为指定 skills 创建符号链接
for skill in "$@"; do
    skill_dir="$HOME/.claude/skills/$skill"
    if [ -d "$skill_dir" ]; then
        mkdir -p "$skill_dir/references"
        ln -sf "../../_shared/$SHARED_FILE" "$skill_dir/references/$SHARED_FILE"
        echo "✓ $skill"
    else
        echo "✗ $skill (not found)"
    fi
done
```

使用：
```bash
./setup-skill-inheritance.sh tokio tokio-task tokio-sync serde axum
```

---

## 总结

| 你的情况 | 推荐方案 |
|----------|----------|
| 个人本地 skills | **符号链接** (方案 A) |
| 分发 plugin | **Hook 注入** (方案 B) |
| 通用全局规则 | **全局 CLAUDE.md** (方案 C) |
| 简单独立 skill | **复制内联** (方案 D) |
