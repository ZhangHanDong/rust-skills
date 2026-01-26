#!/usr/bin/env node
/**
 * Extract documentation from Rust source code
 * Usage: node extract-rust-docs.js [project_path] [output_file]
 *
 * This script extracts:
 * - Crate metadata from Cargo.toml
 * - Module documentation (//!)
 * - Item documentation (///)
 * - Public API signatures
 * - Feature flags
 * - README content
 */

const fs = require('fs');
const path = require('path');
const { execSync, execFileSync } = require('child_process');
const os = require('os');
const { globSync } = require('glob');

// Colors for output
const colors = {
  GREEN: '\x1b[0;32m',
  YELLOW: '\x1b[1;33m',
  RED: '\x1b[0;31m',
  NC: '\x1b[0m'
};

/**
 * Print info message
 */
function info(message) {
  console.log(`${colors.GREEN}[INFO]${colors.NC} ${message}`);
}

/**
 * Print warning message
 */
function warn(message) {
  console.log(`${colors.YELLOW}[WARN]${colors.NC} ${message}`);
}

/**
 * Print error message and exit
 */
function error(message) {
  console.error(`${colors.RED}[ERROR]${colors.NC} ${message}`);
  process.exit(1);
}

/**
 * Parse TOML value (simple string value extraction)
 */
function parseTomlValue(content, key) {
  const regex = new RegExp(`^${key}\\s*=\\s*"([^"]*)"`, 'm');
  const match = content.match(regex);
  return match ? match[1] : null;
}

/**
 * Extract section from TOML content
 */
function extractTomlSection(content, sectionName) {
  const sectionRegex = new RegExp(`^\\[${sectionName}\\]\\s*$`, 'm');
  const match = content.match(sectionRegex);

  if (!match) {
    return null;
  }

  const startIdx = match.index + match[0].length;
  const nextSectionMatch = content.slice(startIdx).match(/^\[/m);
  const endIdx = nextSectionMatch ? startIdx + nextSectionMatch.index : content.length;

  return content.slice(startIdx, endIdx).trim();
}

/**
 * Try to generate rustdoc JSON
 */
function tryRustdocJson(projectPath) {
  info('Attempting rustdoc JSON generation...');

  try {
    // Check if nightly is available
    execSync('cargo +nightly --version', { stdio: 'pipe' });

    // Try to generate rustdoc JSON
    execSync(
      'cargo +nightly rustdoc -- -Z unstable-options --output-format json',
      {
        cwd: projectPath,
        stdio: 'pipe'
      }
    );

    // Find generated JSON file
    const targetDocPath = path.join(projectPath, 'target', 'doc');
    if (fs.existsSync(targetDocPath)) {
      const jsonFiles = globSync('*.json', { cwd: targetDocPath });
      if (jsonFiles.length > 0) {
        const jsonFile = path.join(targetDocPath, jsonFiles[0]);
        info(`rustdoc JSON generated: ${jsonFile}`);
        return jsonFile;
      }
    }

    return null;
  } catch (err) {
    warn('rustdoc JSON generation failed, falling back to source parsing');
    return null;
  }
}

/**
 * Extract documentation from source code
 */
function extractFromSource(projectPath, crateName, crateVersion, crateDesc) {
  const srcDir = path.join(projectPath, 'src');

  if (!fs.existsSync(srcDir) || !fs.statSync(srcDir).isDirectory()) {
    warn('No src directory found');
    return null;
  }

  let output = '';

  // Header
  output += `# ${crateName}\n\n`;

  if (crateDesc) {
    output += `> ${crateDesc}\n\n`;
  }

  output += `**Version:** ${crateVersion} | **Source:** local\n\n`;
  output += '---\n\n';

  // =====================================
  // README Overview
  // =====================================
  const readmePath = path.join(projectPath, 'README.md');
  if (fs.existsSync(readmePath)) {
    output += '## Overview\n\n';

    const readme = fs.readFileSync(readmePath, 'utf8');
    const lines = readme.split('\n');

    // Extract first section (up to first ## or 100 lines)
    let firstSection = [];
    for (let i = 0; i < Math.min(lines.length, 100); i++) {
      if (i > 0 && lines[i].startsWith('##')) {
        break;
      }
      firstSection.push(lines[i]);
    }

    output += firstSection.join('\n') + '\n\n';
    output += '---\n\n';
  }

  // =====================================
  // Crate-level documentation
  // =====================================
  const libPath = path.join(srcDir, 'lib.rs');
  if (fs.existsSync(libPath)) {
    const libContent = fs.readFileSync(libPath, 'utf8');
    const crateDocLines = libContent.split('\n')
      .filter(line => line.startsWith('//!'))
      .map(line => line.replace(/^\/\/!\s?/, ''));

    if (crateDocLines.length > 0) {
      output += '## Crate Documentation\n\n';
      output += crateDocLines.join('\n') + '\n\n';
      output += '---\n\n';
    }
  }

  // =====================================
  // Modules
  // =====================================
  output += '## Modules\n\n';

  const rsFiles = globSync('**/*.rs', { cwd: srcDir }).sort();

  rsFiles.forEach(relPath => {
    // Skip lib.rs and main.rs at top level
    if (relPath === 'lib.rs' || relPath === 'main.rs') {
      return;
    }

    const modName = path.basename(relPath, '.rs');
    const fullPath = path.join(srcDir, relPath);
    const content = fs.readFileSync(fullPath, 'utf8');

    const modDocLines = content.split('\n')
      .filter(line => line.startsWith('//!'))
      .slice(0, 10)
      .map(line => line.replace(/^\/\/!\s?/, ''));

    if (modDocLines.length > 0) {
      output += `### ${modName}\n\n`;
      output += modDocLines.join('\n') + '\n\n';
    }
  });

  output += '---\n\n';

  // =====================================
  // Public API
  // =====================================
  output += '## Public API\n\n';

  // Collect all .rs files content
  let allSourceCode = '';
  rsFiles.forEach(relPath => {
    const fullPath = path.join(srcDir, relPath);
    allSourceCode += fs.readFileSync(fullPath, 'utf8') + '\n';
  });

  // Extract structs
  output += '### Structs\n\n```rust\n';
  const structs = allSourceCode.match(/^pub struct.+$/gm) || [];
  output += structs.slice(0, 50).join('\n') + '\n';
  output += '```\n\n';

  // Extract enums
  output += '### Enums\n\n```rust\n';
  const enums = allSourceCode.match(/^pub enum.+$/gm) || [];
  output += enums.slice(0, 30).join('\n') + '\n';
  output += '```\n\n';

  // Extract traits
  output += '### Traits\n\n```rust\n';
  const traits = allSourceCode.match(/^pub trait.+$/gm) || [];
  output += traits.slice(0, 20).join('\n') + '\n';
  output += '```\n\n';

  // Extract functions
  output += '### Functions\n\n```rust\n';
  const functions = allSourceCode.match(/^pub (?:async )?fn.+$/gm) || [];
  output += functions.slice(0, 50).join('\n') + '\n';
  output += '```\n\n';

  // Extract type aliases
  output += '### Type Aliases\n\n```rust\n';
  const types = allSourceCode.match(/^pub type.+$/gm) || [];
  output += types.slice(0, 20).join('\n') + '\n';
  output += '```\n\n';

  output += '---\n\n';

  // =====================================
  // Feature Flags
  // =====================================
  const cargoToml = fs.readFileSync(path.join(projectPath, 'Cargo.toml'), 'utf8');
  const features = extractTomlSection(cargoToml, 'features');

  if (features) {
    output += '## Feature Flags\n\n```toml\n';
    output += features.split('\n').slice(0, 50).join('\n') + '\n';
    output += '```\n\n---\n\n';
  }

  // =====================================
  // Dependencies
  // =====================================
  output += '## Dependencies\n\n```toml\n';
  const dependencies = extractTomlSection(cargoToml, 'dependencies');
  if (dependencies) {
    output += dependencies.split('\n').slice(0, 30).join('\n') + '\n';
  }
  output += '```\n\n---\n\n';

  // =====================================
  // Source Structure
  // =====================================
  output += '## Source Structure\n\n```\n';

  // Try tree command, fallback to simple list
  try {
    // Use execFileSync to prevent command injection
    const tree = execFileSync('tree', ['-L', '3', srcDir], {
      encoding: 'utf8',
      stdio: 'pipe'
    });
    output += tree;
  } catch {
    // Fallback to simple file list (tree command might not exist)
    const files = rsFiles.slice(0, 30);
    output += files.join('\n') + '\n';
  }

  output += '```\n\n';

  // =====================================
  // Code Examples from docs
  // =====================================
  output += '## Code Examples\n\n';

  // Extract code blocks from doc comments
  const codeBlockMatches = allSourceCode.match(/\/\/\/ ```[\s\S]*?\/\/\/ ```/g) || [];
  const examples = codeBlockMatches.slice(0, 5).map(block =>
    block.split('\n').map(line => line.replace(/^\/\/\/ /, '')).join('\n')
  );

  output += examples.join('\n\n') + '\n';

  return output;
}

/**
 * Parse rustdoc JSON
 */
function parseRustdocJson(jsonFile, crateName, crateVersion, crateDesc) {
  try {
    const json = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));

    let output = '';

    // Header
    output += `# ${crateName}\n\n`;

    if (crateDesc) {
      output += `> ${crateDesc}\n\n`;
    }

    output += `**Version:** ${crateVersion} | **Source:** rustdoc JSON\n\n`;
    output += '---\n\n';

    // Extract crate documentation
    output += '## Overview\n\n';
    if (json.index && json.root && json.index[json.root]) {
      const rootDocs = json.index[json.root].docs || 'No crate-level documentation';
      output += rootDocs + '\n\n';
    }
    output += '---\n\n';

    // Extract public items
    output += '## Public API\n\n';

    // Helper to extract items by kind
    const extractItems = (kind, limit) => {
      const items = [];
      for (const id in json.index) {
        const item = json.index[id];
        if (item.kind === kind && item.visibility === 'public') {
          const docs = item.docs ? item.docs.split('\n')[0] : 'No docs';
          items.push(`- \`${item.name}\`: ${docs}`);
        }
      }
      return items.slice(0, limit);
    };

    // Structs
    output += '### Structs\n\n';
    output += extractItems('struct', 30).join('\n') + '\n\n';

    // Enums
    output += '### Enums\n\n';
    output += extractItems('enum', 20).join('\n') + '\n\n';

    // Traits
    output += '### Traits\n\n';
    output += extractItems('trait', 20).join('\n') + '\n\n';

    // Functions
    output += '### Functions\n\n';
    output += extractItems('function', 30).join('\n') + '\n\n';

    return output;
  } catch (err) {
    warn(`Failed to parse rustdoc JSON: ${err.message}`);
    return null;
  }
}

/**
 * Validate and resolve project path
 * Ensures it's a valid Rust project and not a malicious path
 */
function validateProjectPath(inputPath) {
  // Resolve to absolute path
  const resolvedPath = path.resolve(inputPath || '.');

  // Check if Cargo.toml exists (validates it's a Rust project)
  const cargoTomlPath = path.join(resolvedPath, 'Cargo.toml');
  if (!fs.existsSync(cargoTomlPath)) {
    error(`No Cargo.toml found at ${resolvedPath}`);
    error('Please provide a valid Rust project directory');
    process.exit(1);
  }

  // Additional safety: ensure it's a directory
  if (!fs.statSync(resolvedPath).isDirectory()) {
    error(`${resolvedPath} is not a directory`);
    process.exit(1);
  }

  return resolvedPath;
}

/**
 * Main function
 */
function main() {
  // Parse arguments
  const args = process.argv.slice(2);
  const projectPath = validateProjectPath(args[0]);
  let outputFile = args[1] || '';

  // Cargo.toml path (already validated in validateProjectPath)
  const cargoTomlPath = path.join(projectPath, 'Cargo.toml');

  // Parse crate metadata
  const cargoToml = fs.readFileSync(cargoTomlPath, 'utf8');
  const crateName = parseTomlValue(cargoToml, 'name');
  const crateVersion = parseTomlValue(cargoToml, 'version');
  const crateDesc = parseTomlValue(cargoToml, 'description');

  if (!crateName) {
    error('Could not parse crate name from Cargo.toml');
  }

  // Set output file if not specified
  if (!outputFile) {
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z/, '').replace('T', '');
    const tmpDir = path.join(os.homedir(), 'tmp');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    outputFile = path.join(tmpDir, `${timestamp}-${crateName}-llms.txt`);
  }

  // Ensure output directory exists
  const outputDir = path.dirname(outputFile);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  info(`Extracting documentation for: ${crateName} v${crateVersion}`);
  info(`Output file: ${outputFile}`);

  // Check for workspace
  if (cargoToml.includes('[workspace]')) {
    warn('Workspace detected. Processing root project only.');
    warn('For workspace members, run this script on each member directory.');
  }

  // Try rustdoc JSON first
  let output = null;
  const jsonFile = tryRustdocJson(projectPath);

  if (jsonFile && fs.existsSync(jsonFile)) {
    output = parseRustdocJson(jsonFile, crateName, crateVersion, crateDesc);
    if (output) {
      info('Generated llms.txt from rustdoc JSON');
    }
  }

  // Fallback to source parsing
  if (!output) {
    output = extractFromSource(projectPath, crateName, crateVersion, crateDesc);
    if (!output) {
      error('Failed to extract documentation from source');
    }
  }

  // Write output
  fs.writeFileSync(outputFile, output);

  // Output summary
  console.log('');
  info(`Output saved to: ${outputFile}`);

  const stats = fs.statSync(outputFile);
  const lines = output.split('\n').length;

  info(`File size: ${stats.size} bytes`);
  info(`Line count: ${lines} lines`);
  console.log('');
  console.log('Next steps:');
  console.log(`  /create-skills-via-llms ${crateName} ${outputFile} ${crateVersion}`);
}

// Run the script
try {
  main();
} catch (err) {
  console.error(`${colors.RED}Error: ${err.message}${colors.NC}`);
  console.error(err.stack);
  process.exit(1);
}
