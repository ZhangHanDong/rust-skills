#!/usr/bin/env node
import fs from "node:fs";
import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(import.meta.url);
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

function splitCsv(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
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

function writeText(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, value);
}

function fileSha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function fileEvidence(filePath, baseDir) {
  if (!fs.existsSync(filePath)) {
    return {
      path: filePath,
      relativePath: path.relative(baseDir, filePath),
      exists: false
    };
  }
  const stat = fs.statSync(filePath);
  return {
    path: filePath,
    relativePath: path.relative(baseDir, filePath),
    exists: true,
    bytes: stat.size,
    sha256: fileSha256(filePath)
  };
}

function copyRecursive(source, target) {
  if (!fs.existsSync(source)) return;
  const stat = fs.statSync(source);
  if (stat.isDirectory()) {
    ensureDir(target);
    for (const entry of fs.readdirSync(source)) {
      copyRecursive(path.join(source, entry), path.join(target, entry));
    }
    return;
  }
  ensureDir(path.dirname(target));
  fs.copyFileSync(source, target);
}

function commandExists(command) {
  const pathEntries = String(process.env.PATH || "").split(path.delimiter).filter(Boolean);
  const extensions = process.platform === "win32" ? [".cmd", ".exe", ".bat", ""] : [""];
  return pathEntries.some((entry) =>
    extensions.some((extension) => fs.existsSync(path.join(entry, `${command}${extension}`)))
  );
}

function runProcess(command, args, options = {}) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    let timedOut = false;
    let forceKill = null;
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      shell: options.shell === true,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      forceKill = setTimeout(() => {
        child.kill("SIGKILL");
      }, options.forceKillAfterMs || 5000);
    }, options.timeoutMs || 300000);
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      if (forceKill) clearTimeout(forceKill);
      resolve({
        status: "ERROR",
        code: null,
        signal: null,
        stdout,
        stderr,
        error: error.message,
        durationMs: Date.now() - startedAt
      });
    });
    child.on("close", (code, signal) => {
      clearTimeout(timeout);
      if (forceKill) clearTimeout(forceKill);
      resolve({
        status: timedOut ? "TIMEOUT" : signal ? "FAIL" : code === 0 ? "PASS" : "FAIL",
        code,
        signal,
        stdout,
        stderr,
        error: null,
        durationMs: Date.now() - startedAt
      });
    });
  });
}

async function initGit(workspace) {
  await runProcess("git", ["init"], { cwd: workspace, timeoutMs: 30000 });
  await runProcess("git", ["add", "."], { cwd: workspace, timeoutMs: 30000 });
  await runProcess("git", [
    "-c",
    "user.email=aom@example.invalid",
    "-c",
    "user.name=AOM",
    "commit",
    "-m",
    "fixture"
  ], { cwd: workspace, timeoutMs: 30000 });
}

async function gitDiff(workspace) {
  await runProcess("git", ["add", "-N", "."], {
    cwd: workspace,
    timeoutMs: 30000
  });
  const diff = await runProcess("git", ["diff", "--no-ext-diff"], {
    cwd: workspace,
    timeoutMs: 30000
  });
  return diff.stdout;
}

function prepareWorkspace(caseItem, runDir) {
  const workspace = path.join(runDir, "workspace");
  ensureDir(workspace);
  if (caseItem.fixtureDir) {
    copyRecursive(path.resolve(root, caseItem.fixtureDir), workspace);
  } else {
    writeText(path.join(workspace, "README.md"), `# AOM fixture ${caseItem.id}\n`);
  }
  return workspace;
}

function buildEngineCommand(engine, prompt, workspace, outputFile, options = {}) {
  if (engine === "codex") {
    return {
      command: "codex",
      args: [
        "exec",
        "-C",
        workspace,
        "--skip-git-repo-check",
        "--ephemeral",
        ...(options.codexIgnoreUserConfig ? ["--ignore-user-config"] : []),
        ...(options.codexIgnoreRules ? ["--ignore-rules"] : []),
        "-s",
        "workspace-write",
        "-o",
        outputFile,
        prompt
      ]
    };
  }
  if (engine === "claude-code") {
    return {
      command: "claude",
      args: [
        "--print",
        "--output-format",
        "text",
        "--permission-mode",
        "bypassPermissions",
        "--add-dir",
        workspace,
        "--",
        prompt
      ]
    };
  }
  throw new Error(`unsupported engine: ${engine}`);
}

function summarizeRouting(route) {
  return {
    decision: route.decision,
    rustSignal: route.rust_signal,
    shouldInject: route.should_inject,
    skills: route.skills,
    layers: route.layers,
    matches: route.matches.map((match) => ({
      route: match.route,
      skill: match.skill,
      layer: match.layer,
      category: match.category,
      matched: match.matched
    })),
    contextCost: route.context_cost
  };
}

function skillExcerpt(skillId, relativePath, maxChars) {
  if (!relativePath) {
    return {
      skillId,
      path: null,
      exists: false,
      text: ""
    };
  }
  const absolutePath = path.resolve(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    return {
      skillId,
      path: relativePath,
      exists: false,
      text: ""
    };
  }
  const text = fs.readFileSync(absolutePath, "utf8");
  const excerpt = text.length > maxChars
    ? `${text.slice(0, maxChars)}\n\n[truncated ${text.length - maxChars} chars]`
    : text;
  return {
    skillId,
    path: relativePath,
    absolutePath,
    exists: true,
    bytes: Buffer.byteLength(text),
    excerptBytes: Buffer.byteLength(excerpt),
    sha256: fileSha256(absolutePath),
    text: excerpt
  };
}

function buildProfilePrompt(caseItem, profile, options) {
  const route = routePrompt(caseItem.prompt, { root });
  const routing = summarizeRouting(route);
  if (profile === "baseline") {
    return {
      profile,
      prompt: caseItem.prompt,
      routing,
      skillContext: []
    };
  }
  if (profile !== "rust-skills") {
    throw new Error(`unsupported profile: ${profile}`);
  }

  let remainingChars = options.maxSkillContextChars;
  const skillContext = [];
  for (const skillId of route.skills) {
    if (remainingChars <= 0) break;
    const excerpt = skillExcerpt(skillId, route.paths[skillId], Math.min(remainingChars, 2500));
    remainingChars -= excerpt.text.length;
    skillContext.push(excerpt);
  }

  const contextText = skillContext
    .filter((item) => item.text)
    .map((item) => [
      `### ${item.skillId}`,
      `Path: ${item.path}`,
      item.text
    ].join("\n"))
    .join("\n\n");

  const prompt = [
    "Use the following routed rust-skills guidance while answering the user task.",
    "Do not mention this evaluation harness unless the user asks about it.",
    `Routing: ${JSON.stringify({
      decision: routing.decision,
      skills: routing.skills,
      contextCost: routing.contextCost
    })}`,
    contextText,
    "User task:",
    caseItem.prompt
  ].filter(Boolean).join("\n\n");

  return {
    profile,
    prompt,
    routing,
    skillContext: skillContext.map(({ text, ...meta }) => meta)
  };
}

function evaluateText(text, expected = {}) {
  const failures = [];
  if (text.length < (expected.minResponseChars || 0)) {
    failures.push({
      kind: "response_too_short",
      expected: expected.minResponseChars || 0,
      actual: text.length
    });
  }
  for (const phrase of expected.mustMention || []) {
    if (!text.toLowerCase().includes(String(phrase).toLowerCase())) {
      failures.push({ kind: "missing_phrase", phrase });
    }
  }
  for (const phrase of expected.mustNotMention || []) {
    if (text.toLowerCase().includes(String(phrase).toLowerCase())) {
      failures.push({ kind: "forbidden_phrase", phrase });
    }
  }
  return failures;
}

function normalizedIncludes(text, expected) {
  const compactText = String(text).replace(/\s+/g, " ").trim();
  const compactExpected = String(expected).replace(/\s+/g, " ").trim();
  return String(text).includes(String(expected)) || compactText.includes(compactExpected);
}

function evaluateFiles(workspace, expected = {}) {
  const failures = [];
  for (const relative of expected.files || []) {
    if (!fs.existsSync(path.join(workspace, relative))) {
      failures.push({ kind: "missing_file", path: relative });
    }
  }
  for (const check of expected.mustMentionInFiles || []) {
    const target = path.join(workspace, check.path);
    const content = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : "";
    if (!normalizedIncludes(content, check.text)) {
      failures.push({ kind: "missing_file_text", path: check.path, text: check.text });
    }
  }
  return failures;
}

async function runVerificationCommands(caseItem, workspace) {
  const results = [];
  for (const command of caseItem.verifyCommands || []) {
    const result = await runProcess(command, [], {
      cwd: workspace,
      shell: true,
      timeoutMs: caseItem.verifyTimeoutMs || 120000
    });
    results.push({ command, ...result });
  }
  return results;
}

function summarizeBase(results) {
  const runnable = results.filter((result) => result.status !== "SKIP");
  const generatedResponses = runnable.filter((result) => result.metrics.responseGenerated).length;
  const generatedArtifacts = runnable.filter((result) => result.metrics.artifactGenerated).length;
  const generatedPatches = runnable.filter((result) => result.metrics.patchGenerated).length;
  const gatePasses = runnable.filter((result) => result.hardGate === "PASS").length;
  return {
    total: results.length,
    runnable: runnable.length,
    skipped: results.length - runnable.length,
    passed: gatePasses,
    failed: runnable.length - gatePasses,
    responseGenerationRate: Number((generatedResponses / Math.max(1, runnable.length)).toFixed(4)),
    artifactGenerationRate: Number((generatedArtifacts / Math.max(1, runnable.length)).toFixed(4)),
    patchGenerationRate: Number((generatedPatches / Math.max(1, runnable.length)).toFixed(4)),
    qualityGatePassRate: Number((gatePasses / Math.max(1, runnable.length)).toFixed(4)),
    timeoutRate: Number((runnable.filter((result) => result.status === "TIMEOUT").length / Math.max(1, runnable.length)).toFixed(4))
  };
}

function summarizeGroup(results, key) {
  const names = [...new Set(results.map((result) => result[key] || "unspecified"))].sort();
  return Object.fromEntries(names.map((name) => [
    name,
    summarizeBase(results.filter((result) => (result[key] || "unspecified") === name))
  ]));
}

function summarize(results) {
  const summary = summarizeBase(results);
  const profileNames = [...new Set(results.map((result) => result.profile || "baseline"))];
  summary.profiles = Object.fromEntries(profileNames.map((profile) => [
    profile,
    summarizeBase(results.filter((result) => (result.profile || "baseline") === profile))
  ]));
  summary.categories = summarizeGroup(results, "category");
  summary.difficulties = summarizeGroup(results, "difficulty");
  if (summary.profiles.baseline && summary.profiles["rust-skills"]) {
    const baseline = summary.profiles.baseline;
    const rustSkills = summary.profiles["rust-skills"];
    summary.comparisons = {
      "rust-skills_vs_baseline": {
        responseGenerationRateDelta: Number((rustSkills.responseGenerationRate - baseline.responseGenerationRate).toFixed(4)),
        artifactGenerationRateDelta: Number((rustSkills.artifactGenerationRate - baseline.artifactGenerationRate).toFixed(4)),
        patchGenerationRateDelta: Number((rustSkills.patchGenerationRate - baseline.patchGenerationRate).toFixed(4)),
        qualityGatePassRateDelta: Number((rustSkills.qualityGatePassRate - baseline.qualityGatePassRate).toFixed(4)),
        timeoutRateDelta: Number((rustSkills.timeoutRate - baseline.timeoutRate).toFixed(4))
      }
    };
  }
  return summary;
}

async function runOne(caseItem, engine, profile, repeat, runRoot, options) {
  const runDir = path.join(runRoot, caseItem.id, profile, engine, `repeat-${repeat}`);
  ensureDir(runDir);
  const promptProfile = buildProfilePrompt(caseItem, profile, options);
  const originalPromptFile = path.join(runDir, "original-prompt.txt");
  const promptFile = path.join(runDir, "prompt.txt");
  writeText(originalPromptFile, caseItem.prompt);
  writeText(promptFile, promptProfile.prompt);

  if (!options.allowRealAgents) {
    const skipped = {
      caseId: caseItem.id,
      engine,
      profile,
      repeat,
      status: "SKIP",
      hardGate: "SKIP",
      reason: "real Agent execution disabled; pass --allow-real-agents or RUN_REAL_AGENTS=1",
      routing: promptProfile.routing,
      skillContext: promptProfile.skillContext,
      category: caseItem.category,
      difficulty: caseItem.difficulty || "unspecified",
      tags: caseItem.tags || [],
      evidence: {
        originalPrompt: fileEvidence(originalPromptFile, runDir),
        prompt: fileEvidence(promptFile, runDir)
      },
      metrics: {
        responseGenerated: false,
        artifactGenerated: false,
        patchGenerated: false
      },
      failures: []
    };
    writeJson(path.join(runDir, "capsule.json"), skipped);
    return skipped;
  }

  const commandName = engine === "codex" ? "codex" : "claude";
  if (!commandExists(commandName)) {
    const skipped = {
      caseId: caseItem.id,
      engine,
      profile,
      repeat,
      status: "SKIP",
      hardGate: "SKIP",
      reason: `${commandName} binary not found`,
      routing: promptProfile.routing,
      skillContext: promptProfile.skillContext,
      category: caseItem.category,
      difficulty: caseItem.difficulty || "unspecified",
      tags: caseItem.tags || [],
      evidence: {
        originalPrompt: fileEvidence(originalPromptFile, runDir),
        prompt: fileEvidence(promptFile, runDir)
      },
      metrics: {
        responseGenerated: false,
        artifactGenerated: false,
        patchGenerated: false
      },
      failures: []
    };
    writeJson(path.join(runDir, "capsule.json"), skipped);
    return skipped;
  }

  const workspace = prepareWorkspace(caseItem, runDir);
  await initGit(workspace);
  const outputFile = path.join(runDir, "output.md");
  const { command, args } = buildEngineCommand(engine, promptProfile.prompt, workspace, outputFile, options);
  const processResult = await runProcess(command, args, {
    cwd: workspace,
    env: {
      ...process.env,
      HOME: process.env.HOME,
      USERPROFILE: process.env.USERPROFILE
    },
    timeoutMs: options.timeoutMs
  });

  const outputText = fs.existsSync(outputFile)
    ? fs.readFileSync(outputFile, "utf8")
    : processResult.stdout;
  writeText(path.join(runDir, "stdout.txt"), processResult.stdout);
  writeText(path.join(runDir, "stderr.txt"), processResult.stderr);
  if (!fs.existsSync(outputFile)) writeText(outputFile, outputText);

  const diff = await gitDiff(workspace);
  const stdoutFile = path.join(runDir, "stdout.txt");
  const stderrFile = path.join(runDir, "stderr.txt");
  const diffFile = path.join(runDir, "diff.patch");
  writeText(diffFile, diff);
  const verification = await runVerificationCommands(caseItem, workspace);
  const textFailures = evaluateText(outputText, caseItem.expected);
  const fileFailures = evaluateFiles(workspace, caseItem.expected);
  const verificationFailures = verification
    .filter((item) => item.status !== "PASS")
    .map((item) => ({ kind: "verification_failed", command: item.command, status: item.status }));
  const failures = [
    ...textFailures,
    ...fileFailures,
    ...verificationFailures
  ];
  if (processResult.status !== "PASS") {
    failures.push({ kind: "agent_process_failed", status: processResult.status, code: processResult.code });
  }

  const metrics = {
    responseGenerated: outputText.trim().length > 0,
    artifactGenerated: (caseItem.expected?.files || []).length === 0
      ? false
      : (caseItem.expected.files || []).every((relative) => fs.existsSync(path.join(workspace, relative))),
    patchGenerated: diff.trim().length > 0,
    compilePass: verification.length === 0
      ? null
      : verification.every((item) => item.status === "PASS"),
    responseChars: outputText.length,
    diffChars: diff.length
  };
  const capsule = {
    caseId: caseItem.id,
    category: caseItem.category,
    difficulty: caseItem.difficulty || "unspecified",
    tags: caseItem.tags || [],
    engine,
    profile,
    repeat,
    status: processResult.status,
    hardGate: failures.length === 0 ? "PASS" : "FAIL",
    command,
    args,
    workspace,
    outputFile,
    durationMs: processResult.durationMs,
    routing: promptProfile.routing,
    skillContext: promptProfile.skillContext,
    evidence: {
      originalPrompt: fileEvidence(originalPromptFile, runDir),
      prompt: fileEvidence(promptFile, runDir),
      stdout: fileEvidence(stdoutFile, runDir),
      stderr: fileEvidence(stderrFile, runDir),
      output: fileEvidence(outputFile, runDir),
      diff: fileEvidence(diffFile, runDir),
      expectedFiles: Object.fromEntries((caseItem.expected?.files || []).map((relative) => [
        relative,
        fileEvidence(path.join(workspace, relative), runDir)
      ]))
    },
    verification,
    metrics,
    failures
  };
  writeJson(path.join(runDir, "capsule.json"), capsule);
  return capsule;
}

async function runQueue(tasks, concurrency) {
  const results = [];
  let index = 0;
  async function worker() {
    while (index < tasks.length) {
      const current = tasks[index];
      index += 1;
      results.push(await current());
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, () => worker()));
  return results;
}

const casesPath = path.resolve(argValue(
  "--cases",
  path.join(root, "tests", "aom", "fixtures", "agent-matrix-smoke.json")
));
const engines = splitCsv(argValue("--engines", "codex,claude-code"));
const profiles = splitCsv(argValue("--profiles", "baseline,rust-skills"));
const repeats = Number.parseInt(argValue("--repeats", "1"), 10);
const concurrency = Number.parseInt(argValue("--concurrency", "1"), 10);
const timeoutMs = Number.parseInt(argValue("--timeout-ms", "300000"), 10);
const maxSkillContextChars = Number.parseInt(argValue("--max-skill-context-chars", "6000"), 10);
const allowRealAgents = hasFlag("--allow-real-agents") || process.env.RUN_REAL_AGENTS === "1";
const requireRealAgents = hasFlag("--require-real-agents");
const benchmarkMode = hasFlag("--benchmark-mode");
const codexIgnoreUserConfig = !hasFlag("--codex-use-user-config");
const codexIgnoreRules = !hasFlag("--codex-use-rules");
const caseFilter = argValue("--case-filter", null);
const runId = argValue(
  "--run-id",
  [
    new Date().toISOString().replace(/[-:.]/g, "").slice(0, 15),
    process.pid,
    Math.random().toString(16).slice(2, 8)
  ].join("-")
);
const runRoot = path.resolve(argValue(
  "--run-root",
  path.join(root, "tests", "results", "agent-matrix", runId)
));
const reportPath = path.resolve(argValue(
  "--report",
  path.join(runRoot, "report.json")
));
const cases = readJson(casesPath)
  .filter((caseItem) => !caseFilter || caseItem.id === caseFilter || (caseItem.tags || []).includes(caseFilter));

if (cases.length === 0) throw new Error(`no Agent matrix cases matched ${casesPath}`);
if (!Number.isFinite(repeats) || repeats < 1) throw new Error("repeats must be >= 1");
if (profiles.length === 0) throw new Error("profiles must not be empty");

const tasks = [];
for (const caseItem of cases) {
  for (const profile of profiles) {
    for (const engine of engines) {
      for (let repeat = 1; repeat <= repeats; repeat += 1) {
        tasks.push(() => runOne(caseItem, engine, profile, repeat, runRoot, {
          allowRealAgents,
          timeoutMs,
          maxSkillContextChars,
          codexIgnoreUserConfig,
          codexIgnoreRules
        }));
      }
    }
  }
}

const results = await runQueue(tasks, concurrency);
const summary = summarize(results);
const requireRealAgentsPassed = !requireRealAgents || (summary.runnable > 0 && summary.skipped === 0);
const qualityPassed = summary.failed === 0;
const reportStatus = requireRealAgentsPassed && qualityPassed
  ? "PASS"
  : requireRealAgentsPassed && benchmarkMode
    ? "MEASURED"
    : "FAIL";
const report = {
  status: reportStatus,
  runId,
  generatedAt: new Date().toISOString(),
  casesPath,
  engines,
  profiles,
  repeats,
  concurrency,
  allowRealAgents,
  requireRealAgents,
  benchmarkMode,
  codex: {
    ignoreUserConfig: codexIgnoreUserConfig,
    ignoreRules: codexIgnoreRules
  },
  qualityPassed,
  requireRealAgentsPassed,
  runRoot,
  summary,
  results
};
writeJson(reportPath, report);
console.log(JSON.stringify({
  status: report.status,
  report: reportPath,
  runRoot,
  summary
}, null, 2));

if (report.status === "FAIL") process.exit(1);
