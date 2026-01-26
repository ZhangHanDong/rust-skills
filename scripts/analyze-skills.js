#!/usr/bin/env node
/**
 * Analyze rust-skills structure and content
 * Provides statistics and insights
 */

const fs = require('fs');
const path = require('path');
const { globSync } = require('glob');
const { parseFrontmatter } = require('./utils/frontmatter');

// Configuration
const ROOT_DIR = path.join(__dirname, '..');

/**
 * Count lines in a file
 * @param {string} filePath - Path to file
 * @returns {number} Number of lines
 */
function countLines(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content.split('\n').length;
  } catch {
    return 0;
  }
}

/**
 * Main analysis function
 */
function main() {
  console.log('======================================');
  console.log('Rust Skills Analysis');
  console.log('======================================');
  console.log('');

  // =====================================
  // Skill Statistics
  // =====================================
  console.log('## Skill Statistics');
  console.log('');

  const metaSkills = globSync('skills/m[0-9]*/', { cwd: ROOT_DIR });
  const metaCount = metaSkills.length;
  console.log(`Meta-Question Skills: ${metaCount}`);

  const coreSkillsPath = path.join(ROOT_DIR, 'skills', 'core');
  let coreCount = 0;
  if (fs.existsSync(coreSkillsPath)) {
    const coreSkills = fs.readdirSync(coreSkillsPath)
      .filter(f => fs.statSync(path.join(coreSkillsPath, f)).isDirectory());
    coreCount = coreSkills.length;
  }
  console.log(`Core Skills: ${coreCount}`);

  const domainsPath = path.join(ROOT_DIR, 'skills', 'domains');
  let domainCount = 0;
  if (fs.existsSync(domainsPath)) {
    const domainSkills = fs.readdirSync(domainsPath)
      .filter(f => fs.statSync(path.join(domainsPath, f)).isDirectory());
    domainCount = domainSkills.length;
  }
  console.log(`Domain Skills: ${domainCount}`);

  console.log('');

  // =====================================
  // Content Statistics
  // =====================================
  console.log('## Content Statistics');
  console.log('');

  // Count markdown files
  const mdFiles = globSync('**/*.md', { cwd: ROOT_DIR });
  const mdCount = mdFiles.length;
  console.log(`Total Markdown Files: ${mdCount}`);

  // Count lines of content
  let totalLines = 0;
  mdFiles.forEach(file => {
    const filePath = path.join(ROOT_DIR, file);
    totalLines += countLines(filePath);
  });
  console.log(`Total Lines of Content: ${totalLines}`);

  // Unsafe rules
  const unsafeRulesPath = path.join(ROOT_DIR, 'skills', 'unsafe-checker', 'rules');
  let unsafeRules = 0;
  if (fs.existsSync(unsafeRulesPath)) {
    unsafeRules = globSync('*.md', { cwd: unsafeRulesPath })
      .filter(f => !f.startsWith('_')).length;
  }
  console.log(`Unsafe Checker Rules: ${unsafeRules}`);

  // Templates
  const templatesPath = path.join(ROOT_DIR, 'templates');
  let templateCount = 0;
  if (fs.existsSync(templatesPath)) {
    templateCount = globSync('**/*.rs', { cwd: templatesPath }).length;
  }
  console.log(`Code Templates: ${templateCount}`);

  console.log('');

  // =====================================
  // Agent Statistics
  // =====================================
  console.log('## Agent Statistics');
  console.log('');

  const agentFiles = globSync('agents/*.md', { cwd: ROOT_DIR });
  const agentCount = agentFiles.length;
  console.log(`Total Agents: ${agentCount}`);

  console.log('Agents:');
  agentFiles.forEach(file => {
    const agentPath = path.join(ROOT_DIR, file);
    const name = path.basename(file, '.md');
    const content = fs.readFileSync(agentPath, 'utf8');

    const modelMatch = content.match(/^model:\s*(\S+)/m);
    const model = modelMatch ? modelMatch[1] : 'default';

    console.log(`  - ${name} (${model})`);
  });

  console.log('');

  // =====================================
  // Deep Dive Content
  // =====================================
  console.log('## Deep Dive Content');
  console.log('');

  console.log('Skills with patterns/ directory:');
  metaSkills.forEach(skillDir => {
    const patternsPath = path.join(ROOT_DIR, skillDir, 'patterns');
    if (fs.existsSync(patternsPath)) {
      const skillName = path.basename(skillDir);
      const patternFiles = globSync('*.md', { cwd: patternsPath });
      console.log(`  - ${skillName}: ${patternFiles.length} files`);
    }
  });

  console.log('');
  console.log('Skills with examples/ directory:');
  metaSkills.forEach(skillDir => {
    const examplesPath = path.join(ROOT_DIR, skillDir, 'examples');
    if (fs.existsSync(examplesPath)) {
      const skillName = path.basename(skillDir);
      const exampleFiles = globSync('*.md', { cwd: examplesPath });
      console.log(`  - ${skillName}: ${exampleFiles.length} files`);
    }
  });

  console.log('');

  // =====================================
  // Trigger Coverage
  // =====================================
  console.log('## Trigger Coverage Analysis');
  console.log('');

  console.log('Extracting trigger keywords...');
  let allKeywords = '';

  const skillFiles = globSync('skills/*/SKILL.md', { cwd: ROOT_DIR });
  skillFiles.forEach(file => {
    const skillPath = path.join(ROOT_DIR, file);
    const { frontmatter } = parseFrontmatter(skillPath);
    if (frontmatter.description) {
      allKeywords += ' ' + frontmatter.description;
    }
  });

  // Count unique error codes
  const errorCodes = allKeywords.match(/E\d{4}/g) || [];
  const uniqueErrors = new Set(errorCodes);

  // Count Chinese characters (approximation)
  const chineseChars = allKeywords.match(/[\u4e00-\u9fff]+/g) || [];
  const uniqueChinese = new Set(chineseChars);

  console.log('Top trigger categories:');
  console.log(`  - Error codes (E0xxx): ${uniqueErrors.size} unique`);
  console.log(`  - Chinese triggers: ${uniqueChinese.size} phrases`);
  console.log('  - Crate names: Multiple (tokio, serde, axum, etc.)');

  console.log('');

  // =====================================
  // Test Coverage
  // =====================================
  console.log('## Test Coverage');
  console.log('');

  const scenariosPath = path.join(ROOT_DIR, 'tests', 'scenarios');
  if (fs.existsSync(scenariosPath)) {
    const scenarioFiles = globSync('*.md', { cwd: scenariosPath });
    console.log(`Test Scenario Files: ${scenarioFiles.length}`);

    let totalTests = 0;
    scenarioFiles.forEach(file => {
      const filePath = path.join(scenariosPath, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const matches = content.match(/^### Test/gm);
      totalTests += matches ? matches.length : 0;
    });
    console.log(`Total Test Cases: ${totalTests}`);
  } else {
    console.log('No test scenarios found');
  }

  console.log('');

  // =====================================
  // Cache Status
  // =====================================
  console.log('## Cache Status');
  console.log('');

  const cachePath = path.join(ROOT_DIR, 'cache');
  if (fs.existsSync(cachePath)) {
    console.log('Cache directories:');
    const cacheDirs = fs.readdirSync(cachePath)
      .filter(f => fs.statSync(path.join(cachePath, f)).isDirectory());

    cacheDirs.forEach(dir => {
      const dirPath = path.join(cachePath, dir);
      const fileCount = globSync('**/*', { cwd: dirPath, nodir: true }).length;
      console.log(`  - ${dir}: ${fileCount} entries`);
    });
  } else {
    console.log('Cache not initialized');
  }

  console.log('');

  // =====================================
  // Summary
  // =====================================
  console.log('======================================');
  console.log('Summary');
  console.log('======================================');
  console.log('');

  const totalSkills = metaCount + coreCount + domainCount + 2; // +2 for specialized
  console.log(`Total Skills: ${totalSkills}`);
  console.log(`Total Agents: ${agentCount}`);
  console.log(`Total Content: ${mdCount} files, ${totalLines} lines`);
  console.log('');
}

// Run the script
try {
  main();
} catch (error) {
  console.error(`Error: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
}
