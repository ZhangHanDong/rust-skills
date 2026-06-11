"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const childProcess = require("child_process");

function uniq(values) {
  return [...new Set(values)];
}

function fileExists(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function dirExists(dirPath) {
  try {
    return fs.statSync(dirPath).isDirectory();
  } catch {
    return false;
  }
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function removeDir(target) {
  if (dirExists(target)) fs.rmSync(target, { recursive: true, force: true });
}

function copyRecursive(source, target, options = {}) {
  if (!fs.existsSync(source)) {
    if (options.required === false) return [];
    throw new Error(`copy source not found: ${source}`);
  }
  const actions = [];
  const dryRun = options.dryRun === true;
  const stat = fs.statSync(source);
  if (stat.isDirectory()) {
    if (!dryRun) ensureDir(target);
    actions.push({ action: "mkdir", target });
    for (const entry of fs.readdirSync(source)) {
      actions.push(...copyRecursive(path.join(source, entry), path.join(target, entry), options));
    }
    return actions;
  }

  if (!dryRun) {
    ensureDir(path.dirname(target));
    fs.copyFileSync(source, target);
    if (options.executable) fs.chmodSync(target, 0o755);
  }
  actions.push({ action: "copy", source, target });
  return actions;
}

function homeCandidates() {
  return uniq([process.env.HOME, process.env.USERPROFILE, os.homedir()].filter(Boolean));
}

function hasRoutesJson(root) {
  return fileExists(path.join(root, "index", "routes.json"));
}

function findRuntimeRoot(startDir = __dirname) {
  const candidates = [
    process.env.RUST_SKILLS_ROOT,
    path.resolve(startDir, ".."),
    path.resolve(startDir, "..", "..", "rust-skills"),
    process.cwd()
  ].filter(Boolean);

  for (const home of homeCandidates()) {
    candidates.push(path.join(home, ".codex", "rust-skills"));
    candidates.push(path.join(home, ".claude", "rust-skills"));
    candidates.push(path.join(home, ".local", "share", "rust-skills"));
  }

  return uniq(candidates.map((candidate) => path.resolve(candidate)))
    .find(hasRoutesJson) || path.resolve(startDir, "..");
}

function nativeBinaryName() {
  return process.platform === "win32" ? "rust-skills.exe" : "rust-skills";
}

function nativeCommandCandidates(startDir = __dirname) {
  const root = path.resolve(startDir, "..");
  const bin = nativeBinaryName();
  return [
    process.env.RUST_SKILLS_NATIVE_BIN,
    process.env.RUST_SKILLS_BIN,
    path.join(root, "target", "release", bin),
    path.join(root, "target", "debug", bin),
    path.join(root, "bin", bin),
    path.join(startDir, "..", "bin", bin),
    path.join(startDir, "..", bin)
  ].filter(Boolean);
}

function commandPlan(startDir = __dirname, options = {}) {
  for (const candidate of nativeCommandCandidates(startDir)) {
    if (fileExists(candidate)) return { command: candidate, prefixArgs: [], cwd: path.resolve(startDir, "..") };
  }

  if (options.allowCargoFallback === false) return null;

  const root = path.resolve(startDir, "..");
  if (fileExists(path.join(root, "Cargo.toml"))) {
    return {
      command: "cargo",
      prefixArgs: ["run", "--quiet", "-p", "rust-skills-cli", "--bin", "rust-skills", "--"],
      cwd: root,
      isCargo: true
    };
  }

  return null;
}

const MISSING_BINARY_HINT =
  "rust-skills native binary not found; run `cargo build --release` in the rust-skills checkout " +
  "(or re-run `node install.js`) to build it";

function runRustSkills(args, options = {}) {
  const plan = commandPlan(options.startDir || __dirname, options);
  if (!plan) {
    throw new Error(MISSING_BINARY_HINT);
  }

  const runtimeRoot = path.resolve(options.root || findRuntimeRoot(options.startDir || __dirname));
  // A first `cargo run` compiles the whole workspace; give it room, but never
  // hang a hook indefinitely. Direct binary calls get a short leash.
  const defaultTimeout = plan.isCargo ? 300000 : 10000;
  const timeout = Number(process.env.RUST_SKILLS_SPAWN_TIMEOUT_MS || options.timeoutMs || defaultTimeout);
  const result = childProcess.spawnSync(plan.command, [...plan.prefixArgs, ...args], {
    cwd: plan.cwd,
    env: {
      ...process.env,
      RUST_SKILLS_ROOT: runtimeRoot
    },
    encoding: "utf8",
    input: options.input,
    timeout,
    maxBuffer: 16 * 1024 * 1024
  });

  if (result.error) {
    if (result.error.code === "ENOENT" && plan.isCargo) {
      throw new Error(`${MISSING_BINARY_HINT}; cargo is not on PATH either (install Rust via https://rustup.rs)`);
    }
    if (result.error.code === "ETIMEDOUT") {
      throw new Error(`rust-skills ${args[0]} timed out after ${timeout}ms (command: ${plan.command})`);
    }
    throw result.error;
  }
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || "").trim();
    throw new Error(`rust-skills ${args[0]} failed with exit ${result.status}${detail ? `: ${detail}` : ""}`);
  }
  return JSON.parse(result.stdout);
}

function routePromptViaStdin(prompt, options = {}) {
  return runRustSkills(["route", "--json", "--", "-"], { ...options, input: String(prompt || "") });
}

function routePrompt(prompt, options = {}) {
  return runRustSkills(["route", "--json", String(prompt || "")], options);
}

function listSkills(options = {}) {
  return runRustSkills(["index", "list", "--json"], options);
}

function querySkill(skillId, options = {}) {
  try {
    return runRustSkills(["index", "query", String(skillId), "--json"], options);
  } catch (error) {
    const root = path.resolve(options.root || findRuntimeRoot(options.startDir || __dirname));
    return { found: false, id: skillId, runtime_root: root };
  }
}

function verifyRegistry(options = {}) {
  return runRustSkills(["verify", "--json"], options);
}

module.exports = {
  copyRecursive,
  ensureDir,
  fileExists,
  findRuntimeRoot,
  listSkills,
  querySkill,
  removeDir,
  routePrompt,
  routePromptViaStdin,
  verifyRegistry
};
