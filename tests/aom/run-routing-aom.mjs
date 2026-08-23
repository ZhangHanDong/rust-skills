#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const { routePrompt } = require(path.join(root, "lib", "routing.js"));

function argValue(name, fallback = null) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value`);
  return value;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function toSet(values) {
  return new Set(Array.isArray(values) ? values : []);
}

function intersectionSize(left, right) {
  let count = 0;
  for (const value of left) if (right.has(value)) count += 1;
  return count;
}

function evaluateCase(testCase) {
  const route = routePrompt(testCase.prompt, { root });
  const actualInject = route.should_inject === true;
  const expectedInject = testCase.expectedInject === true;
  const actualSkills = toSet(route.skills);
  const requiredSkills = toSet(testCase.requiredSkills);
  const forbiddenSkills = toSet(testCase.forbiddenSkills);
  const failures = [];

  if (actualInject !== expectedInject) {
    failures.push({
      kind: "trigger_mismatch",
      expected: expectedInject,
      actual: actualInject
    });
  }

  for (const skill of requiredSkills) {
    if (!actualSkills.has(skill)) failures.push({ kind: "missing_required_skill", skill });
  }

  for (const skill of forbiddenSkills) {
    if (actualSkills.has(skill)) failures.push({ kind: "forbidden_skill_present", skill });
  }

  if (Number.isFinite(testCase.maxContextCost) && route.context_cost > testCase.maxContextCost) {
    failures.push({
      kind: "context_cost_exceeded",
      expected: testCase.maxContextCost,
      actual: route.context_cost
    });
  }

  const relevantExpected = new Set([...requiredSkills, ...forbiddenSkills]);
  const relevantMatches = intersectionSize(actualSkills, requiredSkills);
  const forbiddenMatches = intersectionSize(actualSkills, forbiddenSkills);
  const extraSkills = route.skills.filter((skill) =>
    expectedInject && !requiredSkills.has(skill) && skill !== "rust-router"
  );

  return {
    id: testCase.id,
    prompt: testCase.prompt,
    expectedInject,
    actualInject,
    requiredSkills: [...requiredSkills],
    forbiddenSkills: [...forbiddenSkills],
    actualSkills: route.skills,
    extraSkills,
    relevantExpected: [...relevantExpected],
    relevantMatches,
    forbiddenMatches,
    contextCost: route.context_cost || 0,
    route,
    failures,
    passed: failures.length === 0
  };
}

function divide(numerator, denominator) {
  return Number((numerator / Math.max(1, denominator)).toFixed(4));
}

function summarize(results) {
  let expectedPositive = 0;
  let expectedNegative = 0;
  let truePositive = 0;
  let trueNegative = 0;
  let falsePositive = 0;
  let falseNegative = 0;
  let requiredTotal = 0;
  let requiredHit = 0;
  let forbiddenTotal = 0;
  let forbiddenHit = 0;
  let extraSkillTotal = 0;
  let actualSkillTotal = 0;
  let rustContextCost = 0;
  let rustCaseCount = 0;

  for (const result of results) {
    if (result.expectedInject) expectedPositive += 1;
    else expectedNegative += 1;

    if (result.expectedInject && result.actualInject) truePositive += 1;
    else if (!result.expectedInject && !result.actualInject) trueNegative += 1;
    else if (!result.expectedInject && result.actualInject) falsePositive += 1;
    else falseNegative += 1;

    requiredTotal += result.requiredSkills.length;
    requiredHit += result.requiredSkills.filter((skill) => result.actualSkills.includes(skill)).length;
    forbiddenTotal += result.forbiddenSkills.length;
    forbiddenHit += result.forbiddenSkills.filter((skill) => result.actualSkills.includes(skill)).length;
    extraSkillTotal += result.extraSkills.length;
    actualSkillTotal += result.actualSkills.length;

    if (result.expectedInject) {
      rustCaseCount += 1;
      rustContextCost += result.contextCost;
    }
  }

  return {
    total: results.length,
    passed: results.filter((result) => result.passed).length,
    failed: results.filter((result) => !result.passed).length,
    expectedPositive,
    expectedNegative,
    truePositive,
    trueNegative,
    falsePositive,
    falseNegative,
    triggerPrecision: divide(truePositive, truePositive + falsePositive),
    triggerRecall: divide(truePositive, truePositive + falseNegative),
    falsePositiveRate: divide(falsePositive, falsePositive + trueNegative),
    requiredSkillRecall: divide(requiredHit, requiredTotal),
    forbiddenSkillViolationRate: divide(forbiddenHit, forbiddenTotal),
    overInjectionRate: divide(extraSkillTotal, actualSkillTotal),
    avgContextCostPerRustCase: divide(rustContextCost, rustCaseCount)
  };
}

function thresholdFailures(summary, thresholds) {
  const failures = [];
  for (const [metric, expected] of Object.entries(thresholds)) {
    if (!Number.isFinite(expected)) continue;
    const actual = summary[metric];
    const isMax = metric.endsWith("Rate") || metric.startsWith("avg");
    if (isMax && actual > expected) failures.push({ metric, actual, expected, operator: "<=" });
    if (!isMax && actual < expected) failures.push({ metric, actual, expected, operator: ">=" });
  }
  return failures;
}

const casesPath = path.resolve(argValue(
  "--cases",
  path.join(root, "tests", "aom", "fixtures", "routing-aom.json")
));
const reportPath = path.resolve(argValue(
  "--report",
  path.join(root, "tests", "results", "routing-aom-report.json")
));
const tag = argValue("--tag", null);
const cases = readJson(casesPath)
  .filter((testCase) => !tag || (testCase.tags || []).includes(tag));

if (cases.length === 0) throw new Error(`no AOM cases matched ${casesPath}`);

const results = cases.map(evaluateCase);
const summary = summarize(results);
const thresholds = {
  triggerPrecision: Number(argValue("--min-trigger-precision", "0.98")),
  triggerRecall: Number(argValue("--min-trigger-recall", "0.95")),
  falsePositiveRate: Number(argValue("--max-false-positive-rate", "0.02")),
  requiredSkillRecall: Number(argValue("--min-required-skill-recall", "0.98")),
  forbiddenSkillViolationRate: Number(argValue("--max-forbidden-skill-violation-rate", "0")),
  overInjectionRate: Number(argValue("--max-over-injection-rate", "0.18")),
  avgContextCostPerRustCase: Number(argValue("--max-avg-context-cost", "3.2"))
};
const failures = [
  ...results.flatMap((result) => result.failures.map((failure) => ({
    id: result.id,
    ...failure
  }))),
  ...thresholdFailures(summary, thresholds)
];
const report = {
  status: failures.length === 0 ? "PASS" : "FAIL",
  generatedAt: new Date().toISOString(),
  casesPath,
  tag,
  thresholds,
  summary,
  failures,
  results: hasFlag("--include-routes")
    ? results
    : results.map(({ route, ...result }) => result)
};

writeJson(reportPath, report);
console.log(JSON.stringify({
  status: report.status,
  report: reportPath,
  summary
}, null, 2));

if (failures.length > 0) {
  console.error(JSON.stringify({ status: "FAIL", failures: failures.slice(0, 20) }, null, 2));
  process.exit(1);
}
