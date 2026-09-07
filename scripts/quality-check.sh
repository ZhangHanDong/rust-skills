#!/usr/bin/env bash
# Quality check script for rust-skills
# Run before releases to ensure consistency

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "======================================"
echo "Rust Skills Quality Check"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

ERRORS=0
WARNINGS=0

error() {
    echo -e "${RED}ERROR:${NC} $1"
    ((ERRORS++))
}

warn() {
    echo -e "${YELLOW}WARN:${NC} $1"
    ((WARNINGS++))
}

pass() {
    echo -e "${GREEN}OK:${NC} $1"
}

# =====================================
# 1. Check SKILL.md Frontmatter
# =====================================
echo "Checking SKILL.md frontmatter..."

for skill_file in $(find "$ROOT_DIR/skills" -name "SKILL.md" -type f); do
    skill_name=$(dirname "$skill_file" | xargs basename)

    # Check for required fields
    if ! grep -q "^name:" "$skill_file"; then
        error "$skill_name/SKILL.md missing 'name:' field"
    fi

    if ! grep -q "^description:" "$skill_file"; then
        error "$skill_name/SKILL.md missing 'description:' field"
    fi

    # Check description has trigger words
    desc_lines=$(sed -n '/^description:/,/^[a-z]*:/p' "$skill_file" | head -20)
    if [ ${#desc_lines} -lt 50 ]; then
        warn "$skill_name/SKILL.md description may be too short for triggering"
    fi
done

echo ""

# =====================================
# 2. Check Agent Tool Declarations
# =====================================
echo "Checking agent tool declarations..."

for agent_file in "$ROOT_DIR"/agents/*.md; do
    agent_name=$(basename "$agent_file" .md)

    if ! grep -q "^tools:" "$agent_file"; then
        error "$agent_name agent missing 'tools:' declaration"
    fi

    if ! grep -q "^model:" "$agent_file"; then
        warn "$agent_name agent missing 'model:' declaration"
    fi
done

echo ""

# =====================================
# 3. Check for Dead Links in Skills
# =====================================
echo "Checking for dead internal links..."

for md_file in $(find "$ROOT_DIR/skills" -name "*.md" -type f); do
    # Extract markdown links
    links=$(grep -oE '\[.*\]\(([^)]+)\)' "$md_file" 2>/dev/null | grep -oE '\(([^)]+)\)' | tr -d '()' || true)

    for link in $links; do
        # Skip external links and anchors
        if [[ "$link" == http* ]] || [[ "$link" == \#* ]]; then
            continue
        fi

        # Resolve relative path
        dir=$(dirname "$md_file")
        full_path="$dir/$link"

        if [ ! -f "$full_path" ]; then
            warn "Dead link in $(basename "$md_file"): $link"
        fi
    done
done

echo ""

# =====================================
# 4. Check Version Consistency
# =====================================
echo "Checking version consistency..."

version_file="$ROOT_DIR/VERSION"
metadata_file="$ROOT_DIR/metadata.json"

if [ -f "$version_file" ] && [ -f "$metadata_file" ]; then
    version=$(cat "$version_file" | tr -d '[:space:]')
    metadata_version=$(grep '"version"' "$metadata_file" | head -1 | cut -d'"' -f4)

    if [ "$version" != "$metadata_version" ]; then
        error "Version mismatch: VERSION=$version, metadata.json=$metadata_version"
    else
        pass "Version consistent: $version"
    fi
else
    warn "Missing VERSION or metadata.json"
fi

echo ""

# =====================================
# 5. Check Required Directories
# =====================================
echo "Checking required directories..."

required_dirs=(
    "skills"
    "agents"
    "commands"
    "cache"
    "tests"
    "templates"
)

for dir in "${required_dirs[@]}"; do
    if [ -d "$ROOT_DIR/$dir" ]; then
        count=$(find "$ROOT_DIR/$dir" -type f | wc -l)
        pass "$dir/ exists ($count files)"
    else
        error "$dir/ missing"
    fi
done

echo ""

# =====================================
# 6. Check Skill Count Matches Metadata
# =====================================
echo "Checking skill counts..."

if [ -f "$metadata_file" ]; then
    expected_meta=$(grep '"meta_skills"' "$metadata_file" | grep -oE '[0-9]+')
    actual_meta=$(find "$ROOT_DIR/skills" -maxdepth 1 -type d -name "m[0-9]*" | wc -l | tr -d '[:space:]')

    if [ "$expected_meta" = "$actual_meta" ]; then
        pass "Meta skills count: $actual_meta"
    else
        warn "Meta skills: expected $expected_meta, found $actual_meta"
    fi

    expected_unsafe=$(grep '"unsafe_rules"' "$metadata_file" | grep -oE '[0-9]+')
    actual_unsafe=$(find "$ROOT_DIR/skills/unsafe-checker/rules" -name "*.md" ! -name "_*" 2>/dev/null | wc -l | tr -d '[:space:]')

    if [ "$expected_unsafe" = "$actual_unsafe" ]; then
        pass "Unsafe rules count: $actual_unsafe"
    else
        warn "Unsafe rules: expected $expected_unsafe, found $actual_unsafe"
    fi
fi

echo ""

# =====================================
# Summary
# =====================================
echo "======================================"
echo "Quality Check Summary"
echo "======================================"
echo -e "Errors:   ${RED}$ERRORS${NC}"
echo -e "Warnings: ${YELLOW}$WARNINGS${NC}"
echo ""

if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}Quality check FAILED${NC}"
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}Quality check PASSED with warnings${NC}"
    exit 0
else
    echo -e "${GREEN}Quality check PASSED${NC}"
    exit 0
fi
