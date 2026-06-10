"use strict";

// Shared core for the Claude Code and Codex UserPromptSubmit hook wrappers.
//
// Since the native CLI gained `rust-skills hook <platform>`, all real work
// (prompt extraction from the hook event JSON, routing, context formatting)
// lives in the binary. This module only locates the binary across install
// layouts and passes stdin/stdout through. Fallback story: binary present ->
// run it; binary missing -> one stderr hint, inject nothing, exit 0. Hooks
// never trigger cargo builds and never block the host prompt.
//
// Layouts that must keep working:
//   repo checkout      <repo>/target/{release,debug}/rust-skills
//   plugin install     $CLAUDE_PLUGIN_ROOT/target/... (when built in place)
//   full install       <targetRoot>/bin/rust-skills
//   user shim          ~/.local/bin/rust-skills, PATH

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

function fileExists(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function homes() {
  return [...new Set([process.env.HOME, process.env.USERPROFILE, os.homedir()].filter(Boolean))];
}

function debug(message) {
  if (process.env.RUST_SKILLS_DEBUG === "1") {
    process.stderr.write(`[rust-skills] ${message}\n`);
  }
}

function binaryName() {
  return process.platform === "win32" ? "rust-skills.exe" : "rust-skills";
}

// config: {
//   platformRoot:  hookDir/.. (e.g. <repo>/.claude or <targetRoot>)
//   fallbackRoot:  plugin/repo root (e.g. $CLAUDE_PLUGIN_ROOT or hookDir/../..)
//   homeOrder:     [".claude", ".codex"] or [".codex", ".claude"]
// }
function binaryCandidates(config) {
  const bin = binaryName();
  const candidates = [
    process.env.RUST_SKILLS_BIN,
    path.join(config.platformRoot, "bin", bin),
    path.join(config.fallbackRoot, "target", "release", bin),
    path.join(config.fallbackRoot, "target", "debug", bin)
  ].filter(Boolean);

  for (const home of homes()) {
    for (const subdir of config.homeOrder) {
      candidates.push(path.join(home, subdir, "bin", bin));
    }
    candidates.push(path.join(home, ".local", "bin", bin));
  }

  for (const entry of String(process.env.PATH || "").split(path.delimiter)) {
    if (entry) candidates.push(path.join(entry, bin));
  }

  return [...new Set(candidates)];
}

function findBinary(config) {
  return binaryCandidates(config).find(fileExists) || null;
}

// Returns the binary's stdout (the full hook response for the platform), or
// null when no binary is available / the spawn failed.
function runHook(platform, config) {
  const binary = findBinary(config);
  if (!binary) {
    process.stderr.write(
      "[rust-skills] routing disabled: rust-skills binary not found " +
        "(run `node install.js` or `cargo build --release` in the rust-skills checkout)\n"
    );
    return null;
  }

  const result = childProcess.spawnSync(binary, ["hook", platform], {
    cwd: config.platformRoot,
    env: process.env,
    encoding: "utf8",
    shell: false,
    input: readStdin(),
    timeout: 5000,
    maxBuffer: 4 * 1024 * 1024
  });
  if (result.error) {
    debug(`hook spawn failed: ${result.error.message}`);
    return null;
  }
  if (result.status !== 0) {
    debug(`hook exited with ${result.status ?? result.signal ?? "unknown"}`);
    return null;
  }
  if (result.stderr) process.stderr.write(result.stderr);
  return result.stdout;
}

module.exports = { runHook };
