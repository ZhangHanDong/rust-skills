#!/usr/bin/env node
// Version-consistency gate. The version string lives in 8 places that are
// hand-synced (package.json, Cargo.toml, metadata.json, .claude-plugin/
// plugin.json, three README badges) — the 2.2.1 bump touched all of them
// manually. This test fails when any of them drifts from package.json.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const canonical = JSON.parse(read("package.json")).version;
const findings = [];

function check(rel, actual) {
  if (actual !== canonical) {
    findings.push({ file: rel, expected: canonical, actual: actual ?? "(not found)" });
  }
}

check("metadata.json", JSON.parse(read("metadata.json")).version);
check(".claude-plugin/plugin.json", JSON.parse(read(".claude-plugin/plugin.json")).version);
check(
  "crates/rust-skills-cli/Cargo.toml",
  read("crates/rust-skills-cli/Cargo.toml").match(/^version\s*=\s*"([^"]+)"/m)?.[1]
);
for (const readme of ["README.md", "README-ja.md", "README-zh.md"]) {
  check(readme, read(readme).match(/version-([0-9.]+)-green/)?.[1]);
}

if (findings.length) {
  console.error(JSON.stringify({ status: "FAIL", canonical, findings }, null, 2));
  process.exit(1);
}
console.log(`version consistency test: PASS (${canonical} across 7 files)`);
