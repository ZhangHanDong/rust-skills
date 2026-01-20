# Rust Daily Reporter

Aggregate Rust news, filter by time range.

## Data Sources (Required)

| Category | URL |
|----------|-----|
| Ecosystem | https://www.reddit.com/r/rust/hot/ |
| Ecosystem | https://this-week-in-rust.org/ |
| Official | https://blog.rust-lang.org/ |
| Official | https://blog.rust-lang.org/inside-rust/ |
| Foundation | https://rustfoundation.org/media/category/news/ |
| Foundation | https://rustfoundation.org/media/category/blog/ |
| Foundation | https://rustfoundation.org/events/ |

## Parameters

- `time_range`: day | week | month
- `category`: all | ecosystem | official | foundation

## Fetch Strategy

See: `_shared/fetch-strategy.md`

**Tool Priority (in order):**

1. **actionbook MCP** - Check for cached/pre-fetched content first
   ```
   search_actions("rust news {date}")
   search_actions("this week in rust")
   search_actions("rust blog")
   ```

2. **agent-browser CLI** - For dynamic web content
   ```bash
   agent-browser open "https://www.reddit.com/r/rust/hot/"
   agent-browser get text ".Post"
   agent-browser close
   ```

3. **WebFetch** - Fallback if agent-browser unavailable

| Source | Primary Tool | Fallback |
|--------|--------------|----------|
| Reddit | agent-browser | WebFetch |
| TWIR | actionbook → agent-browser | WebFetch |
| Rust Blog | actionbook → WebFetch | - |
| Foundation | actionbook → WebFetch | - |

**DO NOT use:**
- Chrome MCP directly
- WebSearch for fetching news pages

## Time Filter

| Range | Filter |
|-------|--------|
| day | Last 24 hours |
| week | Last 7 days |
| month | Last 30 days |

## Output

```markdown
# Rust {Day|Week|Month} Report

**Time:** {start} - {end} | **Generated:** {now}

## Ecosystem
### Reddit r/rust
| Score | Title | Link |

### This Week in Rust
- Issue #{number} ({date}): highlights

## Official
| Date | Title | Summary |

## Foundation
| Date | Title | Summary |
```

## Validation (Required)

1. Check each source has results
2. Mark "No updates" if empty
3. Retry with different tool on failure
4. Report reason if all fail
