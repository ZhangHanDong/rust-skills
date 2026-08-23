---
name: core-agent-browser
internal: true
description: "Internal support skill for agent-browser CLI workflows used by rust-learner, docs-researcher, and crate-researcher. Use when browser automation is explicitly required. Keywords: agent-browser, Rust docs, browser automation."
user-invocable: false
disable-model-invocation: true
---

# Browser Automation with agent-browser

## Priority Note

For fetching Rust/crate information, use this priority order:
1. **rust-learner skill** - Orchestrates actionbook + browser-fetcher
2. **actionbook MCP** - Pre-computed selectors for known sites (see below)
3. **agent-browser CLI** - Direct browser automation (last resort)

Use agent-browser directly only when actionbook has no pre-computed
selectors for the target site, or you need interactive testing, screenshots,
or form filling. Fall back to WebFetch only if agent-browser is unavailable.

## Core workflow

```bash
agent-browser open <url>        # Navigate to page
agent-browser snapshot -i       # Interactive elements with refs (@e1, @e2, ...)
agent-browser click @e1         # Click element by ref
agent-browser fill @e2 "text"   # Clear and type into input by ref
agent-browser close             # Close browser when done
```

Rules that are easy to get wrong:
- Refs (`@e1`) come from the LAST snapshot. **Re-snapshot after navigation
  or any significant DOM change** - stale refs silently target wrong elements.
- `snapshot -i` (interactive only) is almost always what you want; the full
  accessibility tree is large. `-c` compacts output, `-d 3` limits depth.
- `fill` clears the field first; `type` appends without clearing.

## Get information and wait

```bash
agent-browser get text @e1            # Element text (e.g. .docblock content)
agent-browser get text ".docblock"    # CSS selector also accepted
agent-browser get title               # Page title
agent-browser get url                 # Current URL
agent-browser wait @e1                # Wait for element
agent-browser wait --text "Success"   # Wait for text
agent-browser wait --load networkidle # Wait for network idle
```

## Semantic locators (alternative to refs)

```bash
agent-browser find role button click --name "Search"
agent-browser find text "Documentation" click
agent-browser find label "Search" fill "tokio"
```

Other commands (back/forward/reload, hover, select, scroll, screenshot,
check/uncheck) follow the same shape; see `agent-browser --help`.

## Actionbook MCP selectors

Actionbook serves pre-computed action manuals so agents get structured page
information instead of parsing HTML. Check it before driving agent-browser
manually.

1. `search_actions` - search by keyword; returns URL-based action IDs,
   content previews, relevance scores.
   - `query` (required): keyword, e.g. "docs.rs search", "crates.io crate page"
   - `type`: `vector` | `fulltext` | `hybrid` (default)
   - `limit`: max results (default 5)
   - `sourceIds`: comma-separated source filter
   - `minScore`: minimum relevance score (0-1)
2. `get_action_by_id` - full action manual for an ID.
   - `id` (required): URL-based action ID, e.g. `docs.rs/tokio`
   - Returns: page details, element selectors (CSS/XPath), element types,
     allowed methods (click, type, extract), document metadata.
3. Execute the returned selectors with agent-browser.

Example response shape:

```json
{
  "title": "docs.rs crate search",
  "url": "docs.rs/releases/search",
  "elements": [
    {
      "name": "search_input",
      "selector": "input[name='query']",
      "type": "textbox",
      "methods": ["type", "fill"]
    }
  ]
}
```
