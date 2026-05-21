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

function splitCsv(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function runCommand(label, command, args, options = {}) {
  console.error(`[${label}] ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    cwd: options.cwd || root,
    encoding: "utf8",
    shell: options.shell === true,
    timeout: options.timeoutMs,
    maxBuffer: 1024 * 1024 * 64
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  return {
    label,
    command,
    args,
    cwd: options.cwd || root,
    required: options.required !== false,
    status: result.status === 0 ? "PASS" : "FAIL",
    exitCode: result.status,
    signal: result.signal,
    stdout: result.stdout || "",
    stderr: result.stderr || ""
  };
}

function commandAvailable(command) {
  const result = spawnSync("sh", ["-lc", `command -v ${shellQuote(command)} >/dev/null 2>&1`], {
    encoding: "utf8"
  });
  return result.status === 0;
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function remoteShell(script) {
  return [
    "if command -v zsh >/dev/null 2>&1; then",
    `exec zsh -ilc ${shellQuote(script)};`,
    "else",
    `exec sh -lc ${shellQuote(script)};`,
    "fi"
  ].join(" ");
}

function requiredRemoteTools(engines) {
  const tools = new Set(["node", "npm", "git", "cargo", "tmux", "rsync"]);
  if (engines.includes("codex")) tools.add("codex");
  if (engines.includes("claude-code")) tools.add("claude");
  return [...tools].sort();
}

function matrixArgs(runId, baseRoot = root) {
  const args = [
    path.join(baseRoot, "tests", "aom", "run-agent-matrix.mjs"),
    "--cases",
    path.join(baseRoot, "tests", "aom", "fixtures", "agent-matrix-comprehensive.json"),
    "--benchmark-mode",
    "--allow-real-agents",
    "--require-real-agents",
    "--engines",
    argValue("--engines", "codex,claude-code"),
    "--profiles",
    argValue("--profiles", "baseline,rust-skills"),
    "--repeats",
    argValue("--repeats", "3"),
    "--concurrency",
    argValue("--concurrency", "4"),
    "--timeout-ms",
    argValue("--timeout-ms", "600000"),
    "--run-id",
    runId
  ];
  const caseFilter = argValue("--case-filter", null);
  if (caseFilter) args.push("--case-filter", caseFilter);
  const maxSkillContextChars = argValue("--max-skill-context-chars", null);
  if (maxSkillContextChars) args.push("--max-skill-context-chars", maxSkillContextChars);
  if (hasFlag("--codex-use-user-config")) args.push("--codex-use-user-config");
  if (hasFlag("--codex-use-rules")) args.push("--codex-use-rules");
  return args;
}

function remoteMatrixCommand(remoteDir, runId) {
  const args = matrixArgs(runId).map((item) =>
    item.startsWith(root)
      ? path.posix.join(remoteDir, path.relative(root, item).split(path.sep).join(path.posix.sep))
      : item
  );
  return [
    `cd ${shellQuote(remoteDir)}`,
    `mkdir -p ${shellQuote(path.posix.join("tests", "results", "agent-matrix", runId))}`,
    `node ${args.map(shellQuote).join(" ")}`
  ].join(" && ");
}

function readReport(runId) {
  const reportPath = path.join(root, "tests", "results", "agent-matrix", runId, "report.json");
  if (!fs.existsSync(reportPath)) return null;
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  return {
    runId,
    reportPath,
    status: report.status,
    summary: report.summary,
    comparisons: report.summary?.comparisons || {}
  };
}

function makeSkip(label, reason, extra = {}) {
  return {
    label,
    command: null,
    args: [],
    cwd: root,
    required: false,
    status: "SKIP",
    exitCode: 0,
    signal: null,
    stdout: "",
    stderr: "",
    reason,
    ...extra
  };
}

function safeSegment(value) {
  return String(value)
    .replace(/[^a-zA-Z0-9_.-]/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "unnamed";
}

function remoteWorkDir(parentDir, runId, remoteHost, multiHost) {
  const parent = String(parentDir || "").replace(/\/+$/g, "");
  if (!parent || parent === "." || parent.includes("\0") || parent.includes("\n")) {
    throw new Error("--remote-root must be a non-empty absolute parent directory");
  }
  if (!parent.startsWith("/")) {
    throw new Error("--remote-root must be an absolute parent directory");
  }
  const parts = [parent, `rust-skills-harvest-${safeSegment(runId)}`];
  if (multiHost) parts.push(safeSegment(remoteHost));
  return path.posix.join(...parts);
}

const runId = argValue(
  "--run-id",
  `harvest-${new Date().toISOString().replace(/[-:.]/g, "").slice(0, 15)}`
);
const manifestDir = path.join(root, "tests", "results", "agent-harvest", runId);
const manifestPath = path.join(manifestDir, "manifest.json");
const results = [];
const reports = [];
const engines = splitCsv(argValue("--engines", "codex,claude-code"));
const requireRemote = hasFlag("--require-remote");

if (!hasFlag("--no-local")) {
  const localRunId = `${runId}-local`;
  results.push(runCommand("local-matrix", process.execPath, matrixArgs(localRunId)));
  const localReport = readReport(localRunId);
  if (localReport) reports.push({ location: "local", ...localReport });
} else {
  results.push(makeSkip("local-matrix", "--no-local set"));
}

const remoteHosts = splitCsv(argValue("--remote-host", ""));
if (remoteHosts.length === 0) {
  results.push(makeSkip("remote", "no --remote-host provided", {
    required: requireRemote,
    status: requireRemote ? "FAIL" : "SKIP"
  }));
}

for (const remoteHost of remoteHosts) {
  const remoteRunId = `${runId}-remote-${safeSegment(remoteHost)}`;
  const remoteDir = remoteWorkDir(
    argValue("--remote-root", "/tmp"),
    runId,
    remoteHost,
    remoteHosts.length > 1
  );
  const tools = requiredRemoteTools(engines);
  const readinessScript = [
    `tools=${shellQuote(tools.join(" "))}`,
    "missing=''",
    "for tool in $tools; do",
    "  if ! command -v \"$tool\" >/dev/null 2>&1; then missing=\"$missing $tool\"; fi",
    "done",
    "if [ -n \"$missing\" ]; then printf 'missing:%s\\n' \"$missing\" >&2; exit 2; fi",
    "printf 'ready:%s\\n' \"$tools\""
  ].join("\n");
  const readiness = runCommand("remote-readiness", "ssh", [
    "-o",
    "BatchMode=yes",
    "-o",
    "ConnectTimeout=8",
    remoteHost,
    remoteShell(readinessScript)
  ], { required: requireRemote, timeoutMs: 30000 });
  if (readiness.status === "FAIL" && !requireRemote) {
    readiness.status = "SKIP";
    readiness.reason = "optional remote not ready";
  }
  results.push(readiness);
  if (readiness.status === "PASS") {
    if (!commandAvailable("rsync")) {
      const rsyncMissing = makeSkip("remote-sync", "local rsync is not available", { remoteHost });
      if (requireRemote) {
        rsyncMissing.required = true;
        rsyncMissing.status = "FAIL";
      }
      results.push(rsyncMissing);
      continue;
    }
    const mkdir = runCommand("remote-mkdir", "ssh", [
      remoteHost,
      remoteShell(`mkdir -p ${shellQuote(remoteDir)}`)
    ], { required: true, timeoutMs: 30000 });
    results.push(mkdir);
    if (mkdir.status !== "PASS") continue;

    const sync = runCommand("remote-sync", "rsync", [
      "-a",
      "--delete",
      "--exclude",
      ".git/",
      "--exclude",
      "node_modules/",
      "--exclude",
      "target/",
      "--exclude",
      "tests/results/",
      "--exclude",
      "doc/workflow/runners/",
      "--exclude",
      "doc/evidence/runner/",
      `${root}/`,
      `${remoteHost}:${remoteDir}/`
    ], { required: true });
    results.push(sync);
    if (sync.status !== "PASS") continue;

    const remoteCommand = remoteMatrixCommand(remoteDir, remoteRunId);
    const matrix = runCommand("remote-matrix", "ssh", [remoteHost, remoteShell(remoteCommand)], {
      required: true
    });
    results.push(matrix);
    if (matrix.status !== "PASS") continue;

    ensureDir(path.join(root, "tests", "results", "agent-matrix", remoteRunId));
    const localRemoteResultDir = `${path.join(root, "tests", "results", "agent-matrix", remoteRunId)}/`;
    const copy = runCommand("remote-copy-results", "rsync", [
      "-a",
      `${remoteHost}:${remoteDir}/tests/results/agent-matrix/${remoteRunId}/`,
      localRemoteResultDir
    ], { required: true });
    results.push(copy);
    if (copy.status !== "PASS") continue;

    const remoteReport = readReport(remoteRunId);
    if (remoteReport) reports.push({ location: "remote", remoteHost, remoteDir, ...remoteReport });
  } else if (requireRemote) {
    writeJson(manifestPath, { runId, status: "FAIL", results });
    process.exit(1);
  }
}

const failed = results.filter((item) => item.status === "FAIL" && item.required !== false);
if (reports.length === 0) {
  failed.push(makeSkip("harvest", "no matrix report was produced", { required: true, status: "FAIL" }));
}
const reportStatuses = reports.map((report) => report.status);
const manifestStatus = failed.length > 0
  ? "FAIL"
  : reportStatuses.includes("MEASURED")
    ? "MEASURED"
    : "PASS";
const manifest = {
  runId,
  generatedAt: new Date().toISOString(),
  status: manifestStatus,
  localEnabled: !hasFlag("--no-local"),
  remoteHosts,
  requireRemote,
  matrix: {
    engines,
    profiles: splitCsv(argValue("--profiles", "baseline,rust-skills")),
    repeats: Number.parseInt(argValue("--repeats", "3"), 10),
    concurrency: Number.parseInt(argValue("--concurrency", "4"), 10),
    timeoutMs: Number.parseInt(argValue("--timeout-ms", "600000"), 10),
    caseFilter: argValue("--case-filter", null)
  },
  reports,
  results: results.map(({ stdout, stderr, ...item }) => ({
    ...item,
    stdoutBytes: Buffer.byteLength(stdout || ""),
    stderrBytes: Buffer.byteLength(stderr || "")
  }))
};
writeJson(manifestPath, manifest);
console.log(JSON.stringify({ status: manifest.status, manifest: manifestPath }, null, 2));
if (failed.length > 0) process.exit(1);
