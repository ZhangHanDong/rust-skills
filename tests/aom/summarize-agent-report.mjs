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

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function loadReport(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function pct(value) {
  return `${(Number(value || 0) * 100).toFixed(1)}%`;
}

function profileRows(summary) {
  return Object.entries(summary.profiles || {})
    .map(([profile, item]) => [
      profile,
      item.total,
      item.runnable,
      item.skipped,
      pct(item.responseGenerationRate),
      pct(item.artifactGenerationRate),
      pct(item.patchGenerationRate),
      pct(item.qualityGatePassRate),
      pct(item.timeoutRate)
    ]);
}

function markdown(report) {
  const lines = [
    `# Agent Benchmark Evidence: ${report.runId}`,
    "",
    `- Status: ${report.status}`,
    `- Generated at: ${report.generatedAt}`,
    `- Engines: ${(report.engines || []).join(", ")}`,
    `- Profiles: ${(report.profiles || []).join(", ")}`,
    `- Repeats: ${report.repeats}`,
    `- Concurrency: ${report.concurrency}`,
    `- Benchmark mode: ${Boolean(report.benchmarkMode)}`,
    `- Codex isolation: ignoreUserConfig=${Boolean(report.codex?.ignoreUserConfig)}, ignoreRules=${Boolean(report.codex?.ignoreRules)}`,
    `- Cases: ${report.summary.total}`,
    `- Runnable: ${report.summary.runnable}`,
    `- Skipped: ${report.summary.skipped}`,
    `- Failed: ${report.summary.failed}`,
    `- Quality gate pass rate: ${pct(report.summary.qualityGatePassRate)}`,
    `- Timeout rate: ${pct(report.summary.timeoutRate)}`,
    "",
    "## Profiles",
    "",
    "| Profile | Total | Runnable | Skipped | Response | Artifact | Patch | Quality | Timeout |",
    "|---------|-------|----------|---------|----------|----------|-------|---------|---------|"
  ];
  for (const row of profileRows(report.summary)) lines.push(`| ${row.join(" | ")} |`);
  lines.push("", "## Comparison", "");
  const comparison = report.summary.comparisons?.["rust-skills_vs_baseline"] || {};
  for (const [key, value] of Object.entries(comparison)) {
    lines.push(`- ${key}: ${value}`);
  }
  lines.push("", "## Source Report", "", `\`${report.report || report.runRoot || report.runId}\``);
  return `${lines.join("\n")}\n`;
}

const reportPath = argValue("--report");
if (!reportPath) throw new Error("--report is required");
const outputPath = argValue("--out", null);
const report = loadReport(reportPath);
const summary = {
  runId: report.runId,
  status: report.status,
  generatedAt: report.generatedAt,
  summary: report.summary
};

if (outputPath) {
  ensureDir(path.dirname(outputPath));
  const content = outputPath.endsWith(".md")
    ? markdown({ ...report, report: reportPath })
    : `${JSON.stringify(summary, null, 2)}\n`;
  fs.writeFileSync(outputPath, content);
  console.log(JSON.stringify({ status: "PASS", output: outputPath }, null, 2));
} else {
  console.log(JSON.stringify(summary, null, 2));
}
