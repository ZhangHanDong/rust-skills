#!/bin/bash
# Rust Skills Validation Script
# Run this to validate skills are properly configured

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "======================================"
echo "Rust Skills Validation"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

pass() {
    echo -e "${GREEN}✓${NC} $1"
}

fail() {
    echo -e "${RED}✗${NC} $1"
    FAILED=1
}

warn() {
    echo -e "${YELLOW}!${NC} $1"
}

FAILED=0

# =====================================
# Directory Structure Check
# =====================================
echo "Checking directory structure..."

dirs=(
    "skills/m01-ownership"
    "skills/m06-error-handling"
    "skills/m07-concurrency"
    "skills/m10-performance"
    "skills/m14-mental-model"
    "skills/m15-anti-pattern"
    "skills/unsafe-checker"
    "skills/coding-guidelines"
    "skills/rust-router"
    "skills/rust-learner"
    "agents"
    "commands"
    "cache"
    "tests"
)

for dir in "${dirs[@]}"; do
    if [ -d "$ROOT_DIR/$dir" ]; then
        pass "$dir exists"
    else
        fail "$dir missing"
    fi
done

echo ""

# =====================================
# SKILL.md Files Check
# =====================================
echo "Checking SKILL.md files..."

skill_count=0

while IFS= read -r -d '' skill_file; do
    skill_count=$((skill_count + 1))
    relative_file="${skill_file#"$ROOT_DIR"/}"

    if grep -q "^name:" "$skill_file" && grep -q "^description:" "$skill_file"; then
        pass "$relative_file valid"
    else
        fail "$relative_file missing required frontmatter"
    fi
done < <(find "$ROOT_DIR/skills" -name "SKILL.md" -type f -print0)

if [ "$skill_count" -eq 0 ]; then
    fail "No SKILL.md files found under skills/"
fi

echo ""

# =====================================
# Agent Files Check
# =====================================
echo "Checking agent files..."

agent_files=(
    "agents/crate-researcher.md"
    "agents/rust-changelog.md"
    "agents/docs-researcher.md"
    "agents/clippy-researcher.md"
)

for file in "${agent_files[@]}"; do
    if [ -f "$ROOT_DIR/$file" ]; then
        if grep -q "^tools:" "$ROOT_DIR/$file"; then
            pass "$file valid"
        else
            fail "$file missing tools section"
        fi
    else
        fail "$file missing"
    fi
done

echo ""

# =====================================
# Command Files Check
# =====================================
echo "Checking command files..."

command_files=(
    "commands/guideline.md"
    "commands/unsafe-check.md"
    "commands/unsafe-review.md"
)

for file in "${command_files[@]}"; do
    if [ -f "$ROOT_DIR/$file" ]; then
        pass "$file exists"
    else
        fail "$file missing"
    fi
done

echo ""

# =====================================
# Unsafe-Checker Rules Check
# =====================================
echo "Checking unsafe-checker rules..."

rule_count=$(find "$ROOT_DIR/skills/unsafe-checker/rules" -name "*.md" ! -name "_*" 2>/dev/null | wc -l)
if [ "$rule_count" -ge 40 ]; then
    pass "unsafe-checker has $rule_count rules (expected 40+)"
else
    warn "unsafe-checker has $rule_count rules (expected 40+)"
fi

# Check checklists
if [ -d "$ROOT_DIR/skills/unsafe-checker/checklists" ]; then
    checklist_count=$(find "$ROOT_DIR/skills/unsafe-checker/checklists" -name "*.md" | wc -l)
    if [ "$checklist_count" -ge 2 ]; then
        pass "unsafe-checker has $checklist_count checklists"
    else
        warn "unsafe-checker has few checklists"
    fi
else
    fail "unsafe-checker checklists missing"
fi

echo ""

# =====================================
# Deep Dive Content Check
# =====================================
echo "Checking deep dive content..."

deep_content=(
    "skills/m01-ownership/patterns/common-errors.md"
    "skills/m01-ownership/patterns/lifetime-patterns.md"
    "skills/m01-ownership/comparison.md"
    "skills/m07-concurrency/patterns/common-errors.md"
    "skills/m07-concurrency/patterns/async-patterns.md"
    "skills/m10-performance/patterns/optimization-guide.md"
    "skills/m14-mental-model/patterns/thinking-in-rust.md"
    "skills/m15-anti-pattern/patterns/common-mistakes.md"
)

for file in "${deep_content[@]}"; do
    if [ -f "$ROOT_DIR/$file" ]; then
        pass "$file exists"
    else
        warn "$file missing (deep dive content)"
    fi
done

echo ""

# =====================================
# Cache Structure Check
# =====================================
echo "Checking cache structure..."

if [ -f "$ROOT_DIR/cache/config.yaml" ]; then
    pass "cache/config.yaml exists"
else
    warn "cache/config.yaml missing"
fi

cache_dirs=("crates" "rust-versions" "clippy-lints" "docs")
for dir in "${cache_dirs[@]}"; do
    if [ -d "$ROOT_DIR/cache/$dir" ]; then
        pass "cache/$dir exists"
    else
        warn "cache/$dir missing"
    fi
done

echo ""

# =====================================
# Summary
# =====================================
echo "======================================"
if [ "$FAILED" -eq 0 ]; then
    echo -e "${GREEN}All checks passed!${NC}"
else
    echo -e "${RED}Some checks failed.${NC}"
fi
echo "======================================"

exit $FAILED
