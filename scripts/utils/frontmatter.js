/**
 * Shared utility for parsing frontmatter from markdown files
 */

const fs = require('fs');

/**
 * Parse YAML-style frontmatter from a markdown file
 * @param {string} filePath - Absolute path to the markdown file
 * @returns {{ frontmatter: Object, content: string, body: string }} Parsed result
 */
function parseFrontmatter(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');

    // Normalize line endings (CRLF -> LF) for consistent parsing
    const normalizedContent = content.replace(/\r\n/g, '\n');
    const lines = normalizedContent.split('\n');

    const result = {
      frontmatter: {},
      content: normalizedContent,
      body: ''
    };

    // Check for frontmatter delimiter
    if (lines[0] === '---') {
      let i = 1;
      const fmLines = [];

      // Collect lines until closing delimiter
      while (i < lines.length && lines[i] !== '---') {
        fmLines.push(lines[i]);
        i++;
      }

      // Parse key-value pairs
      fmLines.forEach(line => {
        const match = line.match(/^(\w[\w-]*)\s*:\s*(.*)$/);
        if (match) {
          const key = match[1];
          let value = match[2].trim();

          // Remove surrounding quotes
          if ((value.startsWith('"') && value.endsWith('"')) ||
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }

          result.frontmatter[key] = value;
        }
      });

      // Body is everything after closing delimiter
      result.body = lines.slice(i + 1).join('\n');
    } else {
      // No frontmatter, entire content is body
      result.body = normalizedContent;
    }

    return result;
  } catch (error) {
    // Return empty result on error
    console.warn(`Warning: Could not read ${filePath}: ${error.message}`);
    return {
      frontmatter: {},
      content: '',
      body: ''
    };
  }
}

module.exports = { parseFrontmatter };
