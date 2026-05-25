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
    path.join(root, "target", "release", bin),
    path.join(root, "target", "debug", bin),
    path.join(root, "bin", bin),
    path.join(startDir, "..", "bin", bin),
    path.join(startDir, "..", bin)
  ].filter(Boolean);
}

function commandPlan(startDir = __dirname) {
  for (const candidate of nativeCommandCandidates(startDir)) {
    if (fileExists(candidate)) return { command: candidate, prefixArgs: [], cwd: path.resolve(startDir, "..") };
  }

  const root = path.resolve(startDir, "..");
  if (fileExists(path.join(root, "Cargo.toml"))) {
    return {
      command: "cargo",
      prefixArgs: ["run", "--quiet", "-p", "rust-skills-cli", "--bin", "rust-skills", "--"],
      cwd: root
    };
  }

  return null;
}

function runRustSkills(args, options = {}) {
  const plan = commandPlan(options.startDir || __dirname);
  if (!plan) {
    throw new Error("rust-skills native binary not found; run cargo build --workspace");
  }

  const runtimeRoot = path.resolve(options.root || findRuntimeRoot(options.startDir || __dirname));
  const result = childProcess.spawnSync(plan.command, [...plan.prefixArgs, ...args], {
    cwd: plan.cwd,
    env: {
      ...process.env,
      RUST_SKILLS_ROOT: runtimeRoot
    },
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || "").trim();
    throw new Error(`rust-skills ${args[0]} failed with exit ${result.status}${detail ? `: ${detail}` : ""}`);
  }
  return JSON.parse(result.stdout);
}

function routePrompt(prompt, options = {}) {
  return runRustSkills(["route", "--json", String(prompt || "")], options);
}

function detectPrompt(prompt, options = {}) {
  return runRustSkills(["detect", "--json", String(prompt || "")], options);
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
  detectPrompt,
  ensureDir,
  fileExists,
  findRuntimeRoot,
  listSkills,
  querySkill,
  removeDir,
  routePrompt,
  verifyRegistry
};
