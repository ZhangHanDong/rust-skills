#!/usr/bin/env bash
# Generate index files for rust-skills
# Run this to rebuild indexes after making changes

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
INDEX_DIR="$ROOT_DIR/index"

mkdir -p "$INDEX_DIR"

echo "Generating rust-skills indexes..."

# =====================================
# Generate skills-index.md
# =====================================
cat > "$INDEX_DIR/skills-index.md" << 'EOF'
# Skills Index

Auto-generated index of all rust-skills.

## Meta-Question Skills (m01-m15)

| ID | Name | Core Question |
|----|------|---------------|
EOF

for skill_dir in "$ROOT_DIR"/skills/m[0-9]*/; do
    if [ -f "$skill_dir/SKILL.md" ]; then
        skill_name=$(basename "$skill_dir")
        # Extract title from SKILL.md
        title=$(grep "^# " "$skill_dir/SKILL.md" | head -1 | sed 's/^# //')
        # Extract core question
        core_q=$(grep "Core Question:" "$skill_dir/SKILL.md" | head -1 | sed 's/Core Question: "//' | sed 's/"$//')
        echo "| $skill_name | $title | $core_q |" >> "$INDEX_DIR/skills-index.md"
    fi
done

cat >> "$INDEX_DIR/skills-index.md" << 'EOF'

## Core Skills

| Name | Description |
|------|-------------|
EOF

for skill_dir in "$ROOT_DIR"/skills/core-*/; do
    if [ -f "$skill_dir/SKILL.md" ]; then
        skill_name=$(basename "$skill_dir")
        desc=$(sed -n '/^description:/,/^[a-z]*:/p' "$skill_dir/SKILL.md" | head -2 | tail -1 | sed 's/^  //')
        echo "| $skill_name | ${desc:0:60}... |" >> "$INDEX_DIR/skills-index.md"
    fi
done

cat >> "$INDEX_DIR/skills-index.md" << 'EOF'

## Specialized Skills

| Name | Description |
|------|-------------|
EOF

for skill_name in "unsafe-checker" "coding-guidelines"; do
    skill_dir="$ROOT_DIR/skills/$skill_name"
    if [ -f "$skill_dir/SKILL.md" ]; then
        desc=$(sed -n '/^description:/,/^[a-z]*:/p' "$skill_dir/SKILL.md" | head -2 | tail -1 | sed 's/^  //')
        echo "| $skill_name | ${desc:0:60}... |" >> "$INDEX_DIR/skills-index.md"
    fi
done

cat >> "$INDEX_DIR/skills-index.md" << 'EOF'

## Domain Skills

| Name | Focus Area |
|------|------------|
EOF

for skill_dir in "$ROOT_DIR"/skills/domain-*/; do
    if [ -f "$skill_dir/SKILL.md" ]; then
        skill_name=$(basename "$skill_dir")
        title=$(grep "^# " "$skill_dir/SKILL.md" | head -1 | sed 's/^# //')
        echo "| $skill_name | $title |" >> "$INDEX_DIR/skills-index.md"
    fi
done

echo "Generated: index/skills-index.md"

# =====================================
# Generate agents-index.md
# =====================================
cat > "$INDEX_DIR/agents-index.md" << 'EOF'
# Agents Index

Auto-generated index of all agents.

| Agent | Model | Tools | Purpose |
|-------|-------|-------|---------|
EOF

for agent_file in "$ROOT_DIR"/agents/*.md; do
    agent_name=$(basename "$agent_file" .md)
    model=$(grep "^model:" "$agent_file" | cut -d: -f2 | tr -d ' ')
    tools=$(sed -n '/^tools:/,/^[a-z]*:/p' "$agent_file" | grep "^  -" | wc -l | tr -d ' ')
    # Get first line of description
    desc=$(grep "^#" "$agent_file" | head -2 | tail -1 | sed 's/^# *//')
    if [ -z "$desc" ]; then
        desc="Background agent"
    fi
    echo "| $agent_name | ${model:-haiku} | $tools | ${desc:0:40} |" >> "$INDEX_DIR/agents-index.md"
done

echo "Generated: index/agents-index.md"

# =====================================
# Generate triggers-index.md
# =====================================
cat > "$INDEX_DIR/triggers-index.md" << 'EOF'
# Trigger Keywords Index

Keywords that trigger each skill.

EOF

for skill_dir in "$ROOT_DIR"/skills/m[0-9]*/; do
    if [ -f "$skill_dir/SKILL.md" ]; then
        skill_name=$(basename "$skill_dir")
        echo "## $skill_name" >> "$INDEX_DIR/triggers-index.md"
        echo "" >> "$INDEX_DIR/triggers-index.md"
        # Extract keywords from description
        sed -n '/^description:/,/^[a-z]*:/p' "$skill_dir/SKILL.md" | grep -v "^description:" | grep -v "^[a-z]*:" | head -5 >> "$INDEX_DIR/triggers-index.md"
        echo "" >> "$INDEX_DIR/triggers-index.md"
    fi
done

echo "Generated: index/triggers-index.md"

# =====================================
# Generate commands-index.md
# =====================================
cat > "$INDEX_DIR/commands-index.md" << 'EOF'
# Commands Index

Available slash commands.

| Command | Usage | Description |
|---------|-------|-------------|
EOF

for cmd_file in "$ROOT_DIR"/commands/*.md; do
    cmd_name=$(basename "$cmd_file" .md)
    # Extract usage from file
    usage=$(grep -A1 "^## Usage" "$cmd_file" | tail -1 | sed 's/```//' | tr -d '\n')
    # Extract description
    desc=$(grep "^[A-Z]" "$cmd_file" | head -1)
    echo "| /$cmd_name | \`$usage\` | ${desc:0:40}... |" >> "$INDEX_DIR/commands-index.md"
done

echo "Generated: index/commands-index.md"

# =====================================
# Summary
# =====================================
echo ""
echo "Index generation complete!"
echo "Generated files:"
ls -la "$INDEX_DIR"/*.md
