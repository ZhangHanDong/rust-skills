#!/usr/bin/env node
// JS side of the frontmatter parity contract. The Rust side is the
// frontmatter_parity_fixtures unit test in crates/rust-skills-cli/src/main.rs.
// Both read tests/fixtures/frontmatter-parity.json; a behavior change in either
// parser fails its side until the fixtures (and the other parser) are updated
// deliberately.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseFrontmatter } from "./lib/frontmatter.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixtures = JSON.parse(
  fs.readFileSync(path.join(root, "tests", "fixtures", "frontmatter-parity.json"), "utf8")
);

const failures = [];
for (const testCase of fixtures.cases) {
  const { metadata } = parseFrontmatter(testCase.content);
  for (const [key, expected] of Object.entries(testCase.expect)) {
    if (metadata[key] !== expected) {
      failures.push({ id: testCase.id, key, expected, actual: metadata[key] ?? null });
    }
  }
  if (Object.keys(testCase.expect).length === 0 && Object.keys(metadata).length !== 0) {
    failures.push({ id: testCase.id, key: "(none expected)", expected: {}, actual: metadata });
  }
}

if (failures.length) {
  console.error(JSON.stringify({ status: "FAIL", failures }, null, 2));
  process.exit(1);
}
console.log(`frontmatter parity (JS side): PASS (${fixtures.cases.length} cases)`);
