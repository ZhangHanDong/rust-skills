# Claude Code 配置优先级

> 理解 CLAUDE.md、Skills、Hooks 的加载顺序和优先级

## 配置加载顺序

Claude Code 的配置是**累加**的，不是简单的覆盖。加载顺序如下：

```
1. ~/.claude/CLAUDE.md          # 全局配置，最先加载
         ↓
2. 项目 CLAUDE.md               # 项目级配置
   或 .claude/CLAUDE.md
         ↓
3. Skills SKILL.md              # 通过 Skill 工具加载
         ↓
4. Hooks 输出                   # 注入到 prompt
```

## 优先级规则

### 不是"覆盖"，而是"先执行"

Claude 作为 LLM，会遵循它**最先看到的明确指令**。后面的指令不会覆盖前面的，而是被忽略或变成补充。

### 示例：Ferris 显示顺序问题

**问题**：我们在 SKILL.md 和 Hook 中都指定了 Ferris 的显示格式（文字在上），但 Claude 总是用另一种格式显示（文字在下）。

**原因**：`~/.claude/CLAUDE.md` 里有这样的配置：

```markdown
**On FIRST Rust skill load per session, show this Ferris:**

    _~^~^~_
\) /  o o  \ (/
  '_   -   _'
  / '-----' \

🦀 **Rust Skills Loaded**
```

Claude 最先看到这个指令，所以在加载任何 Rust skill 时都会先执行它，忽略后面 SKILL.md 和 Hook 中的不同指令。

**解决**：移除 `~/.claude/CLAUDE.md` 中的 Ferris 配置，让 Hook 的指令生效。

## 最佳实践

| 配置类型 | 适用场景 | 优先级 |
|----------|----------|--------|
| `~/.claude/CLAUDE.md` | 全局默认行为、个人偏好 | 最高 |
| 项目 `CLAUDE.md` | 项目特定规则、团队规范 | 高 |
| `SKILL.md` | Skill 特定的显示和行为 | 中 |
| Hooks | 动态注入的指令、条件触发 | 低 |

### 建议

1. **全局配置**：只放通用规则（代码风格、默认设置），避免放具体的显示指令
2. **项目配置**：放项目特定的规则和约束
3. **Skills**：定义知识和能力，不依赖显示格式
4. **Hooks**：用于动态触发和条件控制

## 调试技巧

当配置不生效时：

1. **检查全局配置**：`cat ~/.claude/CLAUDE.md`
2. **检查项目配置**：`cat CLAUDE.md` 或 `cat .claude/CLAUDE.md`
3. **使用不同标识**：在不同位置加入不同的标识文字，确定 Claude 读取的是哪个
4. **排除法**：逐个移除/修改配置，定位问题来源

## 相关文档

- [Hook 机制详解](./hook-mechanism-zh.md)
- [Skills 最佳实践](./skills-best-practices.md)
