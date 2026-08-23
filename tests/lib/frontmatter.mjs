// Shared minimal line-based frontmatter parser for JS-side tooling.
// PARITY CONTRACT: this must agree with the Rust parser
// (parse_skill_frontmatter in crates/rust-skills-cli/src/main.rs) on the
// common-subset shapes pinned in tests/fixtures/frontmatter-parity.json.
// Extra JS-only capability (block scalars via `|`/`>`) is tolerated for the
// gate's own needs but MUST NOT be relied on for anything the binary also reads.
export function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { metadata: {}, body: content, hasFrontmatter: false };

  const metadata = {};
  const lines = match[1].split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const field = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!field) continue;
    const key = field[1];
    let value = field[2].trim();
    if (value === "|" || value === ">") {
      const block = [];
      for (index += 1; index < lines.length; index += 1) {
        const blockLine = lines[index];
        if (/^[A-Za-z0-9_-]+:\s*/.test(blockLine)) {
          index -= 1;
          break;
        }
        block.push(blockLine.replace(/^ {2}/, ""));
      }
      metadata[key] = block.join("\n").trim();
    } else {
      metadata[key] = value.replace(/^["']|["']$/g, "");
    }
  }

  return {
    metadata,
    body: content.slice(match[0].length),
    hasFrontmatter: true
  };
}
