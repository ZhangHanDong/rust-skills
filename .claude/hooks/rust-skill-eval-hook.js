#!/usr/bin/env node
"use strict";

// Claude Code UserPromptSubmit hook. All routing logic lives in the shared
// lib/hook-core.js; this wrapper only resolves the core module for the
// supported install layouts and emits raw context text on stdout.

const fs = require("fs");
const path = require("path");

const hookDir = __dirname;
const claudeRoot = path.resolve(hookDir, "..");
const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT
  ? path.resolve(process.env.CLAUDE_PLUGIN_ROOT)
  : path.resolve(hookDir, "..", "..");

function fileExists(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function homes() {
  const os = require("os");
  return [...new Set([process.env.HOME, process.env.USERPROFILE, os.homedir()].filter(Boolean))];
}

function loadHookCore() {
  const candidates = [
    process.env.RUST_SKILLS_HOOK_CORE,
    path.join(claudeRoot, "bin", "lib", "hook-core.js"),
    path.join(pluginRoot, "lib", "hook-core.js")
  ].filter(Boolean);
  for (const home of homes()) {
    candidates.push(path.join(home, ".claude", "bin", "lib", "hook-core.js"));
    candidates.push(path.join(home, ".codex", "bin", "lib", "hook-core.js"));
  }
  for (const candidate of [...new Set(candidates)]) {
    if (!fileExists(candidate)) continue;
    try {
      return require(candidate);
    } catch (error) {
      if (process.env.RUST_SKILLS_DEBUG === "1") {
        process.stderr.write(`[rust-skills] failed to load hook core ${candidate}: ${error.message}\n`);
      }
    }
  }
  return null;
}

function main() {
  const core = loadHookCore();
  if (!core) {
    process.stderr.write(
      "[rust-skills] routing disabled: lib/hook-core.js not found " +
        "(re-run `node install.js` from the rust-skills checkout)\n"
    );
    return;
  }

  const config = {
    hookDir,
    platformRoot: claudeRoot,
    fallbackRoot: pluginRoot,
    homeOrder: [".claude", ".codex"]
  };
  const prompt = core.extractPrompt(core.readStdin());
  const route = core.resolveRoute(prompt, config);
  if (route.inject) process.stdout.write(route.context);
}

main();
