#!/usr/bin/env node
import fs from "node:fs";
import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import {
  evaluateSemanticText,
  evaluateText,
  summarize
} from "./evaluation.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(import.meta.url);

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

function parseProfileRoots(values) {
  const roots = {};
  for (const value of values) {
    const separator = value.indexOf("=");
    if (separator <= 0 || separator === value.length - 1) {
      throw new Error(`--profile-root must use profile=/path form: ${value}`);
    }
    const profile = value.slice(0, separator).trim();
    const rootPath = value.slice(separator + 1).trim();
    if (!profile) throw new Error(`--profile-root has empty profile: ${value}`);
    roots[profile] = path.resolve(rootPath);
  }
  return roots;
}

function resolveProfileRoot(profile, options) {
  if (profile === "baseline") return null;
  if (options.profileRoots[profile]) return options.profileRoots[profile];
  if (profile === "rust-skills") return root;
  throw new Error(`profile ${profile} requires --profile-root ${profile}=/path/to/runtime`);
}

function profileRootEvidence(runtimeRoot) {
  if (!runtimeRoot) return null;
  const routingModule = path.join(runtimeRoot, "lib", "routing.js");
  const routes = path.join(runtimeRoot, "index", "routes.json");
  return {
    path: runtimeRoot,
    relativePath: path.relative(root, runtimeRoot),
    exists: fs.existsSync(runtimeRoot),
    routingMode: fs.existsSync(routingModule) && fs.existsSync(routes)
      ? "profile-runtime"
      : "current-router-profile-skills",
    files: {
      routingModule: fileEvidence(routingModule, runtimeRoot),
      routes: fileEvidence(routes, runtimeRoot),
      routerSkill: fileEvidence(path.join(runtimeRoot, "skills", "rust-router", "SKILL.md"), runtimeRoot)
    }
  };
}

const routePromptByRoot = new Map();

function loadRoutePrompt(runtimeRoot) {
  const normalizedRoot = path.resolve(runtimeRoot);
  if (routePromptByRoot.has(normalizedRoot)) return routePromptByRoot.get(normalizedRoot);
  const routingModule = path.join(normalizedRoot, "lib", "routing.js");
  const routesPath = path.join(normalizedRoot, "index", "routes.json");
  if (!fs.existsSync(routingModule) || !fs.existsSync(routesPath)) {
    const current = require(path.join(root, "lib", "routing.js")).routePrompt;
    const fallback = (prompt) => current(prompt, { root });
    routePromptByRoot.set(normalizedRoot, fallback);
    return fallback;
  }
  const loaded = require(routingModule);
  if (typeof loaded.routePrompt !== "function") {
    throw new Error(`routing module does not export routePrompt: ${routingModule}`);
  }
  routePromptByRoot.set(normalizedRoot, loaded.routePrompt);
  return loaded.routePrompt;
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

function isApiEngine(engine) {
  return engine === "openai-api" || engine === "anthropic-api";
}

function engineCommandName(engine) {
  if (engine === "codex") return "codex";
  if (engine === "claude-code") return "claude";
  if (isApiEngine(engine)) return null;
  throw new Error(`unsupported engine: ${engine}`);
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

function apiConfig(engine, options) {
  if (engine === "openai-api") {
    return {
      apiKey: process.env.OPENAI_API_KEY || "",
      baseUrl: options.openaiBaseUrl,
      model: options.openaiModel,
      maxOutputTokens: options.apiMaxOutputTokens
    };
  }
  if (engine === "anthropic-api") {
    return {
      apiKey: process.env.ANTHROPIC_API_KEY || "",
      baseUrl: options.anthropicBaseUrl,
      model: options.anthropicModel,
      maxOutputTokens: options.apiMaxOutputTokens
    };
  }
  throw new Error(`unsupported API engine: ${engine}`);
}

function apiSkipReason(engine, options) {
  const config = apiConfig(engine, options);
  if (!config.apiKey) {
    return engine === "openai-api" ? "OPENAI_API_KEY is not set" : "ANTHROPIC_API_KEY is not set";
  }
  if (!config.model) {
    return engine === "openai-api"
      ? "--openai-model or AOM_OPENAI_MODEL is required"
      : "--anthropic-model or AOM_ANTHROPIC_MODEL is required";
  }
  return null;
}

function extractOpenAiText(payload) {
  if (typeof payload.output_text === "string") return payload.output_text;
  const chunks = [];
  for (const item of payload.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && typeof content.text === "string") {
        chunks.push(content.text);
      } else if (typeof content.text === "string") {
        chunks.push(content.text);
      }
    }
  }
  return chunks.join("\n");
}

function extractAnthropicText(payload) {
  return (payload.content || [])
    .map((item) => item.type === "text" ? item.text : "")
    .filter(Boolean)
    .join("\n");
}

async function runApiEngine(engine, prompt, outputFile, options) {
  const startedAt = Date.now();
  const config = apiConfig(engine, options);
  const requestTimeout = AbortSignal.timeout(options.timeoutMs || 300000);
  try {
    const response = engine === "openai-api"
      ? await fetch(`${config.baseUrl.replace(/\/+$/u, "")}/responses`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${config.apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: config.model,
            input: prompt,
            max_output_tokens: config.maxOutputTokens
          }),
          signal: requestTimeout
        })
      : await fetch(`${config.baseUrl.replace(/\/+$/u, "")}/messages`, {
          method: "POST",
          headers: {
            "x-api-key": config.apiKey,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: config.model,
            max_tokens: config.maxOutputTokens,
            messages: [{ role: "user", content: prompt }]
          }),
          signal: requestTimeout
        });
    const raw = await response.text();
    if (!response.ok) {
      return {
        status: "FAIL",
        code: response.status,
        signal: null,
        stdout: "",
        stderr: `${engine} request failed: HTTP ${response.status} ${raw.slice(0, 2000)}`,
        error: null,
        durationMs: Date.now() - startedAt
      };
    }
    const payload = raw.trim() ? JSON.parse(raw) : {};
    const outputText = engine === "openai-api"
      ? extractOpenAiText(payload)
      : extractAnthropicText(payload);
    writeText(outputFile, outputText);
    return {
      status: "PASS",
      code: 0,
      signal: null,
      stdout: outputText,
      stderr: "",
      error: null,
      durationMs: Date.now() - startedAt,
      api: {
        engine,
        model: config.model,
        baseUrl: config.baseUrl
      }
    };
  } catch (error) {
    return {
      status: error.name === "TimeoutError" ? "TIMEOUT" : "ERROR",
      code: null,
      signal: null,
      stdout: "",
      stderr: error.message,
      error: error.message,
      durationMs: Date.now() - startedAt
    };
  }
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

function skillExcerpt(skillId, relativePath, maxChars, runtimeRoot) {
  if (!relativePath) {
    return {
      skillId,
      path: null,
      exists: false,
      text: ""
    };
  }
  const absolutePath = path.resolve(runtimeRoot, relativePath);
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
  const runtimeRoot = resolveProfileRoot(profile, options);
  const routeRoot = runtimeRoot || root;
  const route = loadRoutePrompt(routeRoot)(caseItem.prompt, { root: routeRoot });
  const routing = summarizeRouting(route);
  const rootEvidence = profileRootEvidence(runtimeRoot);
  if (profile === "baseline") {
    return {
      profile,
      prompt: caseItem.prompt,
      routing,
      profileRoot: rootEvidence,
      skillContext: []
    };
  }

  let remainingChars = options.maxSkillContextChars;
  const skillContext = [];
  for (const skillId of route.skills) {
    if (remainingChars <= 0) break;
    const excerpt = skillExcerpt(
      skillId,
      route.paths[skillId],
      Math.min(remainingChars, 2500),
      routeRoot
    );
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
    "Use the following routed Rust skill guidance while answering the user task.",
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
    profileRoot: rootEvidence,
    skillContext: skillContext.map(({ text, ...meta }) => meta)
  };
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
      semanticGate: "SKIP",
      reason: "real Agent execution disabled; pass --allow-real-agents or RUN_REAL_AGENTS=1",
      routing: promptProfile.routing,
      profileRoot: promptProfile.profileRoot,
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
        patchGenerated: false,
        semanticApplicable: false,
        semanticPass: false,
        conceptTotal: 0,
        conceptCovered: 0,
        conceptCoverageRate: null
      },
      failures: [],
      semanticFailures: [],
      conceptResults: []
    };
    writeJson(path.join(runDir, "capsule.json"), skipped);
    return skipped;
  }

  const commandName = engineCommandName(engine);
  const apiSkip = isApiEngine(engine) ? apiSkipReason(engine, options) : null;
  if (apiSkip || (commandName && !commandExists(commandName))) {
    const skipped = {
      caseId: caseItem.id,
      engine,
      profile,
      repeat,
      status: "SKIP",
      hardGate: "SKIP",
      semanticGate: "SKIP",
      reason: apiSkip || `${commandName} binary not found`,
      routing: promptProfile.routing,
      profileRoot: promptProfile.profileRoot,
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
        patchGenerated: false,
        semanticApplicable: false,
        semanticPass: false,
        conceptTotal: 0,
        conceptCovered: 0,
        conceptCoverageRate: null
      },
      failures: [],
      semanticFailures: [],
      conceptResults: []
    };
    writeJson(path.join(runDir, "capsule.json"), skipped);
    return skipped;
  }

  const workspace = prepareWorkspace(caseItem, runDir);
  await initGit(workspace);
  const outputFile = path.join(runDir, "output.md");
  const { command, args, processResult } = isApiEngine(engine)
    ? {
        command: engine,
        args: [
          "--model",
          apiConfig(engine, options).model,
          "--base-url",
          apiConfig(engine, options).baseUrl
        ],
        processResult: await runApiEngine(engine, promptProfile.prompt, outputFile, options)
      }
    : {
        ...buildEngineCommand(engine, promptProfile.prompt, workspace, outputFile, options),
        processResult: null
      };
  const finalProcessResult = processResult || await runProcess(command, args, {
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
    : finalProcessResult.stdout;
  writeText(path.join(runDir, "stdout.txt"), finalProcessResult.stdout);
  writeText(path.join(runDir, "stderr.txt"), finalProcessResult.stderr);
  if (!fs.existsSync(outputFile)) writeText(outputFile, outputText);

  const diff = await gitDiff(workspace);
  const stdoutFile = path.join(runDir, "stdout.txt");
  const stderrFile = path.join(runDir, "stderr.txt");
  const diffFile = path.join(runDir, "diff.patch");
  writeText(diffFile, diff);
  const verification = await runVerificationCommands(caseItem, workspace);
  const textFailures = evaluateText(outputText, caseItem.expected);
  const semantic = evaluateSemanticText(outputText, caseItem.expected);
  const fileFailures = evaluateFiles(workspace, caseItem.expected);
  const verificationFailures = verification
    .filter((item) => item.status !== "PASS")
    .map((item) => ({ kind: "verification_failed", command: item.command, status: item.status }));
  const failures = [
    ...textFailures,
    ...fileFailures,
    ...verificationFailures
  ];
  if (finalProcessResult.status !== "PASS") {
    failures.push({
      kind: "agent_process_failed",
      status: finalProcessResult.status,
      code: finalProcessResult.code
    });
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
    semanticApplicable: semantic.semanticGate !== "N/A",
    semanticPass: semantic.semanticGate === "PASS",
    conceptTotal: semantic.conceptTotal,
    conceptCovered: semantic.conceptCovered,
    conceptCoverageRate: semantic.conceptCoverageRate,
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
    hardGate: failures.length === 0 ? "PASS" : "FAIL",
    semanticGate: semantic.semanticGate,
    command,
    args,
    workspace,
    outputFile,
    status: finalProcessResult.status,
    durationMs: finalProcessResult.durationMs,
    routing: promptProfile.routing,
    profileRoot: promptProfile.profileRoot,
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
    failures,
    semanticFailures: semantic.semanticFailures,
    conceptResults: semantic.conceptResults
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
const profileRoots = parseProfileRoots(argValues("--profile-root"));
const repeats = Number.parseInt(argValue("--repeats", "1"), 10);
const concurrency = Number.parseInt(argValue("--concurrency", "1"), 10);
const timeoutMs = Number.parseInt(argValue("--timeout-ms", "300000"), 10);
const maxSkillContextChars = Number.parseInt(argValue("--max-skill-context-chars", "6000"), 10);
const apiMaxOutputTokens = Number.parseInt(argValue("--api-max-output-tokens", "4096"), 10);
const openaiModel = argValue("--openai-model", process.env.AOM_OPENAI_MODEL || process.env.OPENAI_MODEL || null);
const openaiBaseUrl = argValue("--openai-base-url", process.env.OPENAI_BASE_URL || "https://api.openai.com/v1");
const anthropicModel = argValue(
  "--anthropic-model",
  process.env.AOM_ANTHROPIC_MODEL || process.env.ANTHROPIC_MODEL || null
);
const anthropicBaseUrl = argValue(
  "--anthropic-base-url",
  process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com/v1"
);
const allowRealAgents = hasFlag("--allow-real-agents") || process.env.RUN_REAL_AGENTS === "1";
const requireRealAgents = hasFlag("--require-real-agents");
const benchmarkMode = hasFlag("--benchmark-mode");
const enforceSkillHarm = hasFlag("--enforce-skill-harm");
const skillHarmThreshold = Number.parseFloat(argValue("--skill-harm-threshold", "0"));
const codexIgnoreUserConfig = !hasFlag("--codex-use-user-config");
const codexIgnoreRules = !hasFlag("--codex-use-rules");
const caseFilter = argValue("--case-filter", null);
const categoryFilter = argValue("--category-filter", null);
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
  .filter((caseItem) => !caseFilter || caseItem.id === caseFilter || (caseItem.tags || []).includes(caseFilter))
  .filter((caseItem) => !categoryFilter || caseItem.category === categoryFilter);

if (cases.length === 0) {
  const filters = [
    caseFilter ? `case-filter=${caseFilter}` : null,
    categoryFilter ? `category-filter=${categoryFilter}` : null
  ].filter(Boolean).join(", ");
  throw new Error(`no Agent matrix cases matched ${casesPath}${filters ? ` (${filters})` : ""}`);
}
if (!Number.isFinite(repeats) || repeats < 1) throw new Error("repeats must be >= 1");
if (profiles.length === 0) throw new Error("profiles must not be empty");
if (!Number.isFinite(skillHarmThreshold) || skillHarmThreshold < 0) {
  throw new Error("--skill-harm-threshold must be a non-negative number");
}
for (const profile of profiles) resolveProfileRoot(profile, { profileRoots });

const tasks = [];
for (const caseItem of cases) {
  for (const profile of profiles) {
    for (const engine of engines) {
      for (let repeat = 1; repeat <= repeats; repeat += 1) {
        tasks.push(() => runOne(caseItem, engine, profile, repeat, runRoot, {
          allowRealAgents,
          timeoutMs,
          maxSkillContextChars,
          apiMaxOutputTokens,
          openaiModel,
          openaiBaseUrl,
          anthropicModel,
          anthropicBaseUrl,
          profileRoots,
          codexIgnoreUserConfig,
          codexIgnoreRules
        }));
      }
    }
  }
}

const results = await runQueue(tasks, concurrency);
const summary = summarize(results, { skillHarmThreshold });
const requireRealAgentsPassed = !requireRealAgents || (summary.runnable > 0 && summary.skipped === 0);
const qualityPassed = summary.failed === 0;
const skillHarmPassed = !enforceSkillHarm || summary.skillHarm.harmfulProfiles.length === 0;
const reportStatus = requireRealAgentsPassed && qualityPassed && skillHarmPassed
  ? "PASS"
  : requireRealAgentsPassed && benchmarkMode && skillHarmPassed
    ? "MEASURED"
    : "FAIL";
const report = {
  status: reportStatus,
  runId,
  generatedAt: new Date().toISOString(),
  casesPath,
  engines,
  profiles,
  profileRoots: Object.fromEntries(Object.entries(profileRoots).map(([profile, rootPath]) => [
    profile,
    profileRootEvidence(rootPath)
  ])),
  repeats,
  concurrency,
  allowRealAgents,
  requireRealAgents,
  benchmarkMode,
  enforceSkillHarm,
  skillHarmThreshold,
  api: {
    openai: {
      enabled: engines.includes("openai-api"),
      model: openaiModel,
      baseUrl: openaiBaseUrl,
      apiKeyPresent: Boolean(process.env.OPENAI_API_KEY)
    },
    anthropic: {
      enabled: engines.includes("anthropic-api"),
      model: anthropicModel,
      baseUrl: anthropicBaseUrl,
      apiKeyPresent: Boolean(process.env.ANTHROPIC_API_KEY)
    },
    maxOutputTokens: apiMaxOutputTokens
  },
  caseFilter,
  categoryFilter,
  codex: {
    ignoreUserConfig: codexIgnoreUserConfig,
    ignoreRules: codexIgnoreRules
  },
  qualityPassed,
  requireRealAgentsPassed,
  skillHarmPassed,
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
