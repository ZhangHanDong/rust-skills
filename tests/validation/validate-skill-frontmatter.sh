#!/bin/bash
# Validate that every skill declares required frontmatter fields.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

FAILED=0
COUNT=0

echo "======================================"
echo "Rust Skills Frontmatter Validation"
echo "======================================"
echo ""

while IFS= read -r -d '' skill_file; do
    COUNT=$((COUNT + 1))
    relative_file="${skill_file#"$ROOT_DIR"/}"

    if ! grep -q "^name:" "$skill_file"; then
        echo "FAIL: $relative_file missing name:"
        FAILED=1
    fi

    if ! grep -q "^description:" "$skill_file"; then
        echo "FAIL: $relative_file missing description:"
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
