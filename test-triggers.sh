#!/bin/bash
# Rust Skills Trigger Test Script
# Tests if the Forced Eval Hook is working
#
# Usage:
#   ./test-triggers.sh              # Run all tests
#   ./test-triggers.sh -v           # Verbose mode (show full output)
#   ./test-triggers.sh "query"      # Test single query
#   ./test-triggers.sh -v "query"   # Single query with verbose

set -e

echo "=== Rust Skills Forced Eval Hook Tests ==="
echo ""
echo "Testing if hook triggers and Claude evaluates skills..."
echo ""

# Parse arguments
VERBOSE=false
SINGLE_TEST=""
while [[ $# -gt 0 ]]; do
    case $1 in
        -v|--verbose) VERBOSE=true; shift ;;
        *) SINGLE_TEST="$1"; shift ;;
    esac
done

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Test counter
PASS=0
FAIL=0

# Cross-platform timeout function
run_with_timeout() {
    local timeout_sec=$1
    shift
    if command -v gtimeout &> /dev/null; then
        gtimeout "$timeout_sec" "$@"
    elif command -v timeout &> /dev/null; then
        timeout "$timeout_sec" "$@"
    else
        # macOS fallback: use perl
        perl -e 'alarm shift @ARGV; exec @ARGV' "$timeout_sec" "$@"
    fi
}

# Test function - checks if response contains skill evaluation
test_hook() {
    local query="$1"
    local expected_skill="$2"

    echo -n "Testing: \"$query\" "
    echo -n "→ expecting evaluation of $expected_skill ... "

    # Run claude and capture output (first 50 lines)
    result=$(run_with_timeout 60 claude -p "$query" 2>&1 | head -50 || true)

    # Check if output contains skill evaluation pattern
    # Patterns: "[RUST-SKILL-EVAL]", "YES -", "NO -", skill names, etc.
    if echo "$result" | grep -qiE "\[RUST-SKILL-EVAL\]|(YES|NO)[ :-]|Skill\(|skill.*:|m0[1-7]-|unsafe-checker|coding-guidelines|rust-learner|rust-router|domain-"; then
        echo -e "${GREEN}HOOK TRIGGERED${NC}"

        # Check if the expected skill was mentioned
        if echo "$result" | grep -qi "$expected_skill"; then
            echo -e "  └─ ${GREEN}✓ $expected_skill evaluated${NC}"
            ((PASS++))
        else
            echo -e "  └─ ${YELLOW}? $expected_skill not explicitly mentioned${NC}"
            ((PASS++))  # Hook still worked
        fi
    else
        echo -e "${RED}HOOK NOT TRIGGERED${NC}"
        echo "  First 300 chars of response:"
        echo "$result" | head -c 300
        echo ""
        ((FAIL++))
    fi

    # Show full output in verbose mode
    if [ "$VERBOSE" = true ]; then
        echo "  --- Full output ---"
        echo "$result"
        echo "  -------------------"
    fi
    echo ""
}

echo "--- Testing Hook Activation ---"
echo ""

# If single test specified, run only that
if [ -n "$SINGLE_TEST" ]; then
    test_hook "$SINGLE_TEST" "any-skill"
else
    test_hook "E0382 错误怎么解决" "m01-ownership"
    test_hook "Rust Arc 和 Rc 什么区别" "m02-resource"
    test_hook "Rust async await 怎么用" "m07-concurrency"
    test_hook "unsafe Rust block 怎么写安全" "unsafe-checker"
fi

echo "=== Summary ==="
echo -e "Hook Triggered: ${GREEN}$PASS${NC}"
echo -e "Hook Failed: ${RED}$FAIL${NC}"
echo ""

if [ $FAIL -gt 0 ]; then
    echo -e "${YELLOW}Some hooks didn't trigger. Check:${NC}"
    echo "  1. Is this a new Claude session? (restart if needed)"
    echo "  2. Is .claude/settings.local.json configured?"
    echo "  3. Is .claude/hooks/rust-skill-eval-hook.js available?"
    exit 1
else
    echo -e "${GREEN}All hooks triggered successfully!${NC}"
    exit 0
fi
