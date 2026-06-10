#!/usr/bin/env node
// Held-out generalization gate. Unlike tests/routing-corpus.json (which
// co-evolved with index/routes.json and acts as an exact regression pin),
// this corpus was authored blind against the router. Expectations here are
// FLOOR thresholds, not perfection: if you have to edit this corpus to make
// the router pass, the router lost generalization — fix the router instead.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const corpus = JSON.parse(
  fs.readFileSync(path.join(root, "tests", "fixtures", "heldout-corpus.json"), "utf8")
);

const binaryName = process.platform === "win32" ? "rust-skills.exe" : "rust-skills";
const nativeBin = ["release", "debug"]
  .map((profile) => path.join(root, "target", profile, binaryName))
  .find((candidate) => fs.existsSync(candidate));

const FLOORS = {
  accuracy: 0.9,
  recall: 0.9,
  precision: 0.85,
  false_positive_rate: 0.15
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function route(prompt) {
  const command = nativeBin || "cargo";
  const args = nativeBin
    ? ["route", "--json", "--", "-"]
    : ["run", "--quiet", "-p", "rust-skills-cli", "--bin", "rust-skills", "--", "route", "--json", "--", "-"];
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8", input: prompt });
  assert(result.status === 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

let tp = 0;
let fp = 0;
let tn = 0;
let fn = 0;
const misses = [];

for (const testCase of corpus) {
  const routed = route(testCase.prompt);
  const actual = routed.should_inject;
  if (testCase.rust && actual) tp += 1;
  else if (!testCase.rust && actual) {
    fp += 1;
    misses.push({ id: testCase.id, kind: "FP", prompt: testCase.prompt });
  } else if (!testCase.rust && !actual) tn += 1;
  else {
    fn += 1;
    misses.push({ id: testCase.id, kind: "FN", prompt: testCase.prompt });
  }
}

const total = corpus.length;
const stats = {
  total,
  true_positive: tp,
  false_positive: fp,
  true_negative: tn,
  false_negative: fn,
  precision: Number((tp / Math.max(1, tp + fp)).toFixed(3)),
  recall: Number((tp / Math.max(1, tp + fn)).toFixed(3)),
  false_positive_rate: Number((fp / Math.max(1, fp + tn)).toFixed(3)),
  accuracy: Number(((tp + tn) / Math.max(1, total)).toFixed(3)),
  misses
};

console.log(JSON.stringify({ status: "computed", floors: FLOORS, stats }, null, 2));

assert(
  stats.accuracy >= FLOORS.accuracy,
  `held-out accuracy ${stats.accuracy} below floor ${FLOORS.accuracy}`
);
assert(stats.recall >= FLOORS.recall, `held-out recall ${stats.recall} below floor ${FLOORS.recall}`);
assert(
  stats.precision >= FLOORS.precision,
  `held-out precision ${stats.precision} below floor ${FLOORS.precision}`
);
assert(
  stats.false_positive_rate <= FLOORS.false_positive_rate,
  `held-out FP rate ${stats.false_positive_rate} above ceiling ${FLOORS.false_positive_rate}`
);
console.log("routing heldout test: PASS");
