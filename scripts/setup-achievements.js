#!/usr/bin/env node
/**
 * Achievement System Quick Setup Script
 * Usage: node setup-achievements.js [rust-skills-dir]
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Colors
const colors = {
  RED: '\x1b[0;31m',
  GREEN: '\x1b[0;32m',
  YELLOW: '\x1b[1;33m',
  BLUE: '\x1b[0;34m',
  NC: '\x1b[0m' // No Color
};

/**
 * Print colored message
 */
function printBox() {
  console.log(colors.BLUE);
  console.log('╔═══════════════════════════════════════════╗');
  console.log('║   🏆 Achievement System Setup             ║');
  console.log('╚═══════════════════════════════════════════╝');
  console.log(colors.NC);
}

/**
 * Print error message and exit
 */
function error(message) {
  console.error(`${colors.RED}Error: ${message}${colors.NC}`);
  process.exit(1);
}

/**
 * Main setup function
 */
function main() {
  printBox();

  // Determine rust-skills directory
  const scriptDir = __dirname;
  const rustSkillsDir = process.argv[2] || path.dirname(scriptDir);

  // Verify source exists
  const trackerSource = path.join(rustSkillsDir, 'scripts', 'achievement-tracker.sh');
  if (!fs.existsSync(trackerSource)) {
    console.error(`${colors.RED}Error: Cannot find achievement-tracker.sh${colors.NC}`);
    console.error(`Expected at: ${trackerSource}`);
    console.error('');
    console.error(`Usage: node ${path.basename(__filename)} [path-to-rust-skills]`);
    process.exit(1);
  }

  // Get home directory
  const homeDir = os.homedir();
  const claudeDir = path.join(homeDir, '.claude');
  const hooksDir = path.join(claudeDir, 'hooks');
  const achievementsDir = path.join(claudeDir, 'achievements');

  // Step 1: Create directories
  console.log(`${colors.YELLOW}Step 1: Creating directories...${colors.NC}`);
  if (!fs.existsSync(hooksDir)) {
    fs.mkdirSync(hooksDir, { recursive: true });
  }
  if (!fs.existsSync(achievementsDir)) {
    fs.mkdirSync(achievementsDir, { recursive: true });
  }
  console.log(`${colors.GREEN}  ✓ Created ${hooksDir}${colors.NC}`);
  console.log(`${colors.GREEN}  ✓ Created ${achievementsDir}${colors.NC}`);
  console.log('');

  // Step 2: Install achievement tracker
  console.log(`${colors.YELLOW}Step 2: Installing achievement tracker...${colors.NC}`);
  const trackerDest = path.join(hooksDir, 'achievement-tracker.sh');
  fs.copyFileSync(trackerSource, trackerDest);

  // On Unix-like systems, make it executable
  // On Windows, this is not necessary as scripts are run via bash/node
  if (process.platform !== 'win32') {
    try {
      fs.chmodSync(trackerDest, 0o755);
    } catch (err) {
      // Ignore chmod errors on systems that don't support it
    }
  }
  console.log(`${colors.GREEN}  ✓ Installed achievement-tracker.sh${colors.NC}`);
  console.log('');

  // Step 3: Initialize data files
  console.log(`${colors.YELLOW}Step 3: Initializing data files...${colors.NC}`);

  // Initialize stats file
  const statsFile = path.join(achievementsDir, 'stats.json');
  if (!fs.existsSync(statsFile)) {
    const statsData = {
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
    fs.writeFileSync(statsFile, JSON.stringify(statsData, null, 2) + '\n');
    console.log(`${colors.GREEN}  ✓ Created stats.json${colors.NC}`);
  } else {
    console.log(`${colors.BLUE}  ℹ stats.json already exists (keeping existing data)${colors.NC}`);
  }

  // Initialize achievements file
  const unlockedFile = path.join(achievementsDir, 'unlocked.json');
  if (!fs.existsSync(unlockedFile)) {
    const unlockedData = { unlocked: [] };
    fs.writeFileSync(unlockedFile, JSON.stringify(unlockedData) + '\n');
    console.log(`${colors.GREEN}  ✓ Created unlocked.json${colors.NC}`);
  } else {
    console.log(`${colors.BLUE}  ℹ unlocked.json already exists (keeping existing data)${colors.NC}`);
  }

  console.log('');
  console.log(`${colors.GREEN}╔═══════════════════════════════════════════╗${colors.NC}`);
  console.log(`${colors.GREEN}║   ✅ Installation Complete!               ║${colors.NC}`);
  console.log(`${colors.GREEN}╚═══════════════════════════════════════════╝${colors.NC}`);

  // Print configuration instructions
  console.log('');
  console.log(`${colors.YELLOW}Next Step: Configure Claude Code Hooks${colors.NC}`);
  console.log('');
  console.log(`Add this to your ${path.join(homeDir, '.claude', 'settings.json')}:`);
  console.log('');
  console.log(colors.BLUE + '{');
  console.log('  "hooks": {');
  console.log('    "PostToolUse": [');
  console.log('      {');
  console.log('        "matcher": "Edit|Write|Bash",');
  console.log('        "hooks": [');
  console.log('          {');
  console.log('            "type": "command",');

  // Use forward slashes for the path (works on both Windows and Unix)
  const hookPath = path.join(homeDir, '.claude', 'hooks', 'achievement-tracker.sh').replace(/\\/g, '/');
  console.log(`            "command": "${hookPath} PostToolUse"`);
  console.log('          }');
  console.log('        ]');
  console.log('      }');
  console.log('    ],');
  console.log('    "UserPromptSubmit": [');
  console.log('      {');
  console.log('        "hooks": [');
  console.log('          {');
  console.log('            "type": "command",');
  console.log(`            "command": "${hookPath} UserPromptSubmit"`);
  console.log('          }');
  console.log('        ]');
  console.log('      }');
  console.log('    ]');
  console.log('  }');
  console.log('}' + colors.NC);

  console.log('');
  console.log(`${colors.YELLOW}Quick Test:${colors.NC}`);
  console.log(`  ${hookPath} UserPromptSubmit`);
  console.log('');
  console.log(`${colors.YELLOW}View Achievements:${colors.NC}`);
  console.log('  /achievement');
  console.log('');
  console.log(`🎮 ${colors.GREEN}Start coding to earn achievements!${colors.NC}`);
}

// Run the script
try {
  main();
} catch (error) {
  console.error(`${colors.RED}Error: ${error.message}${colors.NC}`);
  console.error(error.stack);
  process.exit(1);
}
