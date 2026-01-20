#!/bin/bash
# Extract documentation from Rust source code
# Usage: ./extract-rust-docs.sh [project_path] [output_file]
#
# This script extracts:
# - Crate metadata from Cargo.toml
# - Module documentation (//!)
# - Item documentation (///)
# - Public API signatures
# - Feature flags
# - README content

set -e

# Arguments
PROJECT_PATH="${1:-.}"
OUTPUT_FILE="${2:-}"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Validate project
if [ ! -f "$PROJECT_PATH/Cargo.toml" ]; then
    error "No Cargo.toml found at $PROJECT_PATH"
fi

# Parse crate name and version
CRATE_NAME=$(grep "^name" "$PROJECT_PATH/Cargo.toml" | head -1 | cut -d'"' -f2)
CRATE_VERSION=$(grep "^version" "$PROJECT_PATH/Cargo.toml" | head -1 | cut -d'"' -f2)
CRATE_DESC=$(grep "^description" "$PROJECT_PATH/Cargo.toml" | head -1 | cut -d'"' -f2)

if [ -z "$CRATE_NAME" ]; then
    error "Could not parse crate name from Cargo.toml"
fi

# Set output file if not specified
if [ -z "$OUTPUT_FILE" ]; then
    TIMESTAMP=$(date +%Y%m%d%H%M)
    OUTPUT_FILE="$HOME/tmp/${TIMESTAMP}-${CRATE_NAME}-llms.txt"
fi

# Ensure output directory exists
mkdir -p "$(dirname "$OUTPUT_FILE")"

info "Extracting documentation for: $CRATE_NAME v$CRATE_VERSION"
info "Output file: $OUTPUT_FILE"

# =====================================
# Try rustdoc JSON first
# =====================================
try_rustdoc_json() {
    info "Attempting rustdoc JSON generation..."

    cd "$PROJECT_PATH"

    if cargo +nightly rustdoc -- -Z unstable-options --output-format json 2>/dev/null; then
        JSON_FILE=$(find target/doc -name "*.json" -type f | head -1)
        if [ -n "$JSON_FILE" ] && [ -f "$JSON_FILE" ]; then
            info "rustdoc JSON generated: $JSON_FILE"
            echo "$JSON_FILE"
            return 0
        fi
    fi

    warn "rustdoc JSON generation failed, falling back to source parsing"
    return 1
}

# =====================================
# Source code parsing fallback
# =====================================
extract_from_source() {
    local src_dir="$PROJECT_PATH/src"

    if [ ! -d "$src_dir" ]; then
        warn "No src directory found"
        return 1
    fi

    # Start output
    {
        echo "# $CRATE_NAME"
        echo ""

        if [ -n "$CRATE_DESC" ]; then
            echo "> $CRATE_DESC"
            echo ""
        fi

        echo "**Version:** $CRATE_VERSION | **Source:** local"
        echo ""
        echo "---"
        echo ""

        # =====================================
        # README Overview
        # =====================================
        if [ -f "$PROJECT_PATH/README.md" ]; then
            echo "## Overview"
            echo ""
            # Extract first section (up to first ## or 100 lines)
            head -100 "$PROJECT_PATH/README.md" | sed -n '1,/^##/p' | head -n -1
            echo ""
            echo "---"
            echo ""
        fi

        # =====================================
        # Crate-level documentation
        # =====================================
        if [ -f "$src_dir/lib.rs" ]; then
            crate_docs=$(grep "^//!" "$src_dir/lib.rs" 2>/dev/null | sed 's/^\/\/! //' | sed 's/^\/\/!//')
            if [ -n "$crate_docs" ]; then
                echo "## Crate Documentation"
                echo ""
                echo "$crate_docs"
                echo ""
                echo "---"
                echo ""
            fi
        fi

        # =====================================
        # Modules
        # =====================================
        echo "## Modules"
        echo ""

        # Find all mod.rs and *.rs files
        find "$src_dir" -name "*.rs" -type f | sort | while read -r rs_file; do
            rel_path="${rs_file#$src_dir/}"
            mod_name=$(basename "$rs_file" .rs)

            # Skip lib.rs and main.rs at top level
            if [ "$rel_path" = "lib.rs" ] || [ "$rel_path" = "main.rs" ]; then
                continue
            fi

            # Get module docs
            mod_docs=$(grep "^//!" "$rs_file" 2>/dev/null | head -10 | sed 's/^\/\/! //' | sed 's/^\/\/!//')

            if [ -n "$mod_docs" ]; then
                echo "### $mod_name"
                echo ""
                echo "$mod_docs"
                echo ""
            fi
        done

        echo "---"
        echo ""

        # =====================================
        # Public API
        # =====================================
        echo "## Public API"
        echo ""

        echo "### Structs"
        echo ""
        echo '```rust'
        grep -rh "^pub struct" "$src_dir" --include="*.rs" 2>/dev/null | head -50 || true
        echo '```'
        echo ""

        echo "### Enums"
        echo ""
        echo '```rust'
        grep -rh "^pub enum" "$src_dir" --include="*.rs" 2>/dev/null | head -30 || true
        echo '```'
        echo ""

        echo "### Traits"
        echo ""
        echo '```rust'
        grep -rh "^pub trait" "$src_dir" --include="*.rs" 2>/dev/null | head -20 || true
        echo '```'
        echo ""

        echo "### Functions"
        echo ""
        echo '```rust'
        grep -rh "^pub fn\|^pub async fn" "$src_dir" --include="*.rs" 2>/dev/null | head -50 || true
        echo '```'
        echo ""

        echo "### Type Aliases"
        echo ""
        echo '```rust'
        grep -rh "^pub type" "$src_dir" --include="*.rs" 2>/dev/null | head -20 || true
        echo '```'
        echo ""

        echo "---"
        echo ""

        # =====================================
        # Feature Flags
        # =====================================
        features=$(grep -A 100 "^\[features\]" "$PROJECT_PATH/Cargo.toml" 2>/dev/null | grep -B 100 "^\[" | grep -v "^\[" | head -50)
        if [ -n "$features" ]; then
            echo "## Feature Flags"
            echo ""
            echo '```toml'
            echo "$features"
            echo '```'
            echo ""
            echo "---"
            echo ""
        fi

        # =====================================
        # Dependencies
        # =====================================
        echo "## Dependencies"
        echo ""
        echo '```toml'
        grep -A 100 "^\[dependencies\]" "$PROJECT_PATH/Cargo.toml" 2>/dev/null | grep -B 100 "^\[" | grep -v "^\[" | head -30 || true
        echo '```'
        echo ""

        echo "---"
        echo ""

        # =====================================
        # Source Structure
        # =====================================
        echo "## Source Structure"
        echo ""
        echo '```'
        if command -v tree &> /dev/null; then
            tree -L 3 "$src_dir" 2>/dev/null || find "$src_dir" -type f -name "*.rs" | head -30
        else
            find "$src_dir" -type f -name "*.rs" | sort | head -30
        fi
        echo '```'
        echo ""

        # =====================================
        # Code Examples from docs
        # =====================================
        echo "## Code Examples"
        echo ""

        # Extract code blocks from doc comments
        grep -rh "/// \`\`\`" -A 20 "$src_dir" --include="*.rs" 2>/dev/null | head -100 | sed 's/^\/\/\/ //' || true

        echo ""

    } > "$OUTPUT_FILE"

    info "Documentation extracted successfully"
}

# =====================================
# Parse rustdoc JSON if available
# =====================================
parse_rustdoc_json() {
    local json_file="$1"

    if ! command -v jq &> /dev/null; then
        warn "jq not installed, cannot parse rustdoc JSON"
        return 1
    fi

    {
        echo "# $CRATE_NAME"
        echo ""

        if [ -n "$CRATE_DESC" ]; then
            echo "> $CRATE_DESC"
            echo ""
        fi

        echo "**Version:** $CRATE_VERSION | **Source:** rustdoc JSON"
        echo ""
        echo "---"
        echo ""

        # Extract crate documentation
        echo "## Overview"
        echo ""
        jq -r '.index[.root].docs // "No crate-level documentation"' "$json_file"
        echo ""
        echo "---"
        echo ""

        # Extract public items
        echo "## Public API"
        echo ""

        # Structs
        echo "### Structs"
        echo ""
        jq -r '.index[] | select(.kind == "struct" and .visibility == "public") | "- `\(.name)`: \(.docs // "No docs" | split("\n")[0])"' "$json_file" 2>/dev/null | head -30
        echo ""

        # Enums
        echo "### Enums"
        echo ""
        jq -r '.index[] | select(.kind == "enum" and .visibility == "public") | "- `\(.name)`: \(.docs // "No docs" | split("\n")[0])"' "$json_file" 2>/dev/null | head -20
        echo ""

        # Traits
        echo "### Traits"
        echo ""
        jq -r '.index[] | select(.kind == "trait" and .visibility == "public") | "- `\(.name)`: \(.docs // "No docs" | split("\n")[0])"' "$json_file" 2>/dev/null | head -20
        echo ""

        # Functions
        echo "### Functions"
        echo ""
        jq -r '.index[] | select(.kind == "function" and .visibility == "public") | "- `\(.name)`: \(.docs // "No docs" | split("\n")[0])"' "$json_file" 2>/dev/null | head -30
        echo ""

    } > "$OUTPUT_FILE"

    info "rustdoc JSON parsed successfully"
}

# =====================================
# Main execution
# =====================================
main() {
    # Check for workspace
    if grep -q "\[workspace\]" "$PROJECT_PATH/Cargo.toml"; then
        warn "Workspace detected. Processing root project only."
        warn "For workspace members, run this script on each member directory."
    fi

    # Try rustdoc JSON first
    JSON_FILE=""
    if JSON_FILE=$(try_rustdoc_json); then
        if parse_rustdoc_json "$JSON_FILE"; then
            info "Generated llms.txt from rustdoc JSON"
        else
            extract_from_source
        fi
    else
        extract_from_source
    fi

    # Output summary
    echo ""
    info "Output saved to: $OUTPUT_FILE"
    info "File size: $(wc -c < "$OUTPUT_FILE" | tr -d ' ') bytes"
    info "Line count: $(wc -l < "$OUTPUT_FILE" | tr -d ' ') lines"
    echo ""
    echo "Next steps:"
    echo "  /create-skills-via-llms $CRATE_NAME $OUTPUT_FILE $CRATE_VERSION"
}

main
