#!/usr/bin/env node
/**
 * Generate index files for rust-skills
 * Run this to rebuild indexes after making changes
 */

const fs = require('fs');
const path = require('path');
const { globSync } = require('glob');
const { parseFrontmatter } = require('./utils/frontmatter');

// Configuration
const ROOT_DIR = path.join(__dirname, '..');
const INDEX_DIR = path.join(ROOT_DIR, 'index');

/**
 * Extract first heading from markdown content
 * @param {string} content - Markdown content
 * @returns {string} First heading text
 */
function extractFirstHeading(content) {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : '';
}

/**
 * Extract Core Question from markdown content
 * @param {string} content - Markdown content
 * @returns {string} Core question text
 */
function extractCoreQuestion(content) {
  // Look for ## Core Question followed by bold text on next line
  const match = content.match(/##\s+Core Question\s+\*\*(.+?)\*\*/s);
  return match ? match[1].trim() : '';
}

/**
 * Generate skills-index.md
 */
function generateSkillsIndex() {
  let output = `# Skills Index

Auto-generated index of all rust-skills.

## Meta-Question Skills (m01-m15)

| ID | Name | Core Question |
|----|------|---------------|
`;

  // Get all m[0-9]* skill directories
  const metaSkills = globSync('skills/m[0-9]*/', { cwd: ROOT_DIR })
    .map(p => path.join(ROOT_DIR, p))
    .filter(p => fs.existsSync(path.join(p, 'SKILL.md')))
    .sort();

  metaSkills.forEach(skillDir => {
    const skillName = path.basename(skillDir);
    const skillFile = path.join(skillDir, 'SKILL.md');
    const { body } = parseFrontmatter(skillFile);

    const title = extractFirstHeading(body);
    const coreQuestion = extractCoreQuestion(body);

    output += `| ${skillName} | ${title} | ${coreQuestion} |\n`;
  });

  output += `
## Core Skills

| Name | Description |
|------|-------------|
`;

  // Get all core-* skill directories
  const coreSkills = globSync('skills/core-*/', { cwd: ROOT_DIR })
    .map(p => path.join(ROOT_DIR, p))
    .filter(p => fs.existsSync(path.join(p, 'SKILL.md')))
    .sort();

  coreSkills.forEach(skillDir => {
    const skillName = path.basename(skillDir);
    const skillFile = path.join(skillDir, 'SKILL.md');
    const { frontmatter } = parseFrontmatter(skillFile);

    const desc = frontmatter.description || '';
    const shortDesc = desc.substring(0, 60) + (desc.length > 60 ? '...' : '');

    output += `| ${skillName} | ${shortDesc} |\n`;
  });

  output += `
## Specialized Skills

| Name | Description |
|------|-------------|
`;

  // Specialized skills
  const specializedSkills = ['unsafe-checker', 'coding-guidelines'];
  specializedSkills.forEach(skillName => {
    const skillFile = path.join(ROOT_DIR, 'skills', skillName, 'SKILL.md');
    if (fs.existsSync(skillFile)) {
      const { frontmatter } = parseFrontmatter(skillFile);
      const desc = frontmatter.description || '';
      const shortDesc = desc.substring(0, 60) + (desc.length > 60 ? '...' : '');

      output += `| ${skillName} | ${shortDesc} |\n`;
    }
  });

  output += `
## Domain Skills

| Name | Focus Area |
|------|------------|
`;

  // Get all domain-* skill directories
  const domainSkills = globSync('skills/domain-*/', { cwd: ROOT_DIR })
    .map(p => path.join(ROOT_DIR, p))
    .filter(p => fs.existsSync(path.join(p, 'SKILL.md')))
    .sort();

  domainSkills.forEach(skillDir => {
    const skillName = path.basename(skillDir);
    const skillFile = path.join(skillDir, 'SKILL.md');
    const { body } = parseFrontmatter(skillFile);

    const title = extractFirstHeading(body);

    output += `| ${skillName} | ${title} |\n`;
  });

  fs.writeFileSync(path.join(INDEX_DIR, 'skills-index.md'), output);
  console.log('Generated: index/skills-index.md');
}

/**
 * Generate agents-index.md
 */
function generateAgentsIndex() {
  let output = `# Agents Index

Auto-generated index of all agents.

| Agent | Model | Tools | Purpose |
|-------|-------|-------|---------|
`;

  const agentFiles = globSync('agents/*.md', { cwd: ROOT_DIR })
    .map(p => path.join(ROOT_DIR, p))
    .sort();

  agentFiles.forEach(agentFile => {
    const agentName = path.basename(agentFile, '.md');
    const content = fs.readFileSync(agentFile, 'utf8');

    // Extract model
    const modelMatch = content.match(/^model:\s*(\S+)/m);
    const model = modelMatch ? modelMatch[1] : 'haiku';

    // Count tools
    const toolMatches = content.match(/^  -\s+/gm);
    const toolCount = toolMatches ? toolMatches.length : 0;

    // Get description (second # heading)
    const headings = content.match(/^#\s+.+$/gm) || [];
    let desc = headings.length > 1 ? headings[1].replace(/^#\s+/, '') : 'Background agent';
    desc = desc.substring(0, 40);

    output += `| ${agentName} | ${model} | ${toolCount} | ${desc} |\n`;
  });

  fs.writeFileSync(path.join(INDEX_DIR, 'agents-index.md'), output);
  console.log('Generated: index/agents-index.md');
}

/**
 * Generate triggers-index.md
 */
function generateTriggersIndex() {
  let output = `# Trigger Keywords Index

Keywords that trigger each skill.

`;

  // Get all m[0-9]* skill directories
  const metaSkills = globSync('skills/m[0-9]*/', { cwd: ROOT_DIR })
    .map(p => path.join(ROOT_DIR, p))
    .filter(p => fs.existsSync(path.join(p, 'SKILL.md')))
    .sort();

  metaSkills.forEach(skillDir => {
    const skillName = path.basename(skillDir);
    const skillFile = path.join(skillDir, 'SKILL.md');
    const { frontmatter } = parseFrontmatter(skillFile);

    output += `## ${skillName}\n\n`;

    // Extract description lines
    const desc = frontmatter.description || '';
    const descLines = desc.split('\n').slice(0, 5);
    output += descLines.join('\n') + '\n\n';
  });

  fs.writeFileSync(path.join(INDEX_DIR, 'triggers-index.md'), output);
  console.log('Generated: index/triggers-index.md');
}

/**
 * Generate commands-index.md
 */
function generateCommandsIndex() {
  let output = `# Commands Index

Available slash commands.

| Command | Usage | Description |
|---------|-------|-------------|
`;

  const commandFiles = globSync('commands/*.md', { cwd: ROOT_DIR })
    .map(p => path.join(ROOT_DIR, p))
    .sort();

  commandFiles.forEach(cmdFile => {
    const cmdName = path.basename(cmdFile, '.md');
    const content = fs.readFileSync(cmdFile, 'utf8');

    // Extract usage (line after "## Usage")
    const usageMatch = content.match(/## Usage\s+```[a-z]*\s+(.+?)\s+```/s);
    const usage = usageMatch ? usageMatch[1].trim().replace(/\n/g, ' ') : '';

    // Extract description (first uppercase line)
    const descMatch = content.match(/^[A-Z].+$/m);
    const desc = descMatch ? descMatch[0].substring(0, 40) + '...' : '';

    output += `| /${cmdName} | \`${usage}\` | ${desc} |\n`;
  });

  fs.writeFileSync(path.join(INDEX_DIR, 'commands-index.md'), output);
  console.log('Generated: index/commands-index.md');
}

/**
 * Main function
 */
function main() {
  console.log('Generating rust-skills indexes...\n');

  // Create index directory if it doesn't exist
  if (!fs.existsSync(INDEX_DIR)) {
    fs.mkdirSync(INDEX_DIR, { recursive: true });
  }

  generateSkillsIndex();
  generateAgentsIndex();
  generateTriggersIndex();
  generateCommandsIndex();

  console.log('\nIndex generation complete!');
  console.log('Generated files:');

  const indexFiles = globSync('*.md', { cwd: INDEX_DIR });
  indexFiles.forEach(file => {
    const filePath = path.join(INDEX_DIR, file);
    const stats = fs.statSync(filePath);
    console.log(`  ${file} (${stats.size} bytes)`);
  });
}

// Run the script
try {
  main();
} catch (error) {
  console.error(`Error: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
}
