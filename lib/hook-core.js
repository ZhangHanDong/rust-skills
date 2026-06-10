"use strict";

// Shared implementation for the Claude Code and Codex UserPromptSubmit hooks.
// The two hook scripts in .claude/hooks/ and .codex/hooks/ are thin wrappers
// around this module: they differ only in root discovery order and in how the
// route context is emitted (raw text vs JSON envelope).
//
// Deployment layouts that must keep working:
//   repo checkout      <repo>/lib/hook-core.js        (hookDir/../../lib)
//   plugin install     $CLAUDE_PLUGIN_ROOT/lib/hook-core.js
//   full install       <targetRoot>/bin/lib/hook-core.js (hookDir/../bin/lib)

const fs = require("fs");
const os = require("os");
const path = require("path");
const childProcess = require("child_process");

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

function debugEnabled() {
  return process.env.RUST_SKILLS_DEBUG === "1";
}

function debug(message) {
  if (debugEnabled()) {
    process.stderr.write(`[rust-skills] ${message}\n`);
  }
}

function shouldInject(routeOutput) {
  return parseJson(routeOutput)?.should_inject === true;
}

function matchedReason(match) {
  const matched = match?.matched;
  if (!matched || typeof matched !== "object") return "";
  const kind = typeof matched.kind === "string" ? matched.kind : "";
  const value = typeof matched.value === "string" ? matched.value : "";
  if (!kind && !value) return "";
  return [kind, value].filter(Boolean).join(": ");
}

function routeSummary(route) {
  if (!route || typeof route !== "object") return "";
  const skills = Array.isArray(route.skills) ? route.skills.filter(Boolean) : [];
  if (skills.length === 0) return "";

  const runtimeRoot = typeof route.runtime_root === "string" && route.runtime_root
    ? route.runtime_root
    : "~/.claude/rust-skills or ~/.codex/rust-skills";
  const paths = route.paths && typeof route.paths === "object" ? route.paths : {};
  const skillLines = skills.map((skill) => {
    const skillPath = typeof paths[skill] === "string"
      ? paths[skill]
      : `skills/${skill}/SKILL.md`;
    return `- ${skill}: ${skillPath}`;
  });
  const reasons = Array.isArray(route.matches)
    ? route.matches.map(matchedReason).filter(Boolean).slice(0, 6)
    : [];
  const reasonLine = reasons.length > 0 ? `\nmatch reasons: ${reasons.join("; ")}` : "";

  return `=== RUST SKILLS AUTO ROUTE ===
matched skills: ${skills.join(", ")}
runtime root: ${runtimeRoot}
skill files:
${skillLines.join("\n")}${reasonLine}
===`;
}

function rawRouteBlock(routeOutput) {
  return routeOutput.trim()
    ? `=== RUST SKILLS ROUTE JSON ===\n${routeOutput.trimEnd()}\n===`
    : "";
}

function additionalContext(routeOutput) {
  const route = parseJson(routeOutput);
  const blocks = [];
  const summary = routeSummary(route);
  if (summary) blocks.push(summary);
  if (!summary || debugEnabled()) {
    const rawBlock = rawRouteBlock(routeOutput);
    if (rawBlock) blocks.push(rawBlock);
  }

  blocks.push(`=== RUST SKILLS ROUTING CONTRACT ===
Use this context only for Rust-related work.

1. Treat the auto route above as the source of truth.
2. Load rust-router first, then the matched skills in order.
3. Full runtime installs expose one top-level skill: rust-skills.
4. Deep skill files live under the installed runtime data root:
   - ~/.claude/rust-skills/skills/<skill-id>/SKILL.md
   - ~/.codex/rust-skills/skills/<skill-id>/SKILL.md
5. Keep domain-matched constraints in view when applying Rust mechanics.
===`);

  return blocks.filter(Boolean).join("\n\n");
}

// config: {
//   hookDir:       absolute path of the wrapper's directory
//   platformRoot:  hookDir/.. (e.g. <repo>/.claude or <targetRoot>)
//   fallbackRoot:  plugin/repo root (e.g. $CLAUDE_PLUGIN_ROOT or hookDir/../..)
//   homeOrder:     [".claude", ".codex"] or [".codex", ".claude"]
// }
function routingLibraryCandidates(config) {
  const candidates = [
    process.env.RUST_SKILLS_LIB,
    path.join(config.platformRoot, "bin", "lib", "routing.js"),
    path.join(config.fallbackRoot, "lib", "routing.js")
  ].filter(Boolean);

  for (const home of homes()) {
    for (const subdir of config.homeOrder) {
      candidates.push(path.join(home, subdir, "bin", "lib", "routing.js"));
    }
  }

  return [...new Set(candidates)];
}

function routeWithLibrary(prompt, config) {
  for (const candidate of routingLibraryCandidates(config)) {
    if (!fileExists(candidate)) continue;
    try {
      const routing = require(candidate);
      const routeFn = routing.routePromptViaStdin || routing.routePrompt;
      if (typeof routeFn !== "function") continue;
      // Never let a hook trigger a cold `cargo run` workspace build; if the
      // native binary is missing we fall through to binary discovery.
      return routeFn(prompt, { allowCargoFallback: false });
    } catch (error) {
      debug(`direct routing failed via ${candidate}: ${error.message}`);
    }
  }
  return null;
}

function binaryName() {
  return process.platform === "win32" ? "rust-skills.cmd" : "rust-skills";
}

function executableCandidates(config) {
  const bin = binaryName();
  const candidates = [
    process.env.RUST_SKILLS_BIN,
    path.join(config.platformRoot, "bin", bin),
    path.join(config.fallbackRoot, "rust-skills.js")
  ].filter(Boolean);

  for (const home of homes()) {
    for (const subdir of config.homeOrder) {
      candidates.push(path.join(home, subdir, "bin", bin));
    }
    candidates.push(path.join(home, ".local", "bin", bin));
  }

  return [...new Set(candidates)];
}

function pathExecutableCandidates() {
  return String(process.env.PATH || "")
    .split(path.delimiter)
    .filter(Boolean)
    .map((entry) => path.join(entry, binaryName()));
}

function findRustSkillsCommand(config) {
  for (const candidate of [...executableCandidates(config), ...pathExecutableCandidates()]) {
    if (!fileExists(candidate)) continue;
    if (candidate.endsWith(".js")) return { command: process.execPath, prefixArgs: [candidate] };
    return { command: candidate, prefixArgs: [] };
  }
  return null;
}

function runtimeRootEnv(commandInfo, config) {
  const binPath = commandInfo.prefixArgs[0] || commandInfo.command;
  const candidates = [
    process.env.RUST_SKILLS_ROOT,
    path.join(config.platformRoot, "rust-skills"),
    config.fallbackRoot,
    path.join(path.dirname(binPath), "..", "rust-skills")
  ].filter(Boolean);

  for (const home of homes()) {
    for (const subdir of config.homeOrder) {
      candidates.push(path.join(home, subdir, "rust-skills"));
    }
  }

  return candidates.find((candidate) => fileExists(path.join(candidate, "index", "routes.json")));
}

function runRustSkills(commandInfo, args, prompt, config) {
  const env = { ...process.env };
  const runtimeRoot = runtimeRootEnv(commandInfo, config);
  if (runtimeRoot) env.RUST_SKILLS_ROOT = runtimeRoot;

  // Prompt travels over stdin (`-` placeholder) so huge pasted prompts cannot
  // blow past ARG_MAX and silently disable routing.
  const result = childProcess.spawnSync(
    commandInfo.command,
    [...commandInfo.prefixArgs, ...args, "--", "-"],
    {
      cwd: runtimeRoot || config.platformRoot,
      env,
      encoding: "utf8",
      shell: false,
      input: prompt,
      timeout: 3000,
      maxBuffer: 1024 * 1024
    }
  );
  if (result.error) debug(`rust-skills ${args[0]} failed: ${result.error.message}`);
  if (result.status !== 0) debug(`rust-skills ${args[0]} exited with ${result.status ?? result.signal ?? "unknown"}`);
  return result.status === 0 ? result.stdout : "";
}

// Resolve the route for a prompt. Returns:
//   { inject: false }                     nothing to add
//   { inject: true, context: "<text>" }   context block to emit
//   { inject: false, disabled: true }     no runtime found (warning emitted)
function resolveRoute(prompt, config) {
  const directRoute = routeWithLibrary(prompt, config);
  if (directRoute) {
    if (directRoute.should_inject !== true) return { inject: false };
    return {
      inject: true,
      context: additionalContext(`${JSON.stringify(directRoute, null, 2)}\n`)
    };
  }

  const commandInfo = findRustSkillsCommand(config);
  if (!commandInfo) {
    process.stderr.write(
      "[rust-skills] routing disabled: no routing library or rust-skills binary found " +
        "(run `node install.js` or `cargo build --release` in the rust-skills checkout)\n"
    );
    return { inject: false, disabled: true };
  }

  // One spawn is enough: `route` already reports should_inject, so a separate
  // `detect` pre-pass would just recompute the same routing twice.
  const routeOutput = runRustSkills(commandInfo, ["route", "--json"], prompt, config);
  if (!routeOutput.trim() || !shouldInject(routeOutput)) return { inject: false };
  return { inject: true, context: additionalContext(routeOutput) };
}

module.exports = {
  additionalContext,
  debug,
  extractPrompt,
  readStdin,
  resolveRoute,
  shouldInject
};
