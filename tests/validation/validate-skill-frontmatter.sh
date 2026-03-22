#!/bin/bash
# Validate that every skill declares required frontmatter fields and parses as YAML.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

FAILED=0
COUNT=0

if ! command -v ruby >/dev/null 2>&1; then
    echo "FAIL: ruby is required to parse SKILL.md frontmatter"
    exit 1
fi

echo "======================================"
echo "Rust Skills Frontmatter Validation"
echo "======================================"
echo ""

while IFS= read -r -d '' skill_file; do
    COUNT=$((COUNT + 1))
    relative_file="${skill_file#"$ROOT_DIR"/}"

    if ! error_output=$(ruby -e '
        require "yaml"
        path = ARGV.fetch(0)
        begin
          text = File.read(path)
          parts = text.split(/^---\s*$\n?/, 3)
          raise "missing frontmatter delimiters" if parts.length < 3
          data = YAML.safe_load(parts[1], permitted_classes: [], aliases: false)
          raise "frontmatter must be a mapping" unless data.is_a?(Hash)
          %w[name description].each do |key|
            value = data[key]
            raise "missing #{key}" if value.nil? || value.to_s.strip.empty?
          end
        rescue StandardError => e
          warn e.message
          exit 1
        end
      ' "$skill_file" 2>&1); then
        echo "FAIL: $relative_file has invalid or incomplete YAML frontmatter: $error_output"
        FAILED=1
    fi
done < <(find "$ROOT_DIR/skills" -name "SKILL.md" -type f -print0)

if [ "$COUNT" -eq 0 ]; then
    echo "FAIL: no SKILL.md files found under skills/"
    exit 1
fi

if [ "$FAILED" -ne 0 ]; then
    echo ""
    echo "Frontmatter validation FAILED"
    exit 1
fi

echo "Validated $COUNT skill files."
echo "Frontmatter validation PASSED"
