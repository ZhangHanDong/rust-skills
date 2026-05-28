#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const corpus = JSON.parse(fs.readFileSync(path.join(root, "tests", "routing-corpus.json"), "utf8"));
const nativeBin = path.join(
  root,
  "target",
  "debug",
  process.platform === "win32" ? "rust-skills.exe" : "rust-skills"
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function route(prompt) {
  const command = fs.existsSync(nativeBin) ? nativeBin : "cargo";
  const args = fs.existsSync(nativeBin)
    ? ["route", "--json", prompt]
    : ["run", "--quiet", "-p", "rust-skills-cli", "--bin", "rust-skills", "--", "route", "--json", prompt];
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8"
  });
  assert(result.status === 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

let truePositive = 0;
let falsePositive = 0;
let falseNegative = 0;
let expectedSkillHits = 0;
let expectedSkillTotal = 0;
let contextCost = 0;

for (const testCase of corpus) {
  const result = route(testCase.prompt);
  contextCost += result.context_cost || 0;
  const expectedRust = testCase.expected.rust;
  if (expectedRust && result.should_inject) truePositive += 1;
  if (!expectedRust && result.should_inject) falsePositive += 1;
  if (expectedRust && !result.should_inject) falseNegative += 1;

  assert(
    result.should_inject === expectedRust,
    `${testCase.id}: expected rust=${expectedRust}, got ${result.should_inject}\n${JSON.stringify(result, null, 2)}`
  );

  for (const skill of testCase.expected.skills) {
    expectedSkillTotal += 1;
    if (result.skills.includes(skill)) expectedSkillHits += 1;
    assert(
      result.skills.includes(skill),
      `${testCase.id}: missing ${skill}; got ${result.skills.join(", ")}`
    );
  }
}

const precision = truePositive / Math.max(1, truePositive + falsePositive);
const recall = truePositive / Math.max(1, truePositive + falseNegative);
const skillRecall = expectedSkillHits / Math.max(1, expectedSkillTotal);

assert(falsePositive === 0, `false positives: ${falsePositive}`);
assert(falseNegative === 0, `false negatives: ${falseNegative}`);
assert(skillRecall === 1, `skill recall: ${skillRecall}`);

console.log(
  `routing eval test: PASS precision=${precision.toFixed(3)} recall=${recall.toFixed(3)} ` +
  `skill_recall=${skillRecall.toFixed(3)} false_positive=${falsePositive} context_cost=${contextCost}`
);
