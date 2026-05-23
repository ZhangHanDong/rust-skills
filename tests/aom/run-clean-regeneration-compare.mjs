#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

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

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function splitCsv(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function runCommand(label, command, args, options = {}) {
  const startedAt = Date.now();
  const result = spawnSync(command, args, {
    cwd: options.cwd || root,
    env: options.env || process.env,
    encoding: "utf8",
    shell: options.shell === true,
    timeout: options.timeoutMs || 600000,
    maxBuffer: 1024 * 1024 * 64
  });
  return {
    label,
    command,
    args,
    cwd: options.cwd || root,
    status: result.status === 0 ? "PASS" : "FAIL",
    exitCode: result.status,
    signal: result.signal,
    durationMs: Date.now() - startedAt,
    stdout: result.stdout || "",
    stderr: result.stderr || ""
  };
}

function runPrepareCommand(label, targetRoot, command) {
  if (!command) {
    return {
      label: `${label}-prepare`,
      status: "SKIP",
      reason: "no prepare command provided"
    };
  }
  return runCommand(`${label}-prepare`, "sh", ["-lc", command], {
    env: {
      ...process.env,
      REGENERATION_PROFILE: label,
      REGENERATION_ROOT: targetRoot
    }
  });
}

function containsSkillFiles(dirPath) {
  if (!fs.existsSync(dirPath)) return false;
  if (fs.existsSync(path.join(dirPath, "SKILL.md"))) return true;
  return fs.readdirSync(dirPath, { withFileTypes: true })
    .some((entry) => entry.isDirectory() && fs.existsSync(path.join(dirPath, entry.name, "SKILL.md")));
}

function resolveComparedRoot(label, inputPath, skipAgentMatrix) {
  if (!inputPath) throw new Error(`--${label}-root is required`);
  const absolute = path.resolve(inputPath);
  const nestedSkillsDir = path.join(absolute, "skills");
  if (fs.existsSync(nestedSkillsDir)) {
    return {
      root: absolute,
      skillsPath: nestedSkillsDir,
      directSkillsPath: false
    };
  }
  if (skipAgentMatrix && containsSkillFiles(absolute)) {
    return {
      root: absolute,
      skillsPath: absolute,
      directSkillsPath: true
    };
  }
  throw new Error(`${label} root must contain a skills directory: ${nestedSkillsDir}`);
}

function runSkillGate(label, comparedRoot, reportDir, strictGenerated) {
  const reportPath = path.join(reportDir, `${label}-skill-generation-gate.json`);
  const args = [
    path.join(root, "tests", "aom", "run-skill-generation-gate.mjs"),
    "--skills",
    comparedRoot.skillsPath,
    "--report",
    reportPath,
    "--json"
  ];
  if (strictGenerated) args.push("--strict-generated");
  const result = runCommand(`${label}-skill-generation`, process.execPath, args);
  const report = fs.existsSync(reportPath) ? readJson(reportPath) : null;
  return { result, reportPath, report };
}

function runAgentMatrix(mainRoot, currentRoot, reportDir, options) {
  const runId = options.matrixRunId;
  const args = [
    path.join(root, "tests", "aom", "run-agent-matrix.mjs"),
    "--cases",
    options.casesPath,
    "--benchmark-mode",
    "--engines",
    options.engines,
    "--profiles",
    "baseline,rust-main-regenerated,rust-skills",
    "--profile-root",
    `rust-main-regenerated=${mainRoot}`,
    "--profile-root",
    `rust-skills=${currentRoot}`,
    "--repeats",
    String(options.repeats),
    "--concurrency",
    String(options.concurrency),
    "--timeout-ms",
    String(options.timeoutMs),
    "--run-id",
    runId
  ];
  if (options.caseFilter) args.push("--case-filter", options.caseFilter);
  if (options.allowRealAgents) args.push("--allow-real-agents");
  if (options.requireRealAgents) args.push("--require-real-agents");
  const result = runCommand("agent-matrix", process.execPath, args, {
    timeoutMs: options.matrixTimeoutMs
  });
  const matrixReportPath = path.join(root, "tests", "results", "agent-matrix", runId, "report.json");
  const report = fs.existsSync(matrixReportPath) ? readJson(matrixReportPath) : null;
  return { result, reportPath: matrixReportPath, report };
}

const runId = argValue(
  "--run-id",
  `clean-regeneration-${new Date().toISOString().replace(/[-:.]/g, "").slice(0, 15)}`
);
const reportDir = path.resolve(argValue(
  "--report-dir",
  path.join(root, "tests", "results", "clean-regeneration", runId)
));
const reportPath = path.join(reportDir, "report.json");
const strictGenerated = hasFlag("--strict-generated");
const skipAgentMatrix = hasFlag("--skip-agent-matrix");
const mainRootArg = argValue("--main-root");
const currentRootArg = argValue("--current-root");
if (!mainRootArg) throw new Error("--main-root is required");
if (!currentRootArg) throw new Error("--current-root is required");
const mainRootInput = path.resolve(mainRootArg);
const currentRootInput = path.resolve(currentRootArg);
const prepare = {
  main: runPrepareCommand("main", mainRootInput, argValue("--main-prepare-command", null)),
  current: runPrepareCommand("current", currentRootInput, argValue("--current-prepare-command", null))
};
if (prepare.main.status === "FAIL" || prepare.current.status === "FAIL") {
  ensureDir(reportDir);
  const report = {
    status: "FAIL",
    runId,
    generatedAt: new Date().toISOString(),
    policy: {
      generatedArtifactBoundary: "Prepare commands must clear and regenerate roots before comparison when provided.",
      strictGenerated,
      skipAgentMatrix
    },
    prepare
  };
  writeJson(reportPath, report);
  console.log(JSON.stringify({ status: "FAIL", report: reportPath, prepare }, null, 2));
  process.exit(1);
}
const mainRoot = resolveComparedRoot("main", mainRootInput, skipAgentMatrix);
const currentRoot = resolveComparedRoot("current", currentRootInput, skipAgentMatrix);
const allowRealAgents = hasFlag("--allow-real-agents") || process.env.RUN_REAL_AGENTS === "1";
const requireRealAgents = hasFlag("--require-real-agents");

const options = {
  casesPath: path.resolve(argValue(
    "--cases",
    path.join(root, "tests", "aom", "fixtures", "agent-matrix-comprehensive.json")
  )),
  engines: argValue("--engines", "codex,claude-code"),
  repeats: Number.parseInt(argValue("--repeats", "1"), 10),
  concurrency: Number.parseInt(argValue("--concurrency", "1"), 10),
  timeoutMs: Number.parseInt(argValue("--timeout-ms", "600000"), 10),
  matrixTimeoutMs: Number.parseInt(argValue("--matrix-timeout-ms", "3600000"), 10),
  matrixRunId: argValue("--matrix-run-id", `${runId}-agent-matrix`),
  caseFilter: argValue("--case-filter", null),
  allowRealAgents,
  requireRealAgents
};

if (splitCsv(options.engines).length === 0) throw new Error("--engines must not be empty");
if (!Number.isFinite(options.repeats) || options.repeats < 1) {
  throw new Error("--repeats must be >= 1");
}
if (!Number.isFinite(options.concurrency) || options.concurrency < 1) {
  throw new Error("--concurrency must be >= 1");
}

ensureDir(reportDir);
const mainGate = runSkillGate("main", mainRoot, reportDir, strictGenerated);
const currentGate = runSkillGate("current", currentRoot, reportDir, strictGenerated);
const gatesPassed = mainGate.result.status === "PASS" && currentGate.result.status === "PASS";
const matrix = skipAgentMatrix || !gatesPassed
  ? null
  : runAgentMatrix(mainRoot.root, currentRoot.root, reportDir, options);

const matrixStatus = matrix?.report?.status || (skipAgentMatrix ? "SKIP" : "NOT_RUN");
const status = !gatesPassed
  ? "FAIL"
  : matrixStatus === "FAIL"
    ? "FAIL"
    : matrixStatus === "MEASURED"
      ? "MEASURED"
      : "PASS";

const report = {
  status,
  runId,
  generatedAt: new Date().toISOString(),
  policy: {
    generatedArtifactBoundary: "Compare regenerated roots only; do not hand-edit generated skills for benchmark claims.",
    strictGenerated,
    skipAgentMatrix
  },
  roots: {
    main: mainRoot,
    current: currentRoot
  },
  prepare,
  gates: {
    main: mainGate,
    current: currentGate
  },
  agentMatrix: matrix,
  options
};
writeJson(reportPath, report);
console.log(JSON.stringify({
  status,
  report: reportPath,
  gates: {
    main: mainGate.report?.status || mainGate.result.status,
    current: currentGate.report?.status || currentGate.result.status
  },
  agentMatrix: matrixStatus
}, null, 2));

if (status === "FAIL") process.exit(1);
