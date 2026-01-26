#!/usr/bin/env node
/**
 * Achievement Tracker Hook for Claude Code
 * Tracks coding behaviors and unlocks achievements
 *
 * Usage: Add to Claude Code hooks configuration
 * Hook types: PostToolUse, UserPromptSubmit
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// ============================================================
// Configuration
// ============================================================

const STATS_DIR = path.join(os.homedir(), '.claude', 'achievements');
const STATS_FILE = path.join(STATS_DIR, 'stats.json');
const ACHIEVEMENTS_FILE = path.join(STATS_DIR, 'unlocked.json');
const LOG_FILE = path.join(STATS_DIR, 'activity.log');

// ============================================================
// Initialize
// ============================================================

// Create directory
if (!fs.existsSync(STATS_DIR)) {
  fs.mkdirSync(STATS_DIR, { recursive: true });
}

// Initialize stats file
if (!fs.existsSync(STATS_FILE)) {
  const initialStats = {
    bugs_fixed: 0,
    tests_written: 0,
    unsafe_avoided_days: 0,
    unsafe_used: 0,
    code_reviews: 0,
    docs_written: 0,
    errors_resolved: 0,
    refactors: 0,
    streak_days: 0,
    total_sessions: 0,
    rust_questions: 0,
    skills_used: 0,
    last_date: '',
    last_unsafe_date: '',
    first_session_date: ''
  };
  fs.writeFileSync(STATS_FILE, JSON.stringify(initialStats, null, 2));
}

// Initialize achievements file
if (!fs.existsSync(ACHIEVEMENTS_FILE)) {
  fs.writeFileSync(ACHIEVEMENTS_FILE, JSON.stringify({ unlocked: [] }, null, 2));
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * Atomically read and update stats file
 * Handles cross-partition/Windows rename issues
 */
function atomicUpdate(file, updater) {
  try {
    // Read current data
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));

    // Apply update
    const updated = updater(data);

    // Write to temp file first
    const tmpFile = file + '.tmp';
    fs.writeFileSync(tmpFile, JSON.stringify(updated, null, 2));

    // Atomic rename with Windows fallback
    try {
      fs.renameSync(tmpFile, file);
    } catch (renameErr) {
      // Handle EXDEV (cross-partition) or Windows issues
      if (renameErr.code === 'EXDEV' || process.platform === 'win32') {
        // Fallback: copy + delete (less atomic but works cross-partition)
        fs.copyFileSync(tmpFile, file);
        fs.unlinkSync(tmpFile);
      } else {
        throw renameErr;
      }
    }

    return updated;
  } catch (error) {
    console.error(`Error updating ${file}:`, error.message);
    return null;
  }
}

/**
 * Get stat value
 */
function getStat(key) {
  try {
    const stats = JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'));
    return stats[key] || 0;
  } catch {
    return 0;
  }
}

/**
 * Set stat value
 */
function setStat(key, value) {
  atomicUpdate(STATS_FILE, stats => {
    stats[key] = value;
    return stats;
  });
}

/**
 * Increment stat value
 */
function incrementStat(key) {
  const updated = atomicUpdate(STATS_FILE, stats => {
    stats[key] = (stats[key] || 0) + 1;
    return stats;
  });
  return updated ? updated[key] : null;
}

/**
 * Check if achievement is unlocked
 */
function isUnlocked(achievementId) {
  try {
    const data = JSON.parse(fs.readFileSync(ACHIEVEMENTS_FILE, 'utf8'));
    return data.unlocked.includes(achievementId);
  } catch {
    return false;
  }
}

/**
 * Unlock achievement
 */
function unlockAchievement(id, name, desc, icon) {
  if (isUnlocked(id)) {
    return;
  }

  // Add to unlocked list
  atomicUpdate(ACHIEVEMENTS_FILE, data => {
    data.unlocked.push(id);
    return data;
  });

  // Display celebration
  console.log('');
  console.log('==============================================');
  console.log(`${icon}  Achievement Unlocked!  ${icon}`);
  console.log('==============================================');
  console.log('');
  console.log(`   ${name}`);
  console.log(`   ${desc}`);
  console.log('');
  console.log('==============================================');
  console.log('');

  // Log the achievement
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] UNLOCKED: ${id} - ${name}\n`;
  fs.appendFileSync(LOG_FILE, logEntry);
}

// ============================================================
// Achievement Definitions
// ============================================================

function checkAchievements() {
  const bugs = getStat('bugs_fixed');
  const tests = getStat('tests_written');
  const streak = getStat('streak_days');
  const errors = getStat('errors_resolved');
  const reviews = getStat('code_reviews');
  const unsafeDays = getStat('unsafe_avoided_days');
  const sessions = getStat('total_sessions');
  const rustQ = getStat('rust_questions');
  const refactors = getStat('refactors');
  const docs = getStat('docs_written');

  // === Bug Fixing ===
  if (bugs >= 1) unlockAchievement('first_blood', 'First Blood', 'Fixed your first bug', '🩸');
  if (bugs >= 10) unlockAchievement('bug_hunter', 'Bug Hunter', 'Fixed 10 bugs', '🐛');
  if (bugs >= 50) unlockAchievement('bug_slayer', 'Bug Slayer', 'Fixed 50 bugs', '⚔️');
  if (bugs >= 100) unlockAchievement('bug_terminator', 'Bug Terminator', 'Fixed 100 bugs', '🤖');

  // === Testing ===
  if (tests >= 1) unlockAchievement('test_curious', 'Test Curious', 'Wrote your first test', '🧪');
  if (tests >= 10) unlockAchievement('test_believer', 'Test Believer', 'Wrote 10 tests', '✅');
  if (tests >= 50) unlockAchievement('test_enthusiast', 'Test Enthusiast', 'Wrote 50 tests', '🎯');
  if (tests >= 100) unlockAchievement('tdd_master', 'TDD Master', 'Wrote 100 tests', '🏆');

  // === Streak ===
  if (streak >= 3) unlockAchievement('getting_started', 'Getting Started', 'Coded for 3 days straight', '🌱');
  if (streak >= 7) unlockAchievement('week_warrior', 'Week Warrior', 'Coded for 7 days straight', '🔥');
  if (streak >= 30) unlockAchievement('monthly_master', 'Monthly Master', 'Coded for 30 days straight', '💪');
  if (streak >= 100) unlockAchievement('unstoppable', 'Unstoppable', 'Coded for 100 days straight', '🚀');

  // === Safety ===
  if (unsafeDays >= 7) unlockAchievement('safety_first', 'Safety First', '7 days without unsafe code', '🛡️');
  if (unsafeDays >= 30) unlockAchievement('safe_rustacean', 'Safe Rustacean', '30 days without unsafe code', '🦀');
  if (unsafeDays >= 100) unlockAchievement('safety_champion', 'Safety Champion', '100 days without unsafe code', '👑');

  // === Error Resolution ===
  if (errors >= 1) unlockAchievement('error_whisperer', 'Error Whisperer', 'Resolved your first compiler error', '🔧');
  if (errors >= 25) unlockAchievement('borrow_checker_friend', "Borrow Checker's Friend", 'Resolved 25 compiler errors', '🤝');
  if (errors >= 100) unlockAchievement('compiler_whisperer', 'Compiler Whisperer', 'Resolved 100 compiler errors', '🧙');

  // === Code Review ===
  if (reviews >= 1) unlockAchievement('code_reviewer', 'Code Reviewer', 'First code review', '👀');
  if (reviews >= 10) unlockAchievement('quality_guardian', 'Quality Guardian', '10 code reviews', '🛡️');

  // === Documentation ===
  if (docs >= 5) unlockAchievement('documenter', 'Documenter', 'Wrote 5 doc comments', '📝');
  if (docs >= 25) unlockAchievement('doc_master', 'Documentation Master', 'Wrote 25 doc comments', '📚');

  // === Refactoring ===
  if (refactors >= 5) unlockAchievement('code_cleaner', 'Code Cleaner', '5 refactoring sessions', '🧹');
  if (refactors >= 25) unlockAchievement('architect', 'Architect', '25 refactoring sessions', '🏛️');

  // === Learning ===
  if (rustQ >= 10) unlockAchievement('curious_crab', 'Curious Crab', 'Asked 10 Rust questions', '❓');
  if (rustQ >= 50) unlockAchievement('knowledge_seeker', 'Knowledge Seeker', 'Asked 50 Rust questions', '🎓');
  if (rustQ >= 100) unlockAchievement('rust_scholar', 'Rust Scholar', 'Asked 100 Rust questions', '🎖️');

  // === Sessions ===
  if (sessions >= 1) unlockAchievement('hello_rust', 'Hello, Rust!', 'First coding session', '👋');
  if (sessions >= 50) unlockAchievement('regular', 'Regular', '50 coding sessions', '📅');
  if (sessions >= 200) unlockAchievement('dedicated', 'Dedicated', '200 coding sessions', '💎');
}

// ============================================================
// Date Utilities
// ============================================================

/**
 * Get today's date in YYYY-MM-DD format
 */
function getToday() {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

/**
 * Get yesterday's date in YYYY-MM-DD format
 */
function getYesterday() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
}

// ============================================================
// Event Handlers
// ============================================================

function handleToolUse() {
  const toolName = process.env.CLAUDE_TOOL_NAME || '';
  const toolInput = process.env.CLAUDE_TOOL_INPUT || '';

  // Skip if no tool info
  if (!toolName) return;

  // Track based on tool and content
  switch (toolName) {
    case 'Edit':
    case 'Write':
      // Check for test code
      if (/#\[test\]|#\[tokio::test\]|assert!|assert_eq!/.test(toolInput)) {
        const count = incrementStat('tests_written');
        console.log(`🧪 Test written! (${count} total)`);
      }

      // Check for unsafe code
      if (/unsafe \{/.test(toolInput)) {
        incrementStat('unsafe_used');
        setStat('last_unsafe_date', getToday());
        setStat('unsafe_avoided_days', 0);
        console.log('⚠️ Unsafe code detected');
      }

      // Check for doc comments
      const docMatches = toolInput.match(/^\s*\/\/\/|^\s*\/\/!/gm);
      if (docMatches && docMatches.length > 2) {
        incrementStat('docs_written');
      }

      // Check for bug fixes
      if (/fix|bug|修复|patch|resolve/i.test(toolInput)) {
        const count = incrementStat('bugs_fixed');
        console.log(`🐛 Bug fix detected! (${count} total)`);
      }

      // Check for refactoring
      if (/refactor|重构|clean|extract|rename/i.test(toolInput)) {
        incrementStat('refactors');
      }
      break;

    case 'Bash':
      // Check for cargo test
      if (/cargo test|cargo t /.test(toolInput)) {
        incrementStat('tests_written');
      }

      // Check for clippy/review
      if (/cargo clippy|cargo fmt/.test(toolInput)) {
        incrementStat('code_reviews');
      }
      break;
  }

  checkAchievements();
}

function handlePrompt() {
  const prompt = process.env.CLAUDE_USER_PROMPT || '';

  // Skip if no prompt
  if (!prompt) return;

  // Track Rust questions
  if (/rust|cargo|借用|所有权|lifetime|trait|async|tokio/i.test(prompt)) {
    incrementStat('rust_questions');
  }

  // Check for error resolution requests
  if (/E[0-9]{4}|error\[|cannot|expected|mismatched/.test(prompt)) {
    incrementStat('errors_resolved');
  }

  checkAchievements();
}

function handleSessionStart() {
  const today = getToday();
  const lastDate = getStat('last_date') || '';
  const firstDate = getStat('first_session_date') || '';

  // Set first session date
  if (!firstDate) {
    setStat('first_session_date', today);
  }

  // Update session count and streak
  if (lastDate !== today) {
    incrementStat('total_sessions');

    // Calculate streak
    const yesterday = getYesterday();

    if (lastDate) {
      if (lastDate === yesterday) {
        // Consecutive day
        incrementStat('streak_days');
      } else {
        // Streak broken, reset to 1
        setStat('streak_days', 1);
      }
    } else {
      // First session
      setStat('streak_days', 1);
    }

    // Update unsafe avoided days
    const lastUnsafe = getStat('last_unsafe_date') || '';
    if (!lastUnsafe || lastUnsafe !== today) {
      incrementStat('unsafe_avoided_days');
    }

    setStat('last_date', today);

    // Show streak reminder
    const streak = getStat('streak_days');
    if (streak > 1) {
      console.log(`🔥 Streak: ${streak} days!`);
    }
  }

  checkAchievements();
}

// ============================================================
// Main
// ============================================================

function main() {
  const hookType = process.argv[2] || 'PostToolUse';

  try {
    switch (hookType) {
      case 'PostToolUse':
        handleToolUse();
        break;
      case 'UserPromptSubmit':
        handleSessionStart();
        handlePrompt();
        break;
      case 'SessionStart':
        handleSessionStart();
        break;
      default:
        handleToolUse();
        break;
    }
  } catch (error) {
    // Silently fail - don't interrupt user workflow
    // Log error for debugging
    const errorLog = `[${new Date().toISOString()}] ERROR: ${error.message}\n`;
    try {
      fs.appendFileSync(LOG_FILE, errorLog);
    } catch {
      // Can't even log - give up silently
    }
  }
}

main();
