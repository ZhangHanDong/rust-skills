#!/bin/bash
# Achievement Tracker Hook for Claude Code
# Tracks coding behaviors and unlocks achievements
#
# Usage: Add to Claude Code hooks configuration
# Hook types: PostToolUse, UserPromptSubmit

set -euo pipefail

# ============================================================
# Configuration
# ============================================================

STATS_DIR="${HOME}/.claude/achievements"
STATS_FILE="${STATS_DIR}/stats.json"
ACHIEVEMENTS_FILE="${STATS_DIR}/unlocked.json"
LOG_FILE="${STATS_DIR}/activity.log"

# ============================================================
# Initialize
# ============================================================

mkdir -p "$STATS_DIR"

# Initialize stats file if not exists
if [ ! -f "$STATS_FILE" ]; then
  cat > "$STATS_FILE" << 'EOF'
{
  "bugs_fixed": 0,
  "tests_written": 0,
  "unsafe_avoided_days": 0,
  "unsafe_used": 0,
  "code_reviews": 0,
  "docs_written": 0,
  "errors_resolved": 0,
  "refactors": 0,
  "streak_days": 0,
  "total_sessions": 0,
  "rust_questions": 0,
  "skills_used": 0,
  "last_date": "",
  "last_unsafe_date": "",
  "first_session_date": ""
}
EOF
fi

# Initialize achievements file if not exists
if [ ! -f "$ACHIEVEMENTS_FILE" ]; then
  echo '{"unlocked":[]}' > "$ACHIEVEMENTS_FILE"
fi

# ============================================================
# Helper Functions
# ============================================================

get_stat() {
  jq -r ".$1 // 0" "$STATS_FILE"
}

set_stat() {
  local key="$1"
  local value="$2"
  local tmp=$(mktemp)
  jq ".$key = $value" "$STATS_FILE" > "$tmp" && mv "$tmp" "$STATS_FILE"
}

increment_stat() {
  local key="$1"
  local current=$(get_stat "$key")
  set_stat "$key" "$((current + 1))"
  echo "$((current + 1))"
}

is_unlocked() {
  local achievement="$1"
  jq -e ".unlocked | index(\"$achievement\")" "$ACHIEVEMENTS_FILE" > /dev/null 2>&1
}

unlock_achievement() {
  local id="$1"
  local name="$2"
  local desc="$3"
  local icon="$4"

  if is_unlocked "$id"; then
    return
  fi

  # Add to unlocked list
  local tmp=$(mktemp)
  jq ".unlocked += [\"$id\"]" "$ACHIEVEMENTS_FILE" > "$tmp" && mv "$tmp" "$ACHIEVEMENTS_FILE"

  # Display celebration
  echo ""
  echo "=============================================="
  echo "$icon  Achievement Unlocked!  $icon"
  echo "=============================================="
  echo ""
  echo "   $name"
  echo "   $desc"
  echo ""
  echo "=============================================="
  echo ""

  # Log the achievement
  echo "[$(date -Iseconds)] UNLOCKED: $id - $name" >> "$LOG_FILE"
}

# ============================================================
# Achievement Definitions
# ============================================================

check_achievements() {
  local bugs=$(get_stat "bugs_fixed")
  local tests=$(get_stat "tests_written")
  local streak=$(get_stat "streak_days")
  local errors=$(get_stat "errors_resolved")
  local reviews=$(get_stat "code_reviews")
  local unsafe_days=$(get_stat "unsafe_avoided_days")
  local sessions=$(get_stat "total_sessions")
  local rust_q=$(get_stat "rust_questions")
  local refactors=$(get_stat "refactors")
  local docs=$(get_stat "docs_written")

  # === Bug Fixing ===
  [ "$bugs" -ge 1 ] && unlock_achievement "first_blood" "First Blood" "Fixed your first bug" "🩸"
  [ "$bugs" -ge 10 ] && unlock_achievement "bug_hunter" "Bug Hunter" "Fixed 10 bugs" "🐛"
  [ "$bugs" -ge 50 ] && unlock_achievement "bug_slayer" "Bug Slayer" "Fixed 50 bugs" "⚔️"
  [ "$bugs" -ge 100 ] && unlock_achievement "bug_terminator" "Bug Terminator" "Fixed 100 bugs" "🤖"

  # === Testing ===
  [ "$tests" -ge 1 ] && unlock_achievement "test_curious" "Test Curious" "Wrote your first test" "🧪"
  [ "$tests" -ge 10 ] && unlock_achievement "test_believer" "Test Believer" "Wrote 10 tests" "✅"
  [ "$tests" -ge 50 ] && unlock_achievement "test_enthusiast" "Test Enthusiast" "Wrote 50 tests" "🎯"
  [ "$tests" -ge 100 ] && unlock_achievement "tdd_master" "TDD Master" "Wrote 100 tests" "🏆"

  # === Streak ===
  [ "$streak" -ge 3 ] && unlock_achievement "getting_started" "Getting Started" "Coded for 3 days straight" "🌱"
  [ "$streak" -ge 7 ] && unlock_achievement "week_warrior" "Week Warrior" "Coded for 7 days straight" "🔥"
  [ "$streak" -ge 30 ] && unlock_achievement "monthly_master" "Monthly Master" "Coded for 30 days straight" "💪"
  [ "$streak" -ge 100 ] && unlock_achievement "unstoppable" "Unstoppable" "Coded for 100 days straight" "🚀"

  # === Safety ===
  [ "$unsafe_days" -ge 7 ] && unlock_achievement "safety_first" "Safety First" "7 days without unsafe code" "🛡️"
  [ "$unsafe_days" -ge 30 ] && unlock_achievement "safe_rustacean" "Safe Rustacean" "30 days without unsafe code" "🦀"
  [ "$unsafe_days" -ge 100 ] && unlock_achievement "safety_champion" "Safety Champion" "100 days without unsafe code" "👑"

  # === Error Resolution ===
  [ "$errors" -ge 1 ] && unlock_achievement "error_whisperer" "Error Whisperer" "Resolved your first compiler error" "🔧"
  [ "$errors" -ge 25 ] && unlock_achievement "borrow_checker_friend" "Borrow Checker's Friend" "Resolved 25 compiler errors" "🤝"
  [ "$errors" -ge 100 ] && unlock_achievement "compiler_whisperer" "Compiler Whisperer" "Resolved 100 compiler errors" "🧙"

  # === Code Review ===
  [ "$reviews" -ge 1 ] && unlock_achievement "code_reviewer" "Code Reviewer" "First code review" "👀"
  [ "$reviews" -ge 10 ] && unlock_achievement "quality_guardian" "Quality Guardian" "10 code reviews" "🛡️"

  # === Documentation ===
  [ "$docs" -ge 5 ] && unlock_achievement "documenter" "Documenter" "Wrote 5 doc comments" "📝"
  [ "$docs" -ge 25 ] && unlock_achievement "doc_master" "Documentation Master" "Wrote 25 doc comments" "📚"

  # === Refactoring ===
  [ "$refactors" -ge 5 ] && unlock_achievement "code_cleaner" "Code Cleaner" "5 refactoring sessions" "🧹"
  [ "$refactors" -ge 25 ] && unlock_achievement "architect" "Architect" "25 refactoring sessions" "🏛️"

  # === Learning ===
  [ "$rust_q" -ge 10 ] && unlock_achievement "curious_crab" "Curious Crab" "Asked 10 Rust questions" "❓"
  [ "$rust_q" -ge 50 ] && unlock_achievement "knowledge_seeker" "Knowledge Seeker" "Asked 50 Rust questions" "🎓"
  [ "$rust_q" -ge 100 ] && unlock_achievement "rust_scholar" "Rust Scholar" "Asked 100 Rust questions" "🎖️"

  # === Sessions ===
  [ "$sessions" -ge 1 ] && unlock_achievement "hello_rust" "Hello, Rust!" "First coding session" "👋"
  [ "$sessions" -ge 50 ] && unlock_achievement "regular" "Regular" "50 coding sessions" "📅"
  [ "$sessions" -ge 200 ] && unlock_achievement "dedicated" "Dedicated" "200 coding sessions" "💎"
}

# ============================================================
# Event Handlers
# ============================================================

handle_tool_use() {
  local tool_name="${CLAUDE_TOOL_NAME:-}"
  local tool_input="${CLAUDE_TOOL_INPUT:-}"
  local file_path="${CLAUDE_FILE_PATH:-}"

  # Skip if no tool info
  [ -z "$tool_name" ] && return

  # Track based on tool and content
  case "$tool_name" in
    Edit|Write)
      # Check for test code
      if echo "$tool_input" | grep -qE '#\[test\]|#\[tokio::test\]|assert!|assert_eq!'; then
        increment_stat "tests_written" > /dev/null
        echo "🧪 Test written! ($(get_stat tests_written) total)"
      fi

      # Check for unsafe code
      if echo "$tool_input" | grep -q 'unsafe {'; then
        increment_stat "unsafe_used" > /dev/null
        set_stat "last_unsafe_date" "\"$(date +%Y-%m-%d)\""
        set_stat "unsafe_avoided_days" "0"
        echo "⚠️ Unsafe code detected"
      fi

      # Check for doc comments
      if echo "$tool_input" | grep -qE '^\s*///|^\s*//!'; then
        doc_count=$(echo "$tool_input" | grep -cE '^\s*///|^\s*//!' || echo "0")
        if [ "$doc_count" -gt 2 ]; then
          increment_stat "docs_written" > /dev/null
        fi
      fi

      # Check for bug fixes
      if echo "$tool_input" | grep -qiE 'fix|bug|修复|patch|resolve'; then
        increment_stat "bugs_fixed" > /dev/null
        echo "🐛 Bug fix detected! ($(get_stat bugs_fixed) total)"
      fi

      # Check for refactoring
      if echo "$tool_input" | grep -qiE 'refactor|重构|clean|extract|rename'; then
        increment_stat "refactors" > /dev/null
      fi
      ;;

    Bash)
      # Check for cargo test
      if echo "$tool_input" | grep -qE 'cargo test|cargo t '; then
        increment_stat "tests_written" > /dev/null
      fi

      # Check for clippy/review
      if echo "$tool_input" | grep -qE 'cargo clippy|cargo fmt'; then
        increment_stat "code_reviews" > /dev/null
      fi
      ;;
  esac

  check_achievements
}

handle_prompt() {
  local prompt="${CLAUDE_USER_PROMPT:-}"

  # Skip if no prompt
  [ -z "$prompt" ] && return

  # Track Rust questions
  if echo "$prompt" | grep -qiE 'rust|cargo|借用|所有权|lifetime|trait|async|tokio'; then
    increment_stat "rust_questions" > /dev/null
  fi

  # Check for error resolution requests
  if echo "$prompt" | grep -qE 'E[0-9]{4}|error\[|cannot|expected|mismatched'; then
    increment_stat "errors_resolved" > /dev/null
  fi

  check_achievements
}

handle_session_start() {
  local today=$(date +%Y-%m-%d)
  local last_date=$(get_stat "last_date" | tr -d '"')
  local first_date=$(get_stat "first_session_date" | tr -d '"')

  # Set first session date
  if [ -z "$first_date" ] || [ "$first_date" = "null" ]; then
    set_stat "first_session_date" "\"$today\""
  fi

  # Update session count and streak
  if [ "$last_date" != "$today" ]; then
    increment_stat "total_sessions" > /dev/null

    # Calculate streak
    if [ -n "$last_date" ] && [ "$last_date" != "null" ]; then
      # Check if yesterday (cross-platform)
      if command -v gdate > /dev/null; then
        yesterday=$(gdate -d "yesterday" +%Y-%m-%d)
      elif date -d "yesterday" +%Y-%m-%d > /dev/null 2>&1; then
        yesterday=$(date -d "yesterday" +%Y-%m-%d)
      else
        yesterday=$(date -v-1d +%Y-%m-%d)
      fi

      if [ "$last_date" = "$yesterday" ]; then
        increment_stat "streak_days" > /dev/null
      else
        set_stat "streak_days" "1"
      fi
    else
      set_stat "streak_days" "1"
    fi

    # Update unsafe avoided days
    local last_unsafe=$(get_stat "last_unsafe_date" | tr -d '"')
    if [ -z "$last_unsafe" ] || [ "$last_unsafe" = "null" ]; then
      increment_stat "unsafe_avoided_days" > /dev/null
    elif [ "$last_unsafe" != "$today" ]; then
      increment_stat "unsafe_avoided_days" > /dev/null
    fi

    set_stat "last_date" "\"$today\""

    # Show streak reminder
    local streak=$(get_stat "streak_days")
    if [ "$streak" -gt 1 ]; then
      echo "🔥 Streak: $streak days!"
    fi
  fi

  check_achievements
}

# ============================================================
# Main
# ============================================================

main() {
  local hook_type="${1:-PostToolUse}"

  case "$hook_type" in
    PostToolUse)
      handle_tool_use
      ;;
    UserPromptSubmit)
      handle_session_start
      handle_prompt
      ;;
    SessionStart)
      handle_session_start
      ;;
    *)
      handle_tool_use
      ;;
  esac
}

main "$@"
