#!/usr/bin/env node
"use strict";

// Codex UserPromptSubmit hook. The native CLI does all routing work
// (`rust-skills hook codex`); this wrapper locates lib/hook-core.js for the
// supported install layouts and passes the hook event through. Kept for
// layouts whose settings still reference the node hook; full installs invoke
// the binary directly.

const fs = require("fs");
const path = require("path");

const hookDir = __dirname;
const codexRoot = path.resolve(hookDir, "..");
const repoRoot = path.resolve(hookDir, "..", "..");

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
    path.join(codexRoot, "bin", "lib", "hook-core.js"),
    path.join(repoRoot, "lib", "hook-core.js")
  ].filter(Boolean);
  for (const home of homes()) {
    candidates.push(path.join(home, ".codex", "bin", "lib", "hook-core.js"));
    candidates.push(path.join(home, ".claude", "bin", "lib", "hook-core.js"));
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
    process.stdout.write("{}\n");
    return;
  }
  const output = core.runHook("codex", {
    platformRoot: codexRoot,
    fallbackRoot: repoRoot,
    homeOrder: [".codex", ".claude"]
  });
  process.stdout.write(output || "{}\n");
}

main();
