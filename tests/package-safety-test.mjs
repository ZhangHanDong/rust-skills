#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const result = spawnSync("npm", ["pack", "--dry-run", "--ignore-scripts", "--json"], {
  cwd: root,
  encoding: "utf8"
});
assert(result.status === 0, result.stderr || result.stdout);

const [pack] = JSON.parse(result.stdout);
const files = new Set((pack.files || []).map((file) => file.path));

for (const required of [
  "package.json",
  "rust-skills.js",
  "install.js",
  "lib/routing.js",
  "index/routes.json",
  "installer/skills/rust-skills/SKILL.md"
]) {
  assert(files.has(required), `package is missing required file: ${required}`);
}

for (const file of files) {
  assert(!file.startsWith("tests/"), `package should not include tests: ${file}`);
  assert(!file.startsWith(".github/"), `package should not include .github files: ${file}`);
  assert(!file.startsWith("doc/"), `package should not include local workflow state docs: ${file}`);
  assert(file !== ".mcp.json", "package should not include local MCP config");
  assert(!/(^|\/)(state\.json|progress\.md|project-info\.md|dev\.md|flow-config\.json|preferences\.md)$/.test(file), `package should not include state file: ${file}`);
}

const internalWorkflowTerms = [
  "Ara" + "gorn",
  "checkpoint-" + "swarm",
  "path-" + "matrix",
  "dev-" + "swarm",
  "private-" + "state",
  "req-" + "change",
  "ze" + "llij",
  "t" + "mux",
  "Mile" + "stone"
];
const forbiddenPublicContent = [
  ...internalWorkflowTerms.map((term) => new RegExp(`\\b${term}\\b`, "i")),
  /\bM[0-9]+\b/
];

for (const file of files) {
  const absolute = path.join(root, file);
  if (!fs.existsSync(absolute) || fs.statSync(absolute).size > 2_000_000) continue;
  const content = fs.readFileSync(absolute, "utf8");
  for (const pattern of forbiddenPublicContent) {
    assert(!pattern.test(content), `package file contains internal workflow term ${pattern}: ${file}`);
  }
}

console.log(`package safety test: PASS files=${files.size}`);
