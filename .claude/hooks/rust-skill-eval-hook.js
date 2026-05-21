#!/usr/bin/env node
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const childProcess = require("child_process");

const hookDir = __dirname;
const claudeRoot = path.resolve(hookDir, "..");
const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT
  ? path.resolve(process.env.CLAUDE_PLUGIN_ROOT)
  : path.resolve(hookDir, "..", "..");
const binaryName = process.platform === "win32" ? "rust-skills.cmd" : "rust-skills";

function readStdin() {
  try {
    return fs.readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

function parseJson(payload) {
  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

function textFromContent(value) {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    return value.map(textFromContent).filter(Boolean).join("\n").trim();
  }
  if (!value || typeof value !== "object") return "";
  for (const key of ["text", "content", "message"]) {
    const text = textFromContent(value[key]);
    if (text) return text;
  }
  return "";
}

function promptFromJson(data) {
  const directKeys = [
    "prompt",
    "user_prompt",
    "userPrompt",
    "user_message",
    "userMessage",
    "user_input",
    "userInput",
    "input_text",
    "inputText"
  ];

  for (const key of directKeys) {
    const text = textFromContent(data[key]);
    if (text) return text;
  }

  for (const key of ["message", "input"]) {
    if (typeof data[key] === "string" && data[key].trim()) return data[key].trim();
    const text = textFromContent(data[key]?.content ?? data[key]?.text);
    if (text) return text;
  }

  for (const messages of [data.messages, data.conversation?.messages, data.thread?.messages]) {
    if (!Array.isArray(messages)) continue;
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if (message?.role && message.role !== "user") continue;
      const text = textFromContent(message?.content ?? message?.text ?? message?.message);
      if (text) return text;
    }
  }

  for (const key of ["payload", "event", "request", "body"]) {
    if (data[key] && typeof data[key] === "object") {
      const text = promptFromJson(data[key]);
      if (text) return text;
    }
  }

  return "";
}

function extractPrompt(payload) {
  const data = parseJson(payload);
  if (!data) return payload;
  if (typeof data !== "object" || Array.isArray(data)) return "";
  return promptFromJson(data);
}

function homes() {
  return [...new Set([process.env.HOME, process.env.USERPROFILE, os.homedir()].filter(Boolean))];
}

function fileExists(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function debug(message) {
  if (process.env.RUST_SKILLS_DEBUG === "1") {
    process.stderr.write(`[rust-skills] ${message}\n`);
  }
}

function routingLibraryCandidates() {
  const candidates = [
    process.env.RUST_SKILLS_LIB,
    path.join(claudeRoot, "bin", "lib", "routing.js"),
    path.join(pluginRoot, "lib", "routing.js")
  ].filter(Boolean);

  for (const home of homes()) {
    candidates.push(path.join(home, ".claude", "bin", "lib", "routing.js"));
    candidates.push(path.join(home, ".codex", "bin", "lib", "routing.js"));
  }

  return [...new Set(candidates)];
}

function routeWithLibrary(prompt) {
  for (const candidate of routingLibraryCandidates()) {
    if (!fileExists(candidate)) continue;
    try {
      const routing = require(candidate);
      if (typeof routing.routePrompt !== "function") continue;
      return routing.routePrompt(prompt);
    } catch (error) {
      debug(`direct routing failed via ${candidate}: ${error.message}`);
    }
  }
  return null;
}

function executableCandidates() {
  const candidates = [
    process.env.RUST_SKILLS_BIN,
    path.join(claudeRoot, "bin", binaryName),
    path.join(pluginRoot, "rust-skills.js")
  ].filter(Boolean);

  for (const home of homes()) {
    candidates.push(path.join(home, ".claude", "bin", binaryName));
    candidates.push(path.join(home, ".codex", "bin", binaryName));
    candidates.push(path.join(home, ".local", "bin", binaryName));
  }

  return [...new Set(candidates)];
}

function pathExecutableCandidates() {
  return String(process.env.PATH || "")
    .split(path.delimiter)
    .filter(Boolean)
    .map((entry) => path.join(entry, binaryName));
}

function findRustSkillsCommand() {
  for (const candidate of [...executableCandidates(), ...pathExecutableCandidates()]) {
    if (!fileExists(candidate)) continue;
    if (candidate.endsWith(".js")) return { command: process.execPath, prefixArgs: [candidate] };
    return { command: candidate, prefixArgs: [] };
  }
  return null;
}

function runtimeRootEnv(commandInfo) {
  const binPath = commandInfo.prefixArgs[0] || commandInfo.command;
  const candidates = [
    process.env.RUST_SKILLS_ROOT,
    path.join(claudeRoot, "rust-skills"),
    pluginRoot,
    path.join(path.dirname(binPath), "..", "rust-skills")
  ].filter(Boolean);

  for (const home of homes()) {
    candidates.push(path.join(home, ".claude", "rust-skills"));
    candidates.push(path.join(home, ".codex", "rust-skills"));
  }

  return candidates.find((candidate) => fileExists(path.join(candidate, "index", "routes.json")));
}

function runRustSkills(commandInfo, args, prompt) {
  const env = { ...process.env };
  const runtimeRoot = runtimeRootEnv(commandInfo);
  if (runtimeRoot) env.RUST_SKILLS_ROOT = runtimeRoot;

  const result = childProcess.spawnSync(
    commandInfo.command,
    [...commandInfo.prefixArgs, ...args, prompt],
    {
      cwd: runtimeRoot || claudeRoot,
      env,
      encoding: "utf8",
      shell: false,
      timeout: 3000,
      maxBuffer: 1024 * 1024
    }
  );
  if (result.error) debug(`rust-skills ${args[0]} failed: ${result.error.message}`);
  if (result.status !== 0) debug(`rust-skills ${args[0]} exited with ${result.status ?? result.signal ?? "unknown"}`);
  return result.status === 0 ? result.stdout : "";
}

function shouldInject(routeOutput) {
  return parseJson(routeOutput)?.should_inject === true;
}

function additionalContext(routeOutput) {
  return `
=== RUST SKILLS CLI ROUTE ===
${routeOutput.trimEnd()}
===

=== RUST SKILLS ROUTING CONTRACT ===
Use this context only for Rust-related work.

1. Treat the route JSON above as the source of truth.
2. Load rust-router first.
3. Load every matched skill id from the "skills" array.
4. Full runtime installs expose one top-level skill: rust-skills.
5. Deep skill files live under the installed runtime data root:
   - ~/.claude/rust-skills/skills/<skill-id>/SKILL.md
   - ~/.codex/rust-skills/skills/<skill-id>/SKILL.md

Mandatory reasoning flow:
- Identify the entry layer: error/language mechanism, design choice, or domain.
- If a domain signal is present, trace up to the domain constraint and then
  back down to the Rust mechanism.
- Do not stop at a surface compiler fix when domain constraints change the
  correct ownership, concurrency, error, or unsafe boundary.
===`;
}

function main() {
  const prompt = extractPrompt(readStdin());
  const directRoute = routeWithLibrary(prompt);
  if (directRoute) {
    if (directRoute.should_inject !== true) return;
    process.stdout.write(additionalContext(`${JSON.stringify(directRoute, null, 2)}\n`));
    return;
  }

  const commandInfo = findRustSkillsCommand();
  if (!commandInfo) {
    debug("no routing library or rust-skills command found");
    return;
  }

  const detectOutput = runRustSkills(commandInfo, ["detect", "--json"], prompt);
  if (!shouldInject(detectOutput)) return;

  const routeOutput = runRustSkills(commandInfo, ["route", "--json"], prompt);
  if (!routeOutput.trim() || !shouldInject(routeOutput)) return;
  process.stdout.write(additionalContext(routeOutput));
}

main();
