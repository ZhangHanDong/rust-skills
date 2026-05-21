#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const corpusPath = path.join(root, "tests", "routing-corpus.json");
const baselinePath = path.join(root, "tests", "fixtures", "legacy-hook-baseline.json");
const corpus = JSON.parse(fs.readFileSync(corpusPath, "utf8"));
const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function compileMatcher(source) {
  let pattern = String(source || "");
  let flags = "";
  if (pattern.startsWith("(?i)")) {
    pattern = pattern.slice(4);
    flags = "i";
  }
  return new RegExp(pattern, flags);
}

function route(prompt) {
  const result = spawnSync(process.execPath, [path.join(root, "rust-skills.js"), "route", "--json", prompt], {
    cwd: root,
    encoding: "utf8"
  });
  assert(result.status === 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

function baseStats(name) {
  return {
    name,
    total: 0,
    rust_total: 0,
    non_rust_total: 0,
    true_positive: 0,
    false_positive: 0,
    true_negative: 0,
    false_negative: 0,
    misses: []
  };
}

function finishStats(stats) {
  const positives = stats.true_positive + stats.false_positive;
  const rustCases = stats.true_positive + stats.false_negative;
  const nonRustCases = stats.false_positive + stats.true_negative;
  stats.precision = Number((stats.true_positive / Math.max(1, positives)).toFixed(3));
  stats.recall = Number((stats.true_positive / Math.max(1, rustCases)).toFixed(3));
  stats.false_positive_rate = Number((stats.false_positive / Math.max(1, nonRustCases)).toFixed(3));
  stats.accuracy = Number(((stats.true_positive + stats.true_negative) / Math.max(1, stats.total)).toFixed(3));
  return stats;
}

function classify(stats, testCase, actual) {
  const expected = testCase.expected.rust;
  stats.total += 1;
  if (expected) stats.rust_total += 1;
  if (!expected) stats.non_rust_total += 1;

  if (expected && actual) stats.true_positive += 1;
  else if (!expected && actual) {
    stats.false_positive += 1;
    stats.misses.push({ id: testCase.id, kind: "FP" });
  } else if (!expected && !actual) stats.true_negative += 1;
  else {
    stats.false_negative += 1;
    stats.misses.push({ id: testCase.id, kind: "FN" });
  }
}

const legacyMatcher = compileMatcher(baseline.matcher);
const legacyStats = baseStats(baseline.name);
const currentStats = baseStats("current-cli-router");
let expectedSkillHits = 0;
let expectedSkillTotal = 0;
let contextCost = 0;

for (const testCase of corpus) {
  classify(legacyStats, testCase, legacyMatcher.test(testCase.prompt));

  const routed = route(testCase.prompt);
  classify(currentStats, testCase, routed.should_inject);
  contextCost += routed.context_cost || 0;

  for (const skill of testCase.expected.skills) {
    expectedSkillTotal += 1;
    if (routed.skills.includes(skill)) expectedSkillHits += 1;
  }
}

finishStats(legacyStats);
finishStats(currentStats);
currentStats.skill_recall = Number((expectedSkillHits / Math.max(1, expectedSkillTotal)).toFixed(3));
currentStats.context_cost = contextCost;
currentStats.avg_context_cost_per_rust_case = Number((contextCost / Math.max(1, currentStats.rust_total)).toFixed(3));

assert(
  currentStats.recall >= legacyStats.recall,
  `current recall regressed: ${currentStats.recall} < ${legacyStats.recall}`
);
assert(
  currentStats.precision >= legacyStats.precision,
  `current precision regressed: ${currentStats.precision} < ${legacyStats.precision}`
);
assert(
  currentStats.false_positive_rate < legacyStats.false_positive_rate,
  `current false positive rate did not improve: ${currentStats.false_positive_rate} >= ${legacyStats.false_positive_rate}`
);
assert(currentStats.false_positive === 0, `current false positives: ${currentStats.false_positive}`);
assert(currentStats.false_negative === 0, `current false negatives: ${currentStats.false_negative}`);
assert(currentStats.skill_recall === 1, `current skill recall: ${currentStats.skill_recall}`);

console.log(JSON.stringify({
  status: "PASS",
  corpus: {
    total: corpus.length,
    rust: currentStats.rust_total,
    non_rust: currentStats.non_rust_total
  },
  baseline: legacyStats,
  current: currentStats,
  improvement: {
    precision_delta: Number((currentStats.precision - legacyStats.precision).toFixed(3)),
    false_positive_rate_delta: Number((currentStats.false_positive_rate - legacyStats.false_positive_rate).toFixed(3)),
    false_positive_delta: currentStats.false_positive - legacyStats.false_positive
  }
}, null, 2));
