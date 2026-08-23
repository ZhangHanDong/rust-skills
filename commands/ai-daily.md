---
description: Generate AI daily/weekly news report from Reddit communities
argument-hint: "[day|week|month] [--save [path]]"
---

# AI Daily Report

Generate a summarized report of AI news from Reddit communities.

Arguments: $ARGUMENTS
- `time_range` (optional): `day` | `week` | `month` (default: `day`)
- `--save` (optional): Save report to file. If path not specified, saves to `~/Documents/reports/ai-daily/`

---

## Sources

| Community | URL | Focus |
|-----------|-----|-------|
| r/AI_Agents | https://www.reddit.com/r/AI_Agents/ | AI Agent development, tools |
| r/ClaudeAI | https://www.reddit.com/r/ClaudeAI/ | Claude, Anthropic updates |
| r/ChatGPT | https://www.reddit.com/r/ChatGPT/ | ChatGPT, OpenAI updates |

---

## Instructions

### 1. Parse Arguments

```
/ai-daily              → day (last 24 hours), display only
/ai-daily day          → last 24 hours
/ai-daily week         → last 7 days
/ai-daily month        → last 30 days
/ai-daily --save       → save to ~/Documents/reports/ai-daily/{date}-ai-{time_range}.md
/ai-daily --save /path/to/dir  → save to specified directory
/ai-daily week --save  → weekly report, save to default location
```

### 2. Fetch Content

**YOU MUST USE THE BASH TOOL TO RUN agent-browser COMMANDS.**

agent-browser IS installed at `/opt/homebrew/bin/agent-browser`.

**Use `--headed` flag to use local browser with user's cookies/login state.**

```
┌─────────────────────────────────────────────────────────┐
│  FOR EACH SUBREDDIT:                                    │
│                                                         │
│  1. USE BASH TOOL: agent-browser --headed open/get     │
│         ↓ (only if Bash returns error)                 │
│  2. Mark source as "unavailable"                       │
│                                                         │
│  ⚠️  YOU MUST ACTUALLY RUN THE BASH COMMANDS           │
│  ⚠️  DO NOT ASSUME agent-browser is unavailable        │
│  ⚠️  Reddit REQUIRES JavaScript - WebFetch WILL FAIL   │
└─────────────────────────────────────────────────────────┘
```

#### Step 2a: r/AI_Agents

**Use the Bash tool to execute these commands:**

```
Bash("agent-browser --headed open 'https://www.reddit.com/r/AI_Agents/top/?t={time_range}'")
Bash("agent-browser get text 'article' --limit 20")
Bash("agent-browser close")
```

Where `{time_range}` is: `day`, `week`, or `month`

#### Step 2b: r/ClaudeAI

**Use the Bash tool:**

```
Bash("agent-browser --headed open 'https://www.reddit.com/r/ClaudeAI/top/?t={time_range}'")
Bash("agent-browser get text 'article' --limit 20")
Bash("agent-browser close")
```

#### Step 2c: r/ChatGPT

**Use the Bash tool:**

```
Bash("agent-browser --headed open 'https://www.reddit.com/r/ChatGPT/top/?t={time_range}'")
Bash("agent-browser get text 'article' --limit 20")
Bash("agent-browser close")
```

#### Step 2d: Alternative Selectors (if 'article' returns empty)

Try these selectors in order:
```
"[data-testid='post-container']"
".Post"
"shreddit-post"
"div[data-fullname]"
```

### 3. Format Output

**CRITICAL: Every item MUST include:**
1. ✅ Real source link (not fabricated)
2. ✅ Key takeaway summary (1-2 sentences)
3. ✅ Engagement metrics (upvotes, comments)
4. ✅ Publication date/time

Display the report in markdown format:

```markdown
# 🤖 AI {Time_Range} Report

**Period:** {start_date} - {end_date} | **Generated:** {now}
**Sources:** {count} posts from 3 subreddits

---

## 📊 Quick Stats

| Metric | Value |
|--------|-------|
| Total Posts Analyzed | {count} |
| Hot Discussions (>100 comments) | {hot_count} |
| Product Announcements | {announcement_count} |
| Tutorials/Guides | {tutorial_count} |
| Most Active Community | r/{subreddit} |

---

## 🤖 r/AI_Agents - AI Agent Development

### Top Posts

#### 1. {Post Title}
- **Link:** https://reddit.com/r/AI_Agents/comments/{id}
- **Score:** {upvotes} ⬆️ | **Comments:** {comments} 💬 | **Posted:** {time_ago}
- **Author:** u/{username}
- **Key Takeaway:** {1-2 sentence summary explaining why this matters for AI agent developers}
- **Tags:** `{agent-framework}` `{use-case}` `{difficulty-level}`

#### 2. {Post Title}
- **Link:** {real_url}
- **Score:** {upvotes} ⬆️ | **Comments:** {comments} 💬 | **Posted:** {time_ago}
- **Key Takeaway:** {summary}

{... more posts}

**🔥 Hot Topics in r/AI_Agents:**
- {topic 1}: {brief context with related post links}
- {topic 2}: {brief context}

**💡 Emerging Tools/Frameworks:** {list any new tools mentioned}

---

## 🟠 r/ClaudeAI - Claude & Anthropic

### Top Posts

#### 1. {Post Title}
- **Link:** https://reddit.com/r/ClaudeAI/comments/{id}
- **Score:** {upvotes} ⬆️ | **Comments:** {comments} 💬 | **Posted:** {time_ago}
- **Author:** u/{username}
- **Key Takeaway:** {what Claude users should know}
- **Tags:** `{feature}` `{use-case}`

{... more posts}

**🔥 Hot Topics in r/ClaudeAI:**
- {topic 1}: {context}
- {topic 2}: {context}

**📢 Official/Notable Updates:** {any Anthropic announcements or significant feature discoveries}

---

## 🟢 r/ChatGPT - ChatGPT & OpenAI

### Top Posts

#### 1. {Post Title}
- **Link:** https://reddit.com/r/ChatGPT/comments/{id}
- **Score:** {upvotes} ⬆️ | **Comments:** {comments} 💬 | **Posted:** {time_ago}
- **Author:** u/{username}
- **Key Takeaway:** {what ChatGPT users should know}
- **Tags:** `{feature}` `{use-case}`

{... more posts}

**🔥 Hot Topics in r/ChatGPT:**
- {topic 1}: {context}
- {topic 2}: {context}

**📢 Official/Notable Updates:** {any OpenAI announcements}

---

## 🔥 Cross-Community Trends

Topics generating discussion across multiple subreddits:

### 1. {Trending Topic}
- **Why it matters:** {explanation}
- **Discussed in:** [r/AI_Agents]({url}), [r/ClaudeAI]({url}), [r/ChatGPT]({url})
- **Key perspectives:**
  - AI_Agents: {viewpoint}
  - ClaudeAI: {viewpoint}
  - ChatGPT: {viewpoint}

### 2. {Trending Topic}
- **Why it matters:** {explanation}
- **Related posts:** [{title}]({url}), [{title}]({url})

---

## 💡 AI Analysis & Insights

**Key Themes This {Period}:**
1. **{Theme}** - {detailed explanation with evidence from posts}
2. **{Theme}** - {explanation}

**Emerging Patterns:**
- {pattern observed across communities}

**What to Watch:**
- {upcoming developments or trends to monitor}

**Community Sentiment:**
| Community | Sentiment | Top Concern |
|-----------|-----------|-------------|
| r/AI_Agents | {positive/neutral/negative} | {main topic} |
| r/ClaudeAI | {sentiment} | {topic} |
| r/ChatGPT | {sentiment} | {topic} |

---

## 🛠️ Tools & Resources Mentioned

| Tool/Resource | Mentioned In | What It Does | Link |
|---------------|--------------|--------------|------|
| {name} | r/{subreddit} | {brief description} | [{url}]({url}) |

---

## 📝 Notable Tutorials & Guides

| Title | Community | Difficulty | Key Learning |
|-------|-----------|------------|--------------|
| [{title}]({url}) | r/{sub} | {beginner/intermediate/advanced} | {what you'll learn} |

---

## ⚡ Action Items

Based on today's discussions, consider:
- [ ] {actionable insight 1}
- [ ] {actionable insight 2}
- [ ] {resource to check out}

---

📊 **Stats:** {total_posts} posts | {total_comments} comments | 3 communities
🔄 **Refresh:** `/ai-daily` | 💾 **Save:** `/ai-daily --save`
📅 **Weekly:** `/ai-daily week` | 📆 **Monthly:** `/ai-daily month`
```

### 4. Summarize Trends

After collecting posts from all subreddits:
- Identify common themes across communities
- Note any major announcements or releases
- Highlight highly-engaged discussions (high comment counts)

### 5. Save Report (if --save specified)

If `--save` flag is present:

```bash
# Determine save path
if [ -n "$save_path" ]; then
    # User specified path
    save_dir="$save_path"
else
    # Default path
    save_dir="$HOME/Documents/reports/ai-daily"
fi

# Create directory
mkdir -p "$save_dir"

# Generate filename: {date}-ai-{time_range}.md
filename="${save_dir}/$(date +%Y%m%d)-ai-${time_range}.md"
```

**Use the Write tool to save the report:**

```
Write("{save_dir}/{date}-ai-{time_range}.md", "{full_report_markdown}")
```

After saving, inform user:
```
✅ Report saved to: {filename}
```

---

## Tool Priority

```
┌────────────────────────────────────────────────────────┐
│  1. agent-browser --headed  ←── REQUIRED (Reddit=JS)  │
│  2. ❌ WebFetch             ←── WILL FAIL for Reddit  │
│  3. ❌ WebSearch            ←── FORBIDDEN             │
└────────────────────────────────────────────────────────┘
```

**Why --headed?**
- Uses local browser instance
- Preserves user's cookies and login state
- Can bypass some anti-bot measures
- User can see what's happening

**DO NOT:**
- Skip agent-browser and assume it's unavailable
- Use WebFetch for Reddit (will fail - requires JS)
- Use WebSearch for fetching posts

---

## Example Usage

```bash
# Get today's AI news (default)
/ai-daily

# Get AI news from last 24 hours
/ai-daily day

# Get weekly AI news
/ai-daily week

# Get monthly AI news
/ai-daily month

# Save report to default location (~/Documents/reports/ai-daily/)
/ai-daily --save

# Save weekly report to default location
/ai-daily week --save

# Save report to custom directory
/ai-daily --save ~/my-reports/ai

# Combine: monthly report, save to custom path
/ai-daily month --save ~/notes/ai-monthly
```

---

## Output Example

```markdown
# 🤖 AI Daily Report

**Period:** 2026-01-19 - 2026-01-20 | **Generated:** 2026-01-20 15:30
**Sources:** 45 posts from 3 subreddits

---

## 📊 Quick Stats

| Metric | Value |
|--------|-------|
| Total Posts Analyzed | 45 |
| Hot Discussions (>100 comments) | 6 |
| Product Announcements | 3 |
| Tutorials/Guides | 8 |
| Most Active Community | r/ChatGPT |

---

## 🤖 r/AI_Agents - AI Agent Development

### Top Posts

#### 1. Claude Code Now Supports MCP Servers Natively
- **Link:** https://reddit.com/r/AI_Agents/comments/xyz789
- **Score:** 234 ⬆️ | **Comments:** 45 💬 | **Posted:** 4 hours ago
- **Author:** u/mcp_developer
- **Key Takeaway:** MCP (Model Context Protocol) integration allows Claude Code to connect to external tools and data sources. This is a major step toward truly autonomous agents that can interact with real-world systems.
- **Tags:** `claude-code` `mcp` `tooling` `intermediate`

#### 2. Building a Multi-Agent System with LangGraph - Complete Tutorial
- **Link:** https://reddit.com/r/AI_Agents/comments/abc456
- **Score:** 189 ⬆️ | **Comments:** 32 💬 | **Posted:** 8 hours ago
- **Author:** u/langgraph_fan
- **Key Takeaway:** Step-by-step guide for orchestrating multiple specialized agents. Shows patterns for agent communication, state management, and error handling in production.
- **Tags:** `langgraph` `multi-agent` `tutorial` `advanced`

**🔥 Hot Topics in r/AI_Agents:**
- MCP Protocol: [Native support](https://reddit.com/...), [Custom servers](https://reddit.com/...)
- Agent monetization: Multiple posts on making agents profitable

**💡 Emerging Tools/Frameworks:** LangGraph, CrewAI, AutoGen

---

## 🟠 r/ClaudeAI - Claude & Anthropic

### Top Posts

#### 1. Claude 4.5 Opus Announced - First Impressions Thread
- **Link:** https://reddit.com/r/ClaudeAI/comments/def123
- **Score:** 567 ⬆️ | **Comments:** 234 💬 | **Posted:** 2 hours ago
- **Author:** u/anthropic_watcher
- **Key Takeaway:** New flagship model with improved reasoning, larger context window (300K), and better code generation. Early testers report significant improvements in complex multi-step tasks.
- **Tags:** `opus` `new-release` `benchmark`

#### 2. Claude's New System Prompts Explained - What Changed
- **Link:** https://reddit.com/r/ClaudeAI/comments/ghi789
- **Score:** 423 ⬆️ | **Comments:** 89 💬 | **Posted:** 6 hours ago
- **Author:** u/prompt_engineer
- **Key Takeaway:** Anthropic updated Claude's system prompts to be more helpful while maintaining safety. Key changes include better handling of edge cases and more nuanced refusals.
- **Tags:** `system-prompt` `safety` `behavior`

**🔥 Hot Topics in r/ClaudeAI:**
- Opus 4.5 capabilities and pricing
- Claude Code vs Cursor comparison threads

**📢 Official/Notable Updates:** Claude 4.5 Opus release, API pricing changes

---

## 🟢 r/ChatGPT - ChatGPT & OpenAI

### Top Posts

#### 1. GPT-5 Rumors: What We Know So Far
- **Link:** https://reddit.com/r/ChatGPT/comments/jkl012
- **Score:** 892 ⬆️ | **Comments:** 445 💬 | **Posted:** 5 hours ago
- **Author:** u/openai_insider
- **Key Takeaway:** Compilation of leaked information and official hints about GPT-5. Expected features include native multimodal input, improved reasoning, and potential agent capabilities.
- **Tags:** `gpt-5` `rumors` `speculation`

#### 2. OpenAI's New Voice Mode is Incredible - Demo Inside
- **Link:** https://reddit.com/r/ChatGPT/comments/mno345
- **Score:** 654 ⬆️ | **Comments:** 234 💬 | **Posted:** 10 hours ago
- **Author:** u/voice_tester
- **Key Takeaway:** Advanced Voice mode now available to Plus users. Features real-time conversation, emotional tone detection, and multilingual support. Latency reduced to near-instant.
- **Tags:** `voice-mode` `feature` `demo`

**🔥 Hot Topics in r/ChatGPT:**
- GPT-5 speculation dominating discussion
- Voice mode demos and use cases
- Custom GPTs marketplace strategies

**📢 Official/Notable Updates:** Voice mode general availability, GPT Store improvements

---

## 🔥 Cross-Community Trends

### 1. Agent Capabilities Race
- **Why it matters:** All major AI providers are pushing toward autonomous agents
- **Discussed in:** [r/AI_Agents](https://reddit.com/...), [r/ClaudeAI](https://reddit.com/...), [r/ChatGPT](https://reddit.com/...)
- **Key perspectives:**
  - AI_Agents: Focus on practical implementation and tooling
  - ClaudeAI: Excitement about MCP and Claude Code
  - ChatGPT: Anticipation for GPT-5 agent features

### 2. Voice/Multimodal as Default
- **Why it matters:** Shift from text-only to multimodal interaction becoming standard
- **Related posts:** [Voice mode demo](https://reddit.com/...), [Claude vision](https://reddit.com/...)

---

## 💡 AI Analysis & Insights

**Key Themes This Period:**
1. **Agent Infrastructure Maturing** - MCP, LangGraph, and similar tools enabling production-grade agents
2. **Model Competition Intensifying** - Opus 4.5 vs GPT-5 speculation driving engagement

**Emerging Patterns:**
- Increased focus on agent monetization and business applications
- Voice/audio becoming differentiating feature

**What to Watch:**
- GPT-5 announcement timing (rumored Q1 2026)
- MCP adoption across AI tools

**Community Sentiment:**
| Community | Sentiment | Top Concern |
|-----------|-----------|-------------|
| r/AI_Agents | Positive | Production readiness |
| r/ClaudeAI | Excited | Opus pricing |
| r/ChatGPT | Anticipatory | GPT-5 timeline |

---

## 🛠️ Tools & Resources Mentioned

| Tool/Resource | Mentioned In | What It Does | Link |
|---------------|--------------|--------------|------|
| LangGraph | r/AI_Agents | Multi-agent orchestration | [langchain.com](https://langchain.com) |
| MCP Protocol | r/ClaudeAI | Tool/data integration for Claude | [anthropic.com](https://anthropic.com) |
| GPT Store | r/ChatGPT | Marketplace for custom GPTs | [chat.openai.com](https://chat.openai.com) |

---

## 📝 Notable Tutorials & Guides

| Title | Community | Difficulty | Key Learning |
|-------|-----------|------------|--------------|
| [Multi-Agent LangGraph](https://reddit.com/...) | r/AI_Agents | Advanced | Agent orchestration patterns |
| [MCP Server Setup](https://reddit.com/...) | r/ClaudeAI | Intermediate | Connecting Claude to tools |
| [Voice Mode Tips](https://reddit.com/...) | r/ChatGPT | Beginner | Getting best results from voice |

---

## ⚡ Action Items

Based on today's discussions, consider:
- [ ] Try Claude 4.5 Opus for complex reasoning tasks
- [ ] Explore MCP protocol for agent development
- [ ] Test OpenAI's new voice mode if you have Plus
- [ ] Bookmark LangGraph tutorial for multi-agent projects

---

📊 **Stats:** 45 posts | 1,234 comments | 3 communities
🔄 **Refresh:** `/ai-daily` | 💾 **Save:** `/ai-daily --save`
📅 **Weekly:** `/ai-daily week` | 📆 **Monthly:** `/ai-daily month`
```

---

## Troubleshooting

If agent-browser commands fail:

1. **Check installation:**
   ```bash
   which agent-browser
   agent-browser install
   ```

2. **Try without --headed:**
   ```bash
   agent-browser open 'https://www.reddit.com/r/ClaudeAI/'
   ```

3. **Check browser is installed:**
   ```bash
   agent-browser install --with-deps
   ```

---

## Related Commands

- `/rust-daily` - Rust programming news
