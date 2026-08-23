#!/usr/bin/env node
/**
 * Routing recall/precision eval — deterministic, no agents, runs in seconds.
 *
 * For each annotated prompt, invokes the rust-skills route command and compares
 * the matched skills against ground-truth expected skills (tests/routing-eval/
 * expected-skills.json). Reports per-case hit/miss plus aggregate recall and
 * precision so routing-table changes can be validated without an agent bench.
 *
 * Usage:
 *   node tests/routing-eval/routing-eval.mjs [--json] [--bin <path>] [--root <path>]
 *
 * Recall  = of the expected core skills, how many were routed (the key metric —
 *           a low recall means prompts silently miss the skill they need).
 * Precision (informational) = of the non-router skills routed, how many were in
 *           the expected/allowlist set. The router deliberately co-loads domain
 *           + mechanic skills, so precision is reported but not gated.
 *
 * mode: "all"  every expected skill must be routed for the case to pass recall
 *       "any"  at least one expected skill must be routed
 *       "none" no specific expectation (process/tooling prompt); excluded from recall
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { repoRoot, resolveBin, routedSkills } from "../lib/route-cli.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));

function argValue(name, fallback = null) {
  const i = process.argv.indexOf(name);
  if (i === -1) return fallback;
  const v = process.argv[i + 1];
  if (!v || v.startsWith("--")) throw new Error(`${name} requires a value`);
  return v;
}
const jsonOut = process.argv.includes("--json");
const root = path.resolve(argValue("--root", repoRoot));
const bin = argValue("--bin", null) ? path.resolve(argValue("--bin", null)) : resolveBin();

function routeSkills(prompt) {
  return routedSkills(prompt, { root, bin }).skills;
}

const dataset = JSON.parse(fs.readFileSync(path.join(HERE, "expected-skills.json"), "utf8"));
const cases = dataset.cases;

let recallCases = 0;
let recallHits = 0;
let expectedTotal = 0;
let expectedMatched = 0;
let routedTotal = 0;
let routedExpected = 0;
const misses = [];
const perCase = [];

for (const c of cases) {
  const routed = routeSkills(c.prompt);
  const expected = c.expect || [];
  const inter = expected.filter((s) => routed.includes(s));

  let recallPass = null;
  if (c.mode === "none") {
    recallPass = null; // excluded
  } else if (c.mode === "any") {
    recallPass = inter.length > 0;
  } else {
    recallPass = inter.length === expected.length;
  }

  if (recallPass !== null) {
    recallCases += 1;
    if (recallPass) recallHits += 1;
    // fine-grained recall on "all" cases counts each expected skill
    if (c.mode === "all") {
      expectedTotal += expected.length;
      expectedMatched += inter.length;
    } else {
      // "any" contributes 1 expected slot, matched if inter>0
      expectedTotal += 1;
      expectedMatched += inter.length > 0 ? 1 : 0;
    }
  }

  // precision: routed non-router skills that fall in the expected/allow set
  routedTotal += routed.length;
  routedExpected += routed.filter((s) => expected.includes(s)).length;

  const row = { id: c.id, category: c.category, mode: c.mode, expect: expected, routed, hit: inter, recallPass };
  perCase.push(row);
  if (recallPass === false) {
    misses.push({ id: c.id, category: c.category, expect: expected, routed, mode: c.mode });
  }
}

const caseRecall = recallCases ? recallHits / recallCases : 0;
const skillRecall = expectedTotal ? expectedMatched / expectedTotal : 0;
const precision = routedTotal ? routedExpected / routedTotal : 0;

const summary = {
  totalCases: cases.length,
  scoredCases: recallCases,
  excludedCases: cases.length - recallCases,
  caseRecall: Number(caseRecall.toFixed(4)),
  skillRecall: Number(skillRecall.toFixed(4)),
  precisionInformational: Number(precision.toFixed(4)),
  missCount: misses.length
};

if (jsonOut) {
  process.stdout.write(JSON.stringify({ summary, misses, perCase }, null, 2) + "\n");
} else {
  process.stdout.write("=== Routing Recall Eval ===\n");
  process.stdout.write(`binary: ${bin}\nroot: ${root}\n\n`);
  process.stdout.write(`cases: ${summary.totalCases} (scored ${summary.scoredCases}, excluded ${summary.excludedCases})\n`);
  process.stdout.write(`case recall:   ${(caseRecall * 100).toFixed(1)}%  (cases where expected skills surfaced)\n`);
  process.stdout.write(`skill recall:  ${(skillRecall * 100).toFixed(1)}%  (expected skill slots filled)\n`);
  process.stdout.write(`precision*:    ${(precision * 100).toFixed(1)}%  (routed skills in expected set; informational)\n\n`);
  if (misses.length) {
    process.stdout.write(`--- ${misses.length} MISSES ---\n`);
    for (const m of misses) {
      process.stdout.write(`[${m.category}] ${m.id}\n  expect(${m.mode}): ${m.expect.join(", ") || "(none)"}\n  routed: ${m.routed.join(", ") || "(none)"}\n`);
    }
  } else {
    process.stdout.write("no misses — all scored cases surfaced their expected skills\n");
  }
}

process.exit(misses.length === 0 ? 0 : 1);
