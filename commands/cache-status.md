---
description: Show Rust docs cache status
argument-hint: "[--verbose]"
---

# Cache Status

Show the status of cached Rust documentation.

Arguments: $ARGUMENTS
- `--verbose`: Show detailed file list

---

## Instructions

### 1. Check Cache Directory

```bash
CACHE_DIR="$HOME/.claude/cache/rust-docs"

if [ ! -d "$CACHE_DIR" ]; then
    echo "No cache directory found at: $CACHE_DIR"
    exit 0
fi
```

### 2. Collect Statistics

```bash
# Count files and size by category
echo "=== Rust Docs Cache Status ==="
echo ""
echo "Location: $CACHE_DIR"
echo ""

for category in std docs.rs releases.rs lib.rs clippy; do
    if [ -d "$CACHE_DIR/$category" ]; then
        count=$(find "$CACHE_DIR/$category" -name "*.json" | wc -l | tr -d ' ')
        size=$(du -sh "$CACHE_DIR/$category" 2>/dev/null | cut -f1)

        # Count expired
        expired=0
        now=$(date -u +%Y-%m-%dT%H:%M:%SZ)
        for f in $(find "$CACHE_DIR/$category" -name "*.json"); do
            exp=$(jq -r '.meta.expires_at' "$f" 2>/dev/null)
            if [[ "$exp" < "$now" ]]; then
                ((expired++))
            fi
        done

        echo "$category: $count items, $size (expired: $expired)"
    fi
done

echo ""
total=$(find "$CACHE_DIR" -name "*.json" | wc -l | tr -d ' ')
total_size=$(du -sh "$CACHE_DIR" 2>/dev/null | cut -f1)
echo "Total: $total items, $total_size"
```

### 3. Verbose Mode

If `--verbose` flag is set:

```bash
echo ""
echo "=== Cached Items ==="
for f in $(find "$CACHE_DIR" -name "*.json" -type f | sort); do
    rel_path=${f#$CACHE_DIR/}
    exp=$(jq -r '.meta.expires_at' "$f" 2>/dev/null)
    now=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    if [[ "$exp" < "$now" ]]; then
        status="[EXPIRED]"
    else
        status="[valid]"
    fi
    echo "$status $rel_path (expires: $exp)"
done
```

---

## Output Format

```
=== Rust Docs Cache Status ===

Location: ~/.claude/cache/rust-docs

std: 45 items, 1.2M (expired: 3)
docs.rs: 128 items, 4.5M (expired: 12)
releases.rs: 15 items, 320K (expired: 0)
lib.rs: 23 items, 156K (expired: 8)
clippy: 42 items, 890K (expired: 5)

Total: 253 items, 7.1M
```
