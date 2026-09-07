#!/usr/bin/env bash
# Analyze rust-skills structure and content
# Provides statistics and insights

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "======================================"
echo "Rust Skills Analysis"
echo "======================================"
echo ""

# =====================================
# Skill Statistics
# =====================================
echo "## Skill Statistics"
echo ""

meta_count=$(find "$ROOT_DIR/skills" -maxdepth 1 -type d -name "m[0-9]*" | wc -l | tr -d ' ')
echo "Meta-Question Skills: $meta_count"

core_count=$(find "$ROOT_DIR/skills/core" -maxdepth 1 -type d 2>/dev/null | wc -l | tr -d ' ')
echo "Core Skills: $((core_count - 1))"

domain_count=$(find "$ROOT_DIR/skills/domains" -maxdepth 1 -type d 2>/dev/null | wc -l | tr -d ' ')
echo "Domain Skills: $((domain_count - 1))"

echo ""

# =====================================
# Content Statistics
# =====================================
echo "## Content Statistics"
echo ""

# Count markdown files
md_count=$(find "$ROOT_DIR" -name "*.md" -type f | wc -l | tr -d ' ')
echo "Total Markdown Files: $md_count"

# Count lines of content
total_lines=$(find "$ROOT_DIR" -name "*.md" -type f -exec wc -l {} + | tail -1 | awk '{print $1}')
echo "Total Lines of Content: $total_lines"

# Unsafe rules
unsafe_rules=$(find "$ROOT_DIR/skills/unsafe-checker/rules" -name "*.md" ! -name "_*" 2>/dev/null | wc -l | tr -d ' ')
echo "Unsafe Checker Rules: $unsafe_rules"

# Templates
template_count=$(find "$ROOT_DIR/templates" -name "*.rs" -type f 2>/dev/null | wc -l | tr -d ' ')
echo "Code Templates: $template_count"

echo ""

# =====================================
# Agent Statistics
# =====================================
echo "## Agent Statistics"
echo ""

agent_count=$(find "$ROOT_DIR/agents" -name "*.md" -type f | wc -l | tr -d ' ')
echo "Total Agents: $agent_count"

echo "Agents:"
for agent in "$ROOT_DIR"/agents/*.md; do
    name=$(basename "$agent" .md)
    model=$(grep "^model:" "$agent" | cut -d: -f2 | tr -d ' ')
    echo "  - $name (${model:-default})"
done

echo ""

# =====================================
# Deep Dive Content
# =====================================
echo "## Deep Dive Content"
echo ""

echo "Skills with patterns/ directory:"
for skill_dir in "$ROOT_DIR"/skills/m*/; do
    if [ -d "$skill_dir/patterns" ]; then
        skill_name=$(basename "$skill_dir")
        pattern_count=$(find "$skill_dir/patterns" -name "*.md" | wc -l | tr -d ' ')
        echo "  - $skill_name: $pattern_count files"
    fi
done

echo ""
echo "Skills with examples/ directory:"
for skill_dir in "$ROOT_DIR"/skills/m*/; do
    if [ -d "$skill_dir/examples" ]; then
        skill_name=$(basename "$skill_dir")
        example_count=$(find "$skill_dir/examples" -name "*.md" | wc -l | tr -d ' ')
        echo "  - $skill_name: $example_count files"
    fi
done

echo ""

# =====================================
# Trigger Coverage
# =====================================
echo "## Trigger Coverage Analysis"
echo ""

# Count unique keywords in descriptions
echo "Extracting trigger keywords..."
keywords=""
for skill_file in $(find "$ROOT_DIR/skills" -name "SKILL.md" -type f); do
    desc=$(sed -n '/^description:/,/^[a-z]*:/p' "$skill_file")
    keywords="$keywords $desc"
done

# Count common keywords
echo "Top trigger categories:"
echo "  - Error codes (E0xxx): $(echo "$keywords" | grep -oE 'E[0-9]{4}' | sort -u | wc -l | tr -d ' ') unique"
echo "  - Chinese triggers: $(echo "$keywords" | grep -oE '[\x{4e00}-\x{9fff}]+' | sort -u | wc -l | tr -d ' ') phrases"
echo "  - Crate names: Multiple (tokio, serde, axum, etc.)"

echo ""

# =====================================
# Test Coverage
# =====================================
echo "## Test Coverage"
echo ""

if [ -d "$ROOT_DIR/tests/scenarios" ]; then
    scenario_count=$(find "$ROOT_DIR/tests/scenarios" -name "*.md" -type f | wc -l | tr -d ' ')
    echo "Test Scenario Files: $scenario_count"

    total_tests=0
    for scenario in "$ROOT_DIR"/tests/scenarios/*.md; do
        test_count=$(grep -c "^### Test" "$scenario" 2>/dev/null || echo "0")
        total_tests=$((total_tests + test_count))
    done
    echo "Total Test Cases: $total_tests"
else
    echo "No test scenarios found"
fi

echo ""

# =====================================
# Cache Status
# =====================================
echo "## Cache Status"
echo ""

if [ -d "$ROOT_DIR/cache" ]; then
    echo "Cache directories:"
    for cache_dir in "$ROOT_DIR"/cache/*/; do
        if [ -d "$cache_dir" ]; then
            dir_name=$(basename "$cache_dir")
            file_count=$(find "$cache_dir" -type f 2>/dev/null | wc -l | tr -d ' ')
            echo "  - $dir_name: $file_count entries"
        fi
    done
else
    echo "Cache not initialized"
fi

echo ""

# =====================================
# Summary
# =====================================
echo "======================================"
echo "Summary"
echo "======================================"
echo ""
echo "Total Skills: $((meta_count + core_count - 1 + domain_count - 1 + 2))"
echo "Total Agents: $agent_count"
echo "Total Content: $md_count files, $total_lines lines"
echo ""
