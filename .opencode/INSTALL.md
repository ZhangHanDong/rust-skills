# Rust Skills for OpenCode

> OpenCode integration for rust-skills

## Installation

Rust Skills provides 38+ individual skills (located in `skills/*/SKILL.md`) that OpenCode loads on-demand. This is different from instructions - skills are loaded only when needed, saving context tokens.

### Method 1: Direct Clone (Recommended)

Clone the repository directly into a skills directory for automatic updates via `git pull`:

#### Option A: Agent-Compatible Location (Highest Compatibility) ⭐

Works with OpenCode, Claude Code, and other AI coding agents:

```bash
# Create directory if it doesn't exist
mkdir -p ~/.agents/skills

# Clone directly
cd ~/.agents/skills
git clone https://github.com/ZhangHanDong/rust-skills.git
```

This creates: `~/.agents/skills/rust-skills/skills/*/SKILL.md`

OpenCode will discover all 38 skills automatically.

#### Option B: Claude-Compatible Location

For Claude Code compatibility:

```bash
mkdir -p ~/.claude/skills
cd ~/.claude/skills
git clone https://github.com/ZhangHanDong/rust-skills.git
```

#### Option C: OpenCode-Specific Location

OpenCode-only installation:

```bash
mkdir -p ~/.config/opencode/skills
cd ~/.config/opencode/skills
git clone https://github.com/ZhangHanDong/rust-skills.git
```

### Method 2: Copy Skills (Flat Structure)

Copy individual skills to the same directory level (no intermediate `rust-skills` folder):

#### Global Installation

```bash
# Clone the repository
git clone https://github.com/ZhangHanDong/rust-skills.git ~/rust-skills

# Copy to agent-compatible location (recommended)
mkdir -p ~/.agents/skills
cp -r ~/rust-skills/skills/* ~/.agents/skills/

# OR copy to Claude-compatible location
mkdir -p ~/.claude/skills
cp -r ~/rust-skills/skills/* ~/.claude/skills/

# OR copy to OpenCode-specific location
mkdir -p ~/.config/opencode/skills
cp -r ~/rust-skills/skills/* ~/.config/opencode/skills/
```

#### Project-Level Installation

```bash
# From your Rust project root
git clone https://github.com/ZhangHanDong/rust-skills.git

# Copy to project directory
mkdir -p .agents/skills
cp -r rust-skills/skills/* .agents/skills/

# OR use .opencode/skills/
mkdir -p .opencode/skills
cp -r rust-skills/skills/* .opencode/skills/
```

by opencode doc
https://opencode.ai/docs/skills/
all the paths below is valid
    Project config: .opencode/skills//SKILL.md
    Global config: ~/.config/opencode/skills//SKILL.md
    Project Claude-compatible: .claude/skills//SKILL.md
    Global Claude-compatible: ~/.claude/skills//SKILL.md
    Project agent-compatible: .agents/skills//SKILL.md
    Global agent-compatible: ~/.agents/skills//SKILL.md



## Verification

After installation, verify that skills are discoverable:

```bash
# Start OpenCode in a Rust project
cd /path/to/rust/project
opencode

# In OpenCode, check available skills
/skills
```

You should see rust-skills in the list, including:
- `rust-router` - Master router for Rust questions
- `rust-learner` - Fetch Rust/crate version info
- `m01-ownership` through `m15-anti-pattern` - Meta-question skills
- `domain-*` - Domain-specific skills (fintech, ml, web, etc.)
- And many more...

### Testing a Skill

Try asking a Rust question:

```
How do I fix E0382 in Rust?
```

OpenCode should automatically discover and load the appropriate skill (likely `rust-router` which will then route to `m01-ownership`).

You can also explicitly load a skill:

```
/skill rust-router
```

## Troubleshooting

### Skills not showing up?

1. **Verify the path exists:**
2. **Check skill structure:**
3. **Verify SKILL.md format:**
4. **Verify SKILL.md are all capitalized**
5. **Restart OpenCode** after installation

### Skills not loading automatically?

OpenCode loads skills on-demand when it detects relevant context. You can explicitly load a skill:

```
/skill rust-router
```

Or ask a question that triggers skill loading:

```
How do I handle E0382?
```

## Configuration Reference

### Config Location

| Config File | Scope |
|-------------|-------|
| `~/.config/opencode/opencode.json` | Global (all projects) |
| `.opencode/opencode.json` | Project-specific |


## Updating Skills

```bash
cd ~/.agents/skills/rust-skills
git pull
```
## Uninstallation

```bash
rm -rf ~/.agents/skills/rust-skills
```

## Why ~/.agents/skills/ is Recommended

1. **Highest Compatibility**: Works with OpenCode, Claude Code, and other AI coding agents
2. **Industry Standard**: `.agents/` is becoming the cross-agent standard directory
3. **No Vendor Lock-in**: Switch between different AI coding tools without reinstalling
4. **Future-Proof**: New agents are likely to support `.agents/` directory

## Limitations

OpenCode integration provides instruction-based guidance only. Features requiring Claude Code's specific capabilities are not available:

| Feature | OpenCode | Claude Code |
|---------|----------|-------------|
| Basic Rust guidance | ✅ | ✅ |
| Error code explanations | ✅ | ✅ |
| Coding guidelines | ✅ | ✅ |
| Auto-triggering hooks | ❌ | ✅ |
| Background agents | ❌ | ✅ |
| Dynamic skill loading | ❌ | ✅ |

## Links

- [OpenCode Documentation](https://opencode.ai/docs/)
- [OpenCode Skills Guide](https://opencode.ai/docs/skills/)
- [OpenCode Config Reference](https://opencode.ai/docs/config/)
- [Rust Skills GitHub](https://github.com/ZhangHanDong/rust-skills)
- [Rust Skills Architecture](https://github.com/ZhangHanDong/rust-skills/blob/main/docs/architecture-zh.md)
