---
name: rust-daily
description: |
  Use when: Rust news and daily/weekly/monthly reports. Keywords:
  rust news, rust daily, rust weekly, TWIR, rust blog,
  Rust 日报, Rust 周报, Rust 新闻, Rust 动态
argument-hint: "[today|week|month]"
context: fork
agent: Explore
---

# Rust Daily Report

Fetch Rust community updates, filtered by time range.

## Parameters

- `time_range`: day | week | month (default: week)
- `category`: all | ecosystem | official | foundation

## Agent Mode (Plugin Install)

If `../../agents/rust-daily-reporter.md` exists:

1. Read `../../agents/rust-daily-reporter.md`
2. `Task(subagent_type: "general-purpose", prompt: <agent content>)`
3. Wait for the result, format, and present to the user.

Otherwise use Inline Mode below.

## Inline Mode (Skills-only Install)

Per-source fetch order: actionbook selectors first
(`mcp__actionbook__search_actions(...)`), then agent-browser CLI
(`agent-browser open <url>`, `get text <selector>`, `close`), then WebFetch.
Do NOT use Chrome MCP directly or WebSearch for fetching news pages.

| Category | Source | URL | Primary Fetch | WebFetch Fallback Prompt |
|----------|--------|-----|---------------|--------------------------|
| Ecosystem | Reddit r/rust | `https://www.reddit.com/r/rust/hot.json` | WebFetch the JSON endpoint (the old `.Post` CSS selector is dead; reddit.com now renders shreddit web components). `https://old.reddit.com/r/rust/` also works with agent-browser. | "Extract top 10 posts: title, score, permalink" |
| Ecosystem | This Week in Rust | `https://this-week-in-rust.org/` | actionbook selector -> agent-browser | "Extract latest issue number, date, and highlights" |
| Official | Rust Blog | `https://blog.rust-lang.org/` | `agent-browser get text "article"` (limit 5) | "Extract latest 5 posts with dates and titles" |
| Official | Inside Rust | `https://blog.rust-lang.org/inside-rust/` | `agent-browser get text "article"` (limit 3) | "Extract latest 3 posts with dates and titles" |
| Foundation | News / Blog / Events | `https://rustfoundation.org/media/category/news/`, `.../media/category/blog/`, `.../events/` | `agent-browser get text "article"` (limit 3 each) | "Extract latest 3 items with dates and titles" |

Rules:

- Filter results by time range: day = last 24h, week = last 7 days,
  month = last 30 days.
- A source with no in-range items: mark "No updates".
- On fetch failure: retry once with the next tool in the chain, then skip the
  source and report the reason.

## Output Skeleton

```markdown
# Rust {Daily|Weekly|Monthly} Report

**Time Range:** {start} - {end}

## Ecosystem

### Reddit r/rust
| Score | Title | Link |
|-------|-------|------|

### This Week in Rust
- Issue #{number} ({date}): highlights

## Official
| Date | Title | Summary |
|------|-------|---------|

## Foundation
| Date | Title | Summary |
|------|-------|---------|
```
