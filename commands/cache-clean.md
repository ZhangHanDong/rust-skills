---
description: Clean Rust docs cache
argument-hint: "[--all | --expired | crate_name]"
---

# Cache Clean

Clean cached Rust documentation.

Arguments: $ARGUMENTS
- `--all`: Remove all cached docs
- `--expired`: Remove only expired docs (default)
- `crate_name`: Remove cache for specific crate/item

---

## Instructions

### 1. Parse Arguments

```bash
CACHE_DIR="$HOME/.claude/cache/rust-docs"
MODE="expired"  # default
TARGET=""

for arg in $ARGUMENTS; do
    case $arg in
        --all) MODE="all" ;;
        --expired) MODE="expired" ;;
        *) TARGET="$arg" ;;
    esac
done
```

### 2. Clean Based on Mode

#### Mode: --all

```bash
if [ "$MODE" = "all" ]; then
    echo "Removing all cached docs..."
    rm -rf "$CACHE_DIR"/*
    echo "Cache cleared."
    exit 0
fi
```

#### Mode: --expired (default)

```bash
if [ "$MODE" = "expired" ]; then
    echo "Removing expired cache entries..."
    now=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    count=0

    for f in $(find "$CACHE_DIR" -name "*.json" -type f); do
        exp=$(jq -r '.meta.expires_at' "$f" 2>/dev/null)
        if [[ "$exp" < "$now" ]]; then
            rm "$f"
            ((count++))
            echo "Removed: ${f#$CACHE_DIR/}"
        fi
    done

    # Clean empty directories
    find "$CACHE_DIR" -type d -empty -delete 2>/dev/null

    echo ""
    echo "Removed $count expired entries."
    exit 0
fi
```

#### Mode: specific target

```bash
if [ -n "$TARGET" ]; then
    echo "Removing cache for: $TARGET"

    # Search in all categories
    found=0
    for category in std docs.rs lib.rs clippy; do
        target_dir="$CACHE_DIR/$category/$TARGET"
        if [ -d "$target_dir" ]; then
            rm -rf "$target_dir"
            echo "Removed: $category/$TARGET/"
            ((found++))
        fi

        # Also check for files matching the target
        for f in $(find "$CACHE_DIR/$category" -name "*$TARGET*" -type f 2>/dev/null); do
            rm "$f"
            echo "Removed: ${f#$CACHE_DIR/}"
            ((found++))
        done
    done

    if [ $found -eq 0 ]; then
        echo "No cache found for: $TARGET"
    else
        echo ""
        echo "Removed $found items."
    fi
    exit 0
fi
```

---

## Output Format

### --expired (default)

```
Removing expired cache entries...
Removed: docs.rs/tokio/task-fn.spawn.json
Removed: std/marker/trait.Send.json
Removed: lib.rs/serde.json

Removed 3 expired entries.
```

### --all

```
Removing all cached docs...
Cache cleared.
```

### specific target

```
Removing cache for: tokio
Removed: docs.rs/tokio/
Removed: lib.rs/tokio.json

Removed 2 items.
```

---

## Example Usage

```bash
# Clean only expired entries (default)
/rust-skills:cache-clean

# Clean all cache
/rust-skills:cache-clean --all

# Clean specific crate cache
/rust-skills:cache-clean tokio

# Clean std library cache for specific item
/rust-skills:cache-clean Send
```
