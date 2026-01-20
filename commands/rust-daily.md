---
description: Generate Rust daily/weekly/monthly news report
argument-hint: [day|week|month] [--category ecosystem|official|foundation] [--save [path]]
---

# Rust Daily Report

Generate a summarized report of Rust news from multiple sources.

Arguments: $ARGUMENTS
- `time_range` (optional): `day` | `week` | `month` (default: `week`)
- `--category` (optional): `ecosystem` | `official` | `foundation` | `all` (default: `all`)
- `--save` (optional): Save report to file. If path not specified, saves to `~/Documents/reports/rust-daily/`

---

## Sources

| Category | Sources |
|----------|---------|
| **Ecosystem** | Reddit r/rust, This Week in Rust |
| **Official** | Rust Blog, Inside Rust Blog |
| **Foundation** | Rust Foundation News, Blog, Events |

---

## Instructions

### 1. Parse Arguments

```
/rust-daily              → week, all categories, display only
/rust-daily day          → last 24 hours, all
/rust-daily week         → last 7 days, all
/rust-daily month        → last 30 days, all
/rust-daily --category ecosystem  → week, ecosystem only
/rust-daily day --category official → day, official only
/rust-daily --save       → save to ~/Documents/reports/rust-daily/{date}-rust-{time_range}.md
/rust-daily --save /path/to/dir  → save to specified directory
/rust-daily day --save   → day report, save to default location
```

### 2. Check Cache

Check if recent cache exists:

```bash
cache_dir=~/.claude/cache/rust-daily/
cache_file=${cache_dir}/report-{date}-{time_range}-{category}.json

# If cache exists and < 4 hours old, use cached data
```

### 3. Fetch Content

**YOU MUST USE THE BASH TOOL TO RUN agent-browser COMMANDS.**

Do NOT assume agent-browser is unavailable. It IS installed at `/opt/homebrew/bin/agent-browser`.

```
┌─────────────────────────────────────────────────────────┐
│  FOR EACH SOURCE:                                       │
│                                                         │
│  1. USE BASH TOOL to run: agent-browser open/get/close │
│         ↓ (only if Bash returns error)                 │
│  2. USE WebFetch tool as fallback                      │
│                                                         │
│  ⚠️  YOU MUST ACTUALLY RUN THE BASH COMMANDS           │
│  ⚠️  DO NOT ASSUME agent-browser is unavailable        │
└─────────────────────────────────────────────────────────┘
```

#### Step 3a: Reddit (Bash + agent-browser REQUIRED)

**Use the Bash tool to execute these commands:**

```
Bash("agent-browser open 'https://www.reddit.com/r/rust/top/?t=day'")
Bash("agent-browser get text '[data-testid=\"post-container\"]' --limit 15")
Bash("agent-browser close")
```

Reddit requires JavaScript. WebFetch will fail. Only mark unavailable if Bash command fails.

#### Step 3b: This Week in Rust (Bash first)

**Use the Bash tool:**

```
Bash("agent-browser open 'https://this-week-in-rust.org/'")
Bash("agent-browser get text '.post-content'")
Bash("agent-browser close")
```

If Bash fails → Use WebFetch tool

#### Step 3c: Rust Blog (Bash first)

**Use the Bash tool:**

```
Bash("agent-browser open 'https://blog.rust-lang.org/'")
Bash("agent-browser get text '.post-list'")
Bash("agent-browser close")
```

If Bash fails → Use WebFetch tool

#### Step 3d: Foundation News (Bash first)

**Use the Bash tool:**

```
Bash("agent-browser open 'https://foundation.rust-lang.org/news/'")
Bash("agent-browser get text '.news-list'")
Bash("agent-browser close")
```

If Bash fails → Use WebFetch tool

#### Step 3e: FORBIDDEN

- ❌ **Assuming agent-browser unavailable without trying** - YOU MUST RUN BASH COMMANDS
- ❌ **WebSearch** - Never use for fetching news
- ❌ **WebFetch for Reddit** - Will always fail

### 4. Format Output

**CRITICAL: Every item MUST include:**
1. ✅ Real source link (not fabricated)
2. ✅ Key takeaway summary (1-2 sentences)
3. ✅ Engagement metrics (upvotes, comments)
4. ✅ Publication date/time

Display the report in markdown format:

```markdown
# 🦀 Rust {Time_Range} Report

**Period:** {start_date} - {end_date} | **Generated:** {now}
**Sources:** {count} items from {source_count} sources

---

## 📊 Quick Stats

| Metric | Value |
|--------|-------|
| Total Posts | {count} |
| Hot Discussions (>50 comments) | {hot_count} |
| Official Announcements | {official_count} |
| Top Topic | {top_topic} |

---

## 🌐 Ecosystem Highlights

### Reddit r/rust

#### 1. {Post Title}
- **Link:** https://reddit.com/r/rust/comments/{id}
- **Score:** {upvotes} ⬆️ | **Comments:** {comments} 💬 | **Posted:** {time_ago}
- **Author:** u/{username}
- **Key Takeaway:** {1-2 sentence summary of why this matters}
- **Tags:** `{tag1}` `{tag2}`

#### 2. {Post Title}
- **Link:** {real_url}
- **Score:** {upvotes} ⬆️ | **Comments:** {comments} 💬 | **Posted:** {time_ago}
- **Key Takeaway:** {summary}

{... more posts}

### This Week in Rust #{issue_number}
- **Link:** https://this-week-in-rust.org/blog/{date}/this-week-in-rust-{number}/
- **Published:** {date}

**Crate of the Week:** [{crate_name}]({crates.io_link})
> {why it was selected}

**Notable Updates:**
| Item | Summary | Link |
|------|---------|------|
| {title} | {key_takeaway} | [→]({url}) |

---

## 📢 Official Announcements

### Rust Blog

#### {Post Title}
- **Link:** https://blog.rust-lang.org/{path}
- **Published:** {date}
- **Key Takeaway:** {what this means for Rust developers}
- **Action Required:** {yes/no - what users should do}

### Inside Rust Blog

#### {Post Title}
- **Link:** https://blog.rust-lang.org/inside-rust/{path}
- **Published:** {date}
- **Key Takeaway:** {summary}
- **Relevant Teams:** {compiler, lang, libs, etc.}

---

## 🏛️ Rust Foundation

### News & Announcements

#### {Title}
- **Link:** https://foundation.rust-lang.org/news/{path}
- **Published:** {date}
- **Key Takeaway:** {impact on Rust ecosystem}

### Upcoming Events

| Date | Event | Location | Link | Why Attend |
|------|-------|----------|------|------------|
| {date} | {name} | {location} | [Register]({url}) | {brief reason} |

---

## 🔥 Trending Topics

Based on engagement and discussion volume:

1. **{Topic 1}** - {brief explanation}
   - Related: [{post1}]({url}), [{post2}]({url})

2. **{Topic 2}** - {brief explanation}
   - Related: [{post1}]({url})

---

## 💡 AI Analysis

**Key Themes This {Period}:**
- {theme 1 with context}
- {theme 2 with context}

**What to Watch:**
- {upcoming event or trend to monitor}

**Community Sentiment:** {positive/neutral/mixed} - {brief explanation}

---

## 📚 Further Reading

| Topic | Resource | Type |
|-------|----------|------|
| {topic} | [{title}]({url}) | Blog/Video/Doc |

---

📊 **Stats:** {total_posts} posts | {total_comments} comments | {sources_count} sources
🔄 **Refresh:** `/rust-daily` | 💾 **Save:** `/rust-daily --save`
```

### 5. Save Report (if --save specified)

If `--save` flag is present:

```bash
# Determine save path
if [ -n "$save_path" ]; then
    # User specified path
    save_dir="$save_path"
else
    # Default path
    save_dir="$HOME/Documents/reports/rust-daily"
fi

# Create directory
mkdir -p "$save_dir"

# Generate filename: {date}-rust-{time_range}.md
filename="${save_dir}/$(date +%Y%m%d)-rust-${time_range}.md"

# Save report using Write tool
Write("$filename", "{report_content}")
```

**Use the Write tool to save the report:**

```
Write("{save_dir}/{date}-rust-{time_range}.md", "{full_report_markdown}")
```

After saving, inform user:
```
✅ Report saved to: {filename}
```

### 6. Save Cache

Save results for faster subsequent queries:

```bash
mkdir -p ~/.claude/cache/rust-daily/
# Save JSON with metadata
```

---

## Example Usage

```bash
# Get weekly Rust news (default)
/rust-daily

# Get today's Rust news
/rust-daily day

# Get monthly summary
/rust-daily month

# Get only ecosystem updates (Reddit, TWIR)
/rust-daily --category ecosystem

# Get official Rust project updates only
/rust-daily --category official

# Get Rust Foundation updates only
/rust-daily --category foundation

# Combine: today's official updates
/rust-daily day --category official

# Save report to default location (~/Documents/reports/rust-daily/)
/rust-daily --save

# Save daily report to default location
/rust-daily day --save

# Save report to custom directory
/rust-daily --save ~/my-reports/rust

# Combine: weekly ecosystem report, save to custom path
/rust-daily week --category ecosystem --save ~/notes/rust-weekly
```

---

## Output Example

```markdown
# 🦀 Rust Daily Report

**Period:** 2026-01-19 - 2026-01-20 | **Generated:** 2026-01-20 15:30
**Sources:** 18 items from 5 sources

---

## 📊 Quick Stats

| Metric | Value |
|--------|-------|
| Total Posts | 18 |
| Hot Discussions (>50 comments) | 4 |
| Official Announcements | 2 |
| Top Topic | Async improvements |

---

## 🌐 Ecosystem Highlights

### Reddit r/rust

#### 1. Tokio 2.0 Released with Major Performance Improvements
- **Link:** https://reddit.com/r/rust/comments/abc123
- **Score:** 542 ⬆️ | **Comments:** 89 💬 | **Posted:** 6 hours ago
- **Author:** u/tokio_maintainer
- **Key Takeaway:** Tokio 2.0 brings 40% better throughput and simplified APIs. If you're using async Rust, this is a must-upgrade with mostly backward-compatible changes.
- **Tags:** `async` `tokio` `release`

#### 2. Why I Switched My Company from Go to Rust
- **Link:** https://reddit.com/r/rust/comments/def456
- **Score:** 423 ⬆️ | **Comments:** 156 💬 | **Posted:** 12 hours ago
- **Author:** u/startup_cto
- **Key Takeaway:** Real-world experience report showing 60% reduction in production bugs after migrating. Key challenges were learning curve and compile times, but reliability gains outweighed costs.
- **Tags:** `experience-report` `go-comparison` `production`

### This Week in Rust #634
- **Link:** https://this-week-in-rust.org/blog/2026/01/14/this-week-in-rust-634/
- **Published:** 2026-01-14

**Crate of the Week:** [axum](https://crates.io/crates/axum)
> Selected for its elegant API design and strong ecosystem integration with tower middleware.

**Notable Updates:**
| Item | Summary | Link |
|------|---------|------|
| Rust 1.85 beta | New async closures stabilized | [→](https://blog.rust-lang.org) |
| cargo-semver | Now detects more breaking changes | [→](https://github.com/...) |

---

## 📢 Official Announcements

### Rust Blog

#### Announcing Rust 1.85.0
- **Link:** https://blog.rust-lang.org/2026/01/15/Rust-1.85.0.html
- **Published:** 2026-01-15
- **Key Takeaway:** Async closures are now stable! This enables more ergonomic async code patterns. Also includes improved compile times for large projects.
- **Action Required:** Yes - update with `rustup update stable`

### Inside Rust Blog

#### Lang Team Design Meeting: Edition 2027 Planning
- **Link:** https://blog.rust-lang.org/inside-rust/2026/01/14/lang-meeting.html
- **Published:** 2026-01-14
- **Key Takeaway:** Early discussions on potential Edition 2027 features including keyword generics and effect systems.
- **Relevant Teams:** lang, compiler

---

## 🏛️ Rust Foundation

### News & Announcements

#### Google Joins as Platinum Member
- **Link:** https://foundation.rust-lang.org/news/2026-01-13-google-platinum/
- **Published:** 2026-01-13
- **Key Takeaway:** $2M annual commitment will fund security audits and compiler infrastructure. Shows continued enterprise investment in Rust.

### Upcoming Events

| Date | Event | Location | Link | Why Attend |
|------|-------|----------|------|------------|
| Feb 1-3 | RustConf 2026 | Seattle, WA | [Register](https://rustconf.com) | Keynote on Rust in Linux kernel |
| Feb 15 | Rust Meetup | Virtual | [Join](https://meetup.com/...) | Free, beginner-friendly |

---

## 🔥 Trending Topics

1. **Async Ecosystem Maturation** - Multiple posts discussing Tokio 2.0 and async closures
   - Related: [Tokio 2.0](https://reddit.com/...), [Async Patterns](https://reddit.com/...)

2. **Rust in Production** - Growing number of experience reports from companies
   - Related: [Go to Rust Migration](https://reddit.com/...)

---

## 💡 AI Analysis

**Key Themes This Period:**
- Async Rust reaching new maturity level with Tokio 2.0 and language improvements
- Increasing enterprise adoption evidenced by Foundation membership and experience reports

**What to Watch:**
- Edition 2027 discussions starting - may influence long-term project planning

**Community Sentiment:** Positive - excitement about async improvements and ecosystem growth

---

📊 **Stats:** 18 posts | 523 comments | 5 sources
🔄 **Refresh:** `/rust-daily` | 💾 **Save:** `/rust-daily --save`
```

---

## Tool Priority

```
┌────────────────────────────────────────────────────┐
│  1. agent-browser CLI  ←── PRIMARY (always first) │
│  2. WebFetch           ←── FALLBACK (static only) │
│  3. ❌ WebSearch       ←── FORBIDDEN              │
└────────────────────────────────────────────────────┘
```

| Site | agent-browser | WebFetch | WebSearch |
|------|---------------|----------|-----------|
| Reddit | ✅ Required | ❌ Fails | ❌ Never |
| TWIR | ✅ First | ✅ Fallback | ❌ Never |
| Rust Blog | ✅ First | ✅ Fallback | ❌ Never |
| Foundation | ✅ First | ✅ Fallback | ❌ Never |

**DO NOT:**
- Skip agent-browser and go directly to WebFetch
- Use WebFetch for Reddit (will fail)
- Use WebSearch for any news fetching

---

## Related Commands

- `/rust-features [version]` - Rust version changelog
- `/crate-info <crate>` - Crate information
- `/sync-crate-skills` - Sync project dependencies
