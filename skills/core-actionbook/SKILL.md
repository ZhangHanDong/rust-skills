---
name: core-actionbook
description: "Internal support skill for actionbook MCP selectors used by Rust documentation research workflows. Use when another rust-skills workflow explicitly requests actionbook-backed selectors. Keywords: actionbook, selectors, Rust docs, browser automation."
user-invocable: false
disable-model-invocation: true
---

# Actionbook

Content merged into `core-agent-browser` ("Actionbook MCP selectors" section),
which documents the full fetch chain: actionbook MCP -> agent-browser CLI ->
WebFetch.

Quick reference:

1. `search_actions(query, type?, limit?, sourceIds?, minScore?)` - search by
   keyword, returns URL-based action IDs with previews and relevance scores.
2. `get_action_by_id(id)` - full action manual: element selectors (CSS/XPath),
   element types, allowed methods (click, type, extract).
3. Execute the returned selectors with your browser automation tool.

For parameter details, the response shape, and agent-browser usage, read
`skills/core-agent-browser/SKILL.md`.
