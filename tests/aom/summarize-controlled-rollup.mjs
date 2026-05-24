#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

function argValue(name, fallback = null) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value`);
  return value;
}

function argValues(name) {
  const values = [];
  for (let index = 0; index < process.argv.length; index += 1) {
    if (process.argv[index] !== name) continue;
    const value = process.argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`${name} requires a value`);
    values.push(value);
  }
  return values;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function pct(value) {
  return `${(Number(value || 0) * 100).toFixed(2)}%`;
}

function pp(value) {
  return `${(Number(value || 0) * 100).toFixed(2)} pp`;
}

function parseCategoryReport(value) {
  const separator = value.indexOf("=");
  if (separator <= 0 || separator === value.length - 1) {
    throw new Error(`--category-report must use category=/path/report.json form: ${value}`);
  }
  return {
    category: value.slice(0, separator).trim(),
    reportPath: path.resolve(value.slice(separator + 1).trim())
  };
}

function summarizeBase(results) {
  const runnable = results.filter((result) => result.status !== "SKIP");
  const generatedResponses = runnable.filter((result) => result.metrics?.responseGenerated).length;
  const generatedArtifacts = runnable.filter((result) => result.metrics?.artifactGenerated).length;
  const generatedPatches = runnable.filter((result) => result.metrics?.patchGenerated).length;
  const passed = runnable.filter((result) => result.hardGate === "PASS").length;
  return {
    total: results.length,
    runnable: runnable.length,
    skipped: results.length - runnable.length,
    passed,
    failed: runnable.length - passed,
    responseGenerationRate: Number((generatedResponses / Math.max(1, runnable.length)).toFixed(4)),
    artifactGenerationRate: Number((generatedArtifacts / Math.max(1, runnable.length)).toFixed(4)),
    patchGenerationRate: Number((generatedPatches / Math.max(1, runnable.length)).toFixed(4)),
    qualityGatePassRate: Number((passed / Math.max(1, runnable.length)).toFixed(4)),
    timeoutRate: Number((
      runnable.filter((result) => result.status === "TIMEOUT").length / Math.max(1, runnable.length)
    ).toFixed(4))
  };
}

function summarizeProfiles(results, profileOrder) {
  return Object.fromEntries(profileOrder.map((profile) => [
    profile,
    summarizeBase(results.filter((result) => result.profile === profile))
  ]));
}

function profileOrderFrom(results) {
  const preferred = ["baseline", "rust-main-regenerated", "rust-skills"];
  const observed = [...new Set(results.map((result) => result.profile).filter(Boolean))];
  return [
    ...preferred.filter((profile) => observed.includes(profile)),
    ...observed.filter((profile) => !preferred.includes(profile)).sort()
  ];
}

function comparison(target, base) {
  return {
    responseGenerationRateDelta: Number((
      target.responseGenerationRate - base.responseGenerationRate
    ).toFixed(4)),
    artifactGenerationRateDelta: Number((
      target.artifactGenerationRate - base.artifactGenerationRate
    ).toFixed(4)),
    patchGenerationRateDelta: Number((target.patchGenerationRate - base.patchGenerationRate).toFixed(4)),
    qualityGatePassRateDelta: Number((target.qualityGatePassRate - base.qualityGatePassRate).toFixed(4)),
    timeoutRateDelta: Number((target.timeoutRate - base.timeoutRate).toFixed(4))
  };
}

function passCell(summary) {
  return `${summary.passed}/${summary.runnable}`;
}

function metricCell(summary) {
  return `${passCell(summary)} (${pct(summary.qualityGatePassRate)})`;
}

function markdown(rollup) {
  const lines = [
    `# ${rollup.title}`,
    "",
    `- Status: ${rollup.status}`,
    `- Generated at: ${rollup.generatedAt}`,
    `- Boundary: ${rollup.boundary}`,
    `- Categories: ${rollup.categories.map((item) => item.category).join(", ")}`,
    "",
    "## Category Results",
    "",
    "| Category | Source Run | baseline | rust-main-regenerated | rust-skills |",
    "|----------|------------|----------|-----------------------|-------------|"
  ];

  for (const category of rollup.categories) {
    lines.push([
      category.category,
      category.sourceRun,
      metricCell(category.profiles.baseline || summarizeBase([])),
      metricCell(category.profiles["rust-main-regenerated"] || summarizeBase([])),
      metricCell(category.profiles["rust-skills"] || summarizeBase([]))
    ].join(" | ").replace(/^/, "| ").replace(/$/, " |"));
  }

  lines.push(
    "",
    "## Controlled Rollup",
    "",
    "| Profile | Pass | Quality | Response | Artifact | Patch | Timeout |",
    "|---------|------|---------|----------|----------|-------|---------|"
  );
  for (const profile of rollup.profileOrder) {
    const summary = rollup.rollup.profiles[profile];
    lines.push([
      profile,
      passCell(summary),
      pct(summary.qualityGatePassRate),
      pct(summary.responseGenerationRate),
      pct(summary.artifactGenerationRate),
      pct(summary.patchGenerationRate),
      pct(summary.timeoutRate)
    ].join(" | ").replace(/^/, "| ").replace(/$/, " |"));
  }

  lines.push("", "## Pairwise Deltas", "");
  for (const [name, item] of Object.entries(rollup.rollup.comparisons)) {
    lines.push(
      `- \`${name}\`: quality ${pp(item.qualityGatePassRateDelta)}, ` +
      `artifact ${pp(item.artifactGenerationRateDelta)}, patch ${pp(item.patchGenerationRateDelta)}, ` +
      `timeout ${pp(item.timeoutRateDelta)}`
    );
  }

  if (rollup.notes.length > 0) {
    lines.push("", "## Notes", "");
    for (const note of rollup.notes) lines.push(`- ${note}`);
  }

  lines.push("", "## Source Reports", "");
  for (const category of rollup.categories) {
    lines.push(`- ${category.category}: \`${category.reportPath}\``);
  }
  return `${lines.join("\n")}\n`;
}

const categorySpecs = argValues("--category-report").map(parseCategoryReport);
if (categorySpecs.length === 0) {
  throw new Error("at least one --category-report category=/path/report.json is required");
}

const title = argValue("--title", "Controlled Regeneration Rollup");
const outPath = argValue("--out", null);
const jsonOutPath = argValue("--json-out", null);
const notes = argValues("--note");
const boundary = "prompts, expected assertions, scoring, and benchmark fixtures unchanged";

const categories = categorySpecs.map((spec) => {
  const report = readJson(spec.reportPath);
  const results = (report.results || []).filter((result) => result.category === spec.category);
  if (results.length === 0) {
    throw new Error(`report has no results for category ${spec.category}: ${spec.reportPath}`);
  }
  const profileOrder = profileOrderFrom(results);
  return {
    category: spec.category,
    reportPath: path.relative(process.cwd(), spec.reportPath),
    sourceRun: report.runId,
    sourceStatus: report.status,
    sourceGeneratedAt: report.generatedAt,
    repeats: report.repeats,
    concurrency: report.concurrency,
    profiles: summarizeProfiles(results, profileOrder)
  };
});

const allResults = categorySpecs.flatMap((spec) => {
  const report = readJson(spec.reportPath);
  return (report.results || []).filter((result) => result.category === spec.category);
});
const profileOrder = profileOrderFrom(allResults);
const profiles = summarizeProfiles(allResults, profileOrder);
const comparisons = {};
if (profiles.baseline) {
  for (const profile of profileOrder) {
    if (profile === "baseline") continue;
    comparisons[`${profile}_vs_baseline`] = comparison(profiles[profile], profiles.baseline);
  }
}
if (profiles["rust-skills"]) {
  for (const profile of profileOrder) {
    if (profile === "rust-skills") continue;
    comparisons[`rust-skills_vs_${profile}`] = comparison(profiles["rust-skills"], profiles[profile]);
  }
}

const rollup = {
  schemaVersion: 1,
  title,
  status: "MEASURED",
  generatedAt: new Date().toISOString(),
  boundary,
  profileOrder,
  categories,
  notes,
  rollup: {
    profiles,
    comparisons
  }
};

if (jsonOutPath) writeJson(path.resolve(jsonOutPath), rollup);
if (outPath) {
  const absoluteOut = path.resolve(outPath);
  ensureDir(path.dirname(absoluteOut));
  fs.writeFileSync(absoluteOut, markdown(rollup));
}

console.log(JSON.stringify({
  status: "PASS",
  out: outPath ? path.resolve(outPath) : null,
  jsonOut: jsonOutPath ? path.resolve(jsonOutPath) : null,
  rollup: rollup.rollup.profiles
}, null, 2));
