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

function findRustSkillsCommand() {
  for (const candidate of executableCandidates()) {
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
    { cwd: runtimeRoot || claudeRoot, env, encoding: "utf8", shell: false }
  );
  return result.status === 0 ? result.stdout : "";
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
  const commandInfo = findRustSkillsCommand();
  if (!commandInfo) return;

  const detectOutput = runRustSkills(commandInfo, ["detect", "--json"], prompt);
  if (parseJson(detectOutput)?.should_inject !== true) return;

  const routeOutput = runRustSkills(commandInfo, ["route", "--json"], prompt);
  if (!routeOutput.trim()) return;
  process.stdout.write(additionalContext(routeOutput));
}

main();
