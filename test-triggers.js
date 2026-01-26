#!/usr/bin/env node
/**
 * Rust Skills Trigger Test Script
 * Tests if the Forced Eval Hook is working
 *
 * Usage:
 *   node test-triggers.js              # Run all tests
 *   node test-triggers.js -v           # Verbose mode (show full output)
 *   node test-triggers.js "query"      # Test single query
 *   node test-triggers.js -v "query"   # Single query with verbose
 */

const { execSync, exec, spawn } = require('child_process');

// Color codes
const colors = {
  GREEN: '\x1b[0;32m',
  RED: '\x1b[0;31m',
  YELLOW: '\x1b[1;33m',
  NC: '\x1b[0m'
};

// Test counter
let PASS = 0;
let FAIL = 0;

// Configuration
let VERBOSE = false;
let SINGLE_TEST = '';

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-v' || args[i] === '--verbose') {
      VERBOSE = true;
    } else {
      SINGLE_TEST = args[i];
    }
  }
}

/**
 * Run command with timeout (safe version using spawn)
 * @param {string[]} args - Command arguments
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise<{stdout: string, stderr: string, timedout: boolean}>}
 */
function runWithTimeout(args, timeoutMs) {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const child = spawn('claude', args, { shell: false });

    const timeoutId = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutMs);

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', () => {
      clearTimeout(timeoutId);
      resolve({ stdout, stderr, timedout: timedOut });
    });

    child.on('error', (error) => {
      clearTimeout(timeoutId);
      resolve({ stdout, stderr: error.message, timedout: false });
    });
  });
}

/**
 * Test function - checks if response contains skill evaluation
 */
async function testHook(query, expectedSkill) {
  process.stdout.write(`Testing: "${query}" `);
  process.stdout.write(`→ expecting evaluation of ${expectedSkill} ... `);

  try {
    // Run claude and capture output (with 60s timeout)
    // Use spawn with array args to prevent command injection
    const result = await runWithTimeout(['-p', query], 60000);

    // Get first 50 lines of output
    const lines = (result.stdout + result.stderr).split('\n').slice(0, 50);
    const output = lines.join('\n');

    // Check if output contains skill evaluation pattern
    const patterns = [
      /\[RUST-SKILL-EVAL\]/i,
      /(YES|NO)[ :-]/i,
      /Skill\(/,
      /skill.*:/i,
      /m0[1-7]-/,
      /unsafe-checker/,
      /coding-guidelines/,
      /rust-learner/,
      /rust-router/,
      /domain-/
    ];

    const hookTriggered = patterns.some(pattern => pattern.test(output));

    if (hookTriggered) {
      console.log(`${colors.GREEN}HOOK TRIGGERED${colors.NC}`);

      // Check if the expected skill was mentioned
      if (output.toLowerCase().includes(expectedSkill.toLowerCase())) {
        console.log(`  └─ ${colors.GREEN}✓ ${expectedSkill} evaluated${colors.NC}`);
        PASS++;
      } else {
        console.log(`  └─ ${colors.YELLOW}? ${expectedSkill} not explicitly mentioned${colors.NC}`);
        PASS++;  // Hook still worked
      }
    } else {
      console.log(`${colors.RED}HOOK NOT TRIGGERED${colors.NC}`);
      console.log('  First 300 chars of response:');
      console.log(output.substring(0, 300));
      console.log('');
      FAIL++;
    }

    // Show full output in verbose mode
    if (VERBOSE) {
      console.log('  --- Full output ---');
      console.log(output);
      console.log('  -------------------');
    }
    console.log('');

  } catch (error) {
    console.log(`${colors.RED}ERROR: ${error.message}${colors.NC}`);
    FAIL++;
    console.log('');
  }
}

/**
 * Main function
 */
async function main() {
  console.log('=== Rust Skills Forced Eval Hook Tests ===');
  console.log('');
  console.log('Testing if hook triggers and Claude evaluates skills...');
  console.log('');

  // Parse arguments
  parseArgs();

  console.log('--- Testing Hook Activation ---');
  console.log('');

  // Run tests
  if (SINGLE_TEST) {
    // Single test
    await testHook(SINGLE_TEST, 'any-skill');
  } else {
    // All tests
    await testHook('E0382 错误怎么解决', 'm01-ownership');
    await testHook('Arc 和 Rc 什么区别', 'm02-resource');
    await testHook('async await 怎么用', 'm07-concurrency');
    await testHook('unsafe 代码怎么写安全', 'unsafe-checker');
  }

  // Summary
  console.log('=== Summary ===');
  console.log(`Hook Triggered: ${colors.GREEN}${PASS}${colors.NC}`);
  console.log(`Hook Failed: ${colors.RED}${FAIL}${colors.NC}`);
  console.log('');

  if (FAIL > 0) {
    console.log(`${colors.YELLOW}Some hooks didn't trigger. Check:${colors.NC}`);
    console.log('  1. Is this a new Claude session? (restart if needed)');
    console.log('  2. Is .claude/settings.local.json configured?');
    console.log('  3. Is .claude/hooks/rust-skill-eval-hook.sh executable?');
    process.exit(1);
  } else {
    console.log(`${colors.GREEN}All hooks triggered successfully!${colors.NC}`);
    process.exit(0);
  }
}

// Run the script
main().catch(error => {
  console.error(`${colors.RED}Fatal error: ${error.message}${colors.NC}`);
  console.error(error.stack);
  process.exit(1);
});
