#!/usr/bin/env node
/**
 * Quality check script for rust-skills
 * Run before releases to ensure consistency
 */

const fs = require('fs');
const path = require('path');
const { globSync } = require('glob');
const { parseFrontmatter } = require('./utils/frontmatter');

// Configuration
const ROOT_DIR = path.join(__dirname, '..');

// Colors
const colors = {
  GREEN: '\x1b[0;32m',
  RED: '\x1b[0;31m',
  YELLOW: '\x1b[1;33m',
  NC: '\x1b[0m'
};

let ERRORS = 0;
let WARNINGS = 0;

/**
 * Print error message
 */
function error(message) {
  console.log(`${colors.RED}ERROR:${colors.NC} ${message}`);
  ERRORS++;
}

/**
 * Print warning message
 */
function warn(message) {
  console.log(`${colors.YELLOW}WARN:${colors.NC} ${message}`);
  WARNINGS++;
}

/**
 * Print success message
 */
function pass(message) {
  console.log(`${colors.GREEN}OK:${colors.NC} ${message}`);
}

/**
 * Extract markdown links from content
 */
function extractMarkdownLinks(content) {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const links = [];
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
    links.push({
      text: match[1],
      url: match[2]
    });
  }

  return links;
}

/**
 * Check if a link is external or anchor
 */
function isExternalOrAnchor(url) {
  return url.startsWith('http://') ||
         url.startsWith('https://') ||
         url.startsWith('#');
}

/**
 * Main quality check function
 */
function main() {
  console.log('======================================');
  console.log('Rust Skills Quality Check');
  console.log('======================================');
  console.log('');

  // =====================================
  // 1. Check SKILL.md Frontmatter
  // =====================================
  console.log('Checking SKILL.md frontmatter...');

  const skillFiles = globSync('skills/*/SKILL.md', { cwd: ROOT_DIR });

  skillFiles.forEach(skillPath => {
    const fullPath = path.join(ROOT_DIR, skillPath);
    const skillName = path.basename(path.dirname(skillPath));

    const { frontmatter, body } = parseFrontmatter(fullPath);

    // Check for required fields
    if (!frontmatter.name) {
      error(`${skillName}/SKILL.md missing 'name:' field`);
    }

    // core-* skills may intentionally omit description (internal tools)
    if (!frontmatter.description) {
      if (skillName.startsWith('core-')) {
        // Check if there's a comment explaining why
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('no description') || content.includes('Internal tool')) {
          // This is intentional, just note it
          console.log(`  INFO: ${skillName}/SKILL.md intentionally has no description (internal tool)`);
        } else {
          warn(`${skillName}/SKILL.md missing 'description:' field`);
        }
      } else {
        error(`${skillName}/SKILL.md missing 'description:' field`);
      }
    }

    // Check description has trigger words (length check as proxy)
    if (frontmatter.description && frontmatter.description.length < 50) {
      warn(`${skillName}/SKILL.md description may be too short for triggering`);
    }
  });

  console.log('');

  // =====================================
  // 2. Check Agent Tool Declarations
  // =====================================
  console.log('Checking agent tool declarations...');

  const agentFiles = globSync('agents/*.md', { cwd: ROOT_DIR });

  agentFiles.forEach(agentPath => {
    const fullPath = path.join(ROOT_DIR, agentPath);
    const agentName = path.basename(agentPath, '.md');
    const content = fs.readFileSync(fullPath, 'utf8');
    const normalizedContent = content.replace(/\r\n/g, '\n');

    // Check if this is a frontmatter-style agent (starts with ---)
    const hasFrontmatter = normalizedContent.trim().startsWith('---');

    if (hasFrontmatter) {
      // Frontmatter-style agent should have tools and model
      if (!normalizedContent.match(/^tools:/m)) {
        error(`${agentName} agent missing 'tools:' declaration`);
      }

      if (!normalizedContent.match(/^model:/m)) {
        warn(`${agentName} agent missing 'model:' declaration`);
      }
    } else {
      // Non-frontmatter agent - check it has basic structure
      if (!normalizedContent.match(/^# /m)) {
        warn(`${agentName} agent missing markdown heading`);
      }
      // These agents document their usage differently - don't check for frontmatter fields
      console.log(`  INFO: ${agentName} uses documentation format (not frontmatter)`);
    }
  });

  console.log('');

  // =====================================
  // 3. Check for Dead Links in Skills
  // =====================================
  console.log('Checking for dead internal links...');

  const allMarkdownFiles = globSync('skills/**/*.md', { cwd: ROOT_DIR });

  allMarkdownFiles.forEach(mdPath => {
    const fullPath = path.join(ROOT_DIR, mdPath);
    const content = fs.readFileSync(fullPath, 'utf8');
    const links = extractMarkdownLinks(content);

    links.forEach(link => {
      // Skip external links and anchors
      if (isExternalOrAnchor(link.url)) {
        return;
      }

      // Resolve relative path
      const dir = path.dirname(fullPath);
      const linkPath = path.join(dir, link.url);

      if (!fs.existsSync(linkPath)) {
        warn(`Dead link in ${path.basename(mdPath)}: ${link.url}`);
      }
    });
  });

  console.log('');

  // =====================================
  // 4. Check Version Consistency
  // =====================================
  console.log('Checking version consistency...');

  const versionFile = path.join(ROOT_DIR, 'VERSION');
  const metadataFile = path.join(ROOT_DIR, 'metadata.json');

  if (fs.existsSync(versionFile) && fs.existsSync(metadataFile)) {
    const version = fs.readFileSync(versionFile, 'utf8').trim();

    let metadata;
    try {
      metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf8'));
    } catch (parseErr) {
      error(`Failed to parse metadata.json: ${parseErr.message}`);
      return;
    }

    const metadataVersion = metadata.version;

    if (version !== metadataVersion) {
      error(`Version mismatch: VERSION=${version}, metadata.json=${metadataVersion}`);
    } else {
      pass(`Version consistent: ${version}`);
    }
  } else {
    warn('Missing VERSION or metadata.json');
  }

  console.log('');

  // =====================================
  // 5. Check Required Directories
  // =====================================
  console.log('Checking required directories...');

  const requiredDirs = [
    'skills',
    'agents',
    'commands',
    'cache',
    'tests',
    'templates'
  ];

  requiredDirs.forEach(dir => {
    const dirPath = path.join(ROOT_DIR, dir);
    if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
      const fileCount = globSync('**/*', { cwd: dirPath, nodir: true }).length;
      pass(`${dir}/ exists (${fileCount} files)`);
    } else {
      error(`${dir}/ missing`);
    }
  });

  console.log('');

  // =====================================
  // 6. Check Skill Count Matches Metadata
  // =====================================
  console.log('Checking skill counts...');

  if (fs.existsSync(metadataFile)) {
    const metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf8'));

    // Meta skills count
    if (metadata.meta_skills !== undefined) {
      const expectedMeta = metadata.meta_skills;
      const actualMeta = globSync('skills/m[0-9]*/', { cwd: ROOT_DIR }).length;

      if (expectedMeta === actualMeta) {
        pass(`Meta skills count: ${actualMeta}`);
      } else {
        warn(`Meta skills: expected ${expectedMeta}, found ${actualMeta}`);
      }
    }

    // Unsafe rules count
    if (metadata.unsafe_rules !== undefined) {
      const expectedUnsafe = metadata.unsafe_rules;
      const rulesPath = path.join(ROOT_DIR, 'skills', 'unsafe-checker', 'rules');
      let actualUnsafe = 0;

      if (fs.existsSync(rulesPath)) {
        actualUnsafe = globSync('*.md', { cwd: rulesPath })
          .filter(f => !f.startsWith('_')).length;
      }

      if (expectedUnsafe === actualUnsafe) {
        pass(`Unsafe rules count: ${actualUnsafe}`);
      } else {
        warn(`Unsafe rules: expected ${expectedUnsafe}, found ${actualUnsafe}`);
      }
    }
  }

  console.log('');

  // =====================================
  // Summary
  // =====================================
  console.log('======================================');
  console.log('Quality Check Summary');
  console.log('======================================');
  console.log(`Errors:   ${colors.RED}${ERRORS}${colors.NC}`);
  console.log(`Warnings: ${colors.YELLOW}${WARNINGS}${colors.NC}`);
  console.log('');

  if (ERRORS > 0) {
    console.log(`${colors.RED}Quality check FAILED${colors.NC}`);
    process.exit(1);
  } else if (WARNINGS > 0) {
    console.log(`${colors.YELLOW}Quality check PASSED with warnings${colors.NC}`);
    process.exit(0);
  } else {
    console.log(`${colors.GREEN}Quality check PASSED${colors.NC}`);
    process.exit(0);
  }
}

// Run the script
try {
  main();
} catch (err) {
  console.error(`${colors.RED}Error: ${err.message}${colors.NC}`);
  console.error(err.stack);
  process.exit(1);
}
