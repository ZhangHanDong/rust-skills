#!/usr/bin/env node
/**
 * Rust Skills Validation Script
 * Run this to validate skills are properly configured
 */

const fs = require('fs');
const path = require('path');
const { globSync } = require('glob');

// Configuration
const ROOT_DIR = path.join(__dirname, '..', '..');

// Colors
const colors = {
  GREEN: '\x1b[0;32m',
  RED: '\x1b[0;31m',
  YELLOW: '\x1b[1;33m',
  NC: '\x1b[0m' // No Color
};

let FAILED = 0;

/**
 * Print success message
 */
function pass(message) {
  console.log(`${colors.GREEN}✓${colors.NC} ${message}`);
}

/**
 * Print failure message
 */
function fail(message) {
  console.log(`${colors.RED}✗${colors.NC} ${message}`);
  FAILED = 1;
}

/**
 * Print warning message
 */
function warn(message) {
  console.log(`${colors.YELLOW}!${colors.NC} ${message}`);
}

/**
 * Check if file has frontmatter fields
 */
function hasFrontmatter(filePath, fields) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const normalizedContent = content.replace(/\r\n/g, '\n');

    return fields.every(field => {
      const regex = new RegExp(`^${field}:\\s*`, 'm');
      return regex.test(normalizedContent);
    });
  } catch {
    return false;
  }
}

/**
 * Main validation function
 */
function main() {
  console.log('======================================');
  console.log('Rust Skills Validation');
  console.log('======================================');
  console.log('');

  // =====================================
  // Directory Structure Check
  // =====================================
  console.log('Checking directory structure...');

  const dirs = [
    'skills/m01-ownership',
    'skills/m06-error-handling',
    'skills/m07-concurrency',
    'skills/m10-performance',
    'skills/m14-mental-model',
    'skills/m15-anti-pattern',
    'skills/unsafe-checker',
    'skills/coding-guidelines',
    'skills/rust-router',
    'skills/rust-learner',
    'agents',
    'commands',
    'cache',
    'tests'
  ];

  dirs.forEach(dir => {
    const dirPath = path.join(ROOT_DIR, dir);
    if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
      pass(`${dir} exists`);
    } else {
      fail(`${dir} missing`);
    }
  });

  console.log('');

  // =====================================
  // SKILL.md Files Check
  // =====================================
  console.log('Checking SKILL.md files...');

  const skillFiles = [
    'skills/m01-ownership/SKILL.md',
    'skills/m06-error-handling/SKILL.md',
    'skills/m07-concurrency/SKILL.md',
    'skills/unsafe-checker/SKILL.md',
    'skills/coding-guidelines/SKILL.md',
    'skills/rust-router/SKILL.md',
    'skills/rust-learner/SKILL.md'
  ];

  skillFiles.forEach(file => {
    const filePath = path.join(ROOT_DIR, file);
    if (fs.existsSync(filePath)) {
      // Check for required frontmatter
      if (hasFrontmatter(filePath, ['name', 'description'])) {
        pass(`${file} valid`);
      } else {
        fail(`${file} missing frontmatter`);
      }
    } else {
      fail(`${file} missing`);
    }
  });

  console.log('');

  // =====================================
  // Agent Files Check
  // =====================================
  console.log('Checking agent files...');

  const agentFiles = [
    'agents/crate-researcher.md',
    'agents/rust-changelog.md',
    'agents/docs-researcher.md',
    'agents/clippy-researcher.md'
  ];

  agentFiles.forEach(file => {
    const filePath = path.join(ROOT_DIR, file);
    if (fs.existsSync(filePath)) {
      if (hasFrontmatter(filePath, ['tools'])) {
        pass(`${file} valid`);
      } else {
        fail(`${file} missing tools section`);
      }
    } else {
      fail(`${file} missing`);
    }
  });

  console.log('');

  // =====================================
  // Command Files Check
  // =====================================
  console.log('Checking command files...');

  const commandFiles = [
    'commands/guideline.md',
    'commands/unsafe-check.md',
    'commands/unsafe-review.md'
  ];

  commandFiles.forEach(file => {
    const filePath = path.join(ROOT_DIR, file);
    if (fs.existsSync(filePath)) {
      pass(`${file} exists`);
    } else {
      fail(`${file} missing`);
    }
  });

  console.log('');

  // =====================================
  // Unsafe-Checker Rules Check
  // =====================================
  console.log('Checking unsafe-checker rules...');

  const rulesPath = path.join(ROOT_DIR, 'skills', 'unsafe-checker', 'rules');
  if (fs.existsSync(rulesPath)) {
    const ruleFiles = globSync('*.md', { cwd: rulesPath })
      .filter(f => !f.startsWith('_'));
    const ruleCount = ruleFiles.length;

    if (ruleCount >= 40) {
      pass(`unsafe-checker has ${ruleCount} rules (expected 40+)`);
    } else {
      warn(`unsafe-checker has ${ruleCount} rules (expected 40+)`);
    }
  } else {
    fail('unsafe-checker rules directory missing');
  }

  // Check checklists
  const checklistsPath = path.join(ROOT_DIR, 'skills', 'unsafe-checker', 'checklists');
  if (fs.existsSync(checklistsPath)) {
    const checklistFiles = globSync('*.md', { cwd: checklistsPath });
    const checklistCount = checklistFiles.length;

    if (checklistCount >= 2) {
      pass(`unsafe-checker has ${checklistCount} checklists`);
    } else {
      warn('unsafe-checker has few checklists');
    }
  } else {
    fail('unsafe-checker checklists missing');
  }

  console.log('');

  // =====================================
  // Deep Dive Content Check
  // =====================================
  console.log('Checking deep dive content...');

  const deepContent = [
    'skills/m01-ownership/patterns/common-errors.md',
    'skills/m01-ownership/patterns/lifetime-patterns.md',
    'skills/m01-ownership/comparison.md',
    'skills/m07-concurrency/patterns/common-errors.md',
    'skills/m07-concurrency/patterns/async-patterns.md',
    'skills/m10-performance/patterns/optimization-guide.md',
    'skills/m14-mental-model/patterns/thinking-in-rust.md',
    'skills/m15-anti-pattern/patterns/common-mistakes.md'
  ];

  deepContent.forEach(file => {
    const filePath = path.join(ROOT_DIR, file);
    if (fs.existsSync(filePath)) {
      pass(`${file} exists`);
    } else {
      warn(`${file} missing (deep dive content)`);
    }
  });

  console.log('');

  // =====================================
  // Cache Structure Check
  // =====================================
  console.log('Checking cache structure...');

  const cacheConfig = path.join(ROOT_DIR, 'cache', 'config.yaml');
  if (fs.existsSync(cacheConfig)) {
    pass('cache/config.yaml exists');
  } else {
    warn('cache/config.yaml missing');
  }

  const cacheDirs = ['crates', 'rust-versions', 'clippy-lints', 'docs'];
  cacheDirs.forEach(dir => {
    const dirPath = path.join(ROOT_DIR, 'cache', dir);
    if (fs.existsSync(dirPath)) {
      pass(`cache/${dir} exists`);
    } else {
      warn(`cache/${dir} missing`);
    }
  });

  console.log('');

  // =====================================
  // Summary
  // =====================================
  console.log('======================================');
  if (FAILED === 0) {
    console.log(`${colors.GREEN}All checks passed!${colors.NC}`);
  } else {
    console.log(`${colors.RED}Some checks failed.${colors.NC}`);
  }
  console.log('======================================');

  process.exit(FAILED);
}

// Run the script
try {
  main();
} catch (error) {
  console.error(`${colors.RED}Error: ${error.message}${colors.NC}`);
  console.error(error.stack);
  process.exit(1);
}
