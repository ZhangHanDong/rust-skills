---
name: rust-daily
description: |
  Use when the user asks for Rust ecosystem news, daily/weekly/monthly digests, or community updates.
  Fetches and summarizes content from Reddit r/rust, This Week in Rust, blog.rust-lang.org, Inside Rust,
  and the Rust Foundation — then produces a formatted report with links.
  Triggers on: rust news, rust daily, rust weekly, TWIR, rust blog,
  Rust 日报, Rust 周报, Rust 新闻, Rust 动态
argument-hint: "[today|week|month]"
context: fork
agent: Explore
---

# Rust Daily Report

> **Version:** 2.1.0 | **Last Updated:** 2025-01-27

Fetch Rust community updates, filtered by time range.

## Data Sources

| Category | Sources |
|----------|---------|
| Ecosystem | Reddit r/rust, This Week in Rust |
| Official | blog.rust-lang.org, Inside Rust |
| Foundation | rustfoundation.org (news, blog, events) |

## Parameters

- `time_range`: day | week | month (default: week)
- `category`: all | ecosystem | official | foundation

## Execution Mode Detection

**CRITICAL: Check agent file availability first to determine execution mode.**

Try to read: `../../agents/rust-daily-reporter.md`

---

## Agent Mode (Plugin Install)

**When `../../agents/rust-daily-reporter.md` exists:**

### Workflow

```
1. Read: ../../agents/rust-daily-reporter.md
2. Task(subagent_type: "general-purpose", run_in_background: false, prompt: <agent content>)
3. Wait for result
4. Format and present to user
```

---

## Inline Mode (Skills-only Install)

**When agent file is NOT available, execute each source directly:**

### 1. Reddit r/rust

```bash
# Using agent-browser CLI
agent-browser open "https://www.reddit.com/r/rust/hot/"
agent-browser get text ".Post" --limit 10
agent-browser close
```

**Or with WebFetch fallback:**
```
WebFetch("https://www.reddit.com/r/rust/hot/", "Extract top 10 posts with scores and titles")
```

**Parse output into:**
| Score | Title | Link |
|-------|-------|------|

### 2. This Week in Rust

```bash
mcp__actionbook__search_actions("this week in rust")
mcp__actionbook__get_action_by_id(<action_id>)
agent-browser open "https://this-week-in-rust.org/"
agent-browser get text "<selector_from_actionbook>"
agent-browser close
```

**Parse output into:**
- Issue #{number} ({date}): highlights

### 3. Rust Blog (Official)

```bash
agent-browser open "https://blog.rust-lang.org/"
agent-browser get text "article" --limit 5
agent-browser close
```

**Or with WebFetch fallback:**
```
WebFetch("https://blog.rust-lang.org/", "Extract latest 5 blog posts with dates and titles")
```

**Parse output into:**
| Date | Title | Summary |
|------|-------|---------|

### 4. Inside Rust

```bash
agent-browser open "https://blog.rust-lang.org/inside-rust/"
agent-browser get text "article" --limit 3
agent-browser close
```

**Or with WebFetch fallback:**
```
WebFetch("https://blog.rust-lang.org/inside-rust/", "Extract latest 3 posts with dates and titles")
```

### 5. Rust Foundation

Fetch from three endpoints (news, blog, events), limit 3 articles each:

```bash
agent-browser open "https://rustfoundation.org/media/category/news/"
agent-browser get text "article" --limit 3
agent-browser open "https://rustfoundation.org/media/category/blog/"
agent-browser get text "article" --limit 3
agent-browser open "https://rustfoundation.org/events/"
agent-browser get text "article" --limit 3
agent-browser close
```

### Time Filtering

After fetching all sources, filter by time range:

| Range | Filter |
|-------|--------|
| day | Last 24 hours |
| week | Last 7 days |
| month | Last 30 days |

### Combining Results

After fetching all sources, combine into the output format below.

---

## Tool Priority

1. **actionbook MCP** → 2. **agent-browser CLI** → 3. **WebFetch** fallback

**DO NOT use:** Chrome MCP directly, or WebSearch for fetching news pages.

---

## Output Format

```markdown
# Rust {Weekly|Daily|Monthly} Report

**Time Range:** {start} - {end}

## Ecosystem

### Reddit r/rust
| Score | Title | Link |
|-------|-------|------|
| {score} | {title} | [link]({url}) |

### This Week in Rust
- Issue #{number} ({date}): highlights

## Official
| Date | Title | Summary |
|------|-------|---------|
| {date} | {title} | {summary} |

## Foundation
| Date | Title | Summary |
|------|-------|---------|
| {date} | {title} | {summary} |
```

---

## Validation

- Each source should have at least 1 result, otherwise mark "No updates"
- On fetch failure, retry with alternative tool
- Report reason if all tools fail for a source

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| Agent file not found | Skills-only install | Use inline mode |
| agent-browser unavailable | CLI not installed | Use WebFetch |
| Site timeout | Network issues | Retry once, then skip source |
| Empty results | Selector mismatch | Report and use fallback |
