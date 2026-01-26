#!/usr/bin/env node
/**
 * Rust Skills Setup Script
 * Creates .claude/settings.local.json with required permissions
 */

const fs = require('fs');
const path = require('path');

// Configuration
const ROOT_DIR = path.join(__dirname, '..');
const CLAUDE_DIR = path.join(ROOT_DIR, '.claude');
const SETTINGS_FILE = path.join(CLAUDE_DIR, 'settings.local.json');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m'
};

/**
 * Main setup function
 */
function main() {
  console.log('Setting up Rust Skills for Claude Code...\n');

  // Check if settings file already exists
  if (fs.existsSync(SETTINGS_FILE)) {
    console.log(`${colors.yellow}.claude/settings.local.json already exists${colors.reset}`);
    console.log('Please add permissions manually:');
    console.log('  "Bash(agent-browser *)"');
    console.log();
    return;
  }

  // Create .claude directory if it doesn't exist
  if (!fs.existsSync(CLAUDE_DIR)) {
    fs.mkdirSync(CLAUDE_DIR, { recursive: true });
  }

  // Create settings file with permissions
  const settings = {
    permissions: {
      allow: [
        'Bash(agent-browser *)'
      ]
    }
  };

  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2) + '\n');

  console.log(`${colors.green}Created .claude/settings.local.json with agent-browser permissions${colors.reset}\n`);
  console.log('Setup complete!\n');
  console.log('Usage:');
  console.log(`  claude --plugin-dir ${ROOT_DIR}`);
  console.log();
}

// Run the script
try {
  main();
} catch (error) {
  console.error(`${colors.yellow}Error:${colors.reset} ${error.message}`);
  process.exit(1);
}
