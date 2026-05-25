#!/usr/bin/env node
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const childProcess = require("child_process");

const { copyRecursive, ensureDir } = require("./lib/routing");

const root = __dirname;
const argv = process.argv.slice(2);
const args = new Set(argv);
const dryRun = args.has("--dry-run");
const installAll = args.has("--all");
const installCodex = args.has("--codex") || installAll;
const installClaude = args.has("--claude") || installAll;
const noHooks = args.has("--no-hooks");
const noUserBin = args.has("--no-user-bin");
const legacyTopLevelSkills = args.has("--legacy-top-level-skills");
const shouldPruneLegacyTopLevelSkills = args.has("--prune-legacy-top-level-skills");

function usage() {
  process.stdout.write(`Rust Skills installer

Usage:
  node install.js --codex [--claude] [--dry-run]
  node install.js --all

Options:
  --codex                 Install Codex runtime, top-level skill, and hook.
  --claude                Install Claude Code runtime, top-level skill, and hook.
  --all                   Install both Codex and Claude Code targets.
  --codex-dir <path>      Override Codex home, default ~/.codex.
  --claude-dir <path>     Override Claude Code home, default ~/.claude.
  --home <path>           Override user home for ~/.local/bin linking.
  --no-hooks              Copy runtime and CLI only; do not merge hook settings.
  --no-user-bin           Do not copy rust-skills into ~/.local/bin.
  --prune-legacy-top-level-skills
                           Move old top-level deep skills into a backup folder.
  --legacy-top-level-skills
                           Expose every deep skill as top-level skill.
`);
}

function valueAfter(flag, fallback = null) {
  const index = argv.indexOf(flag);
  if (index === -1 || index + 1 >= argv.length) return fallback;
  return argv[index + 1];
}

function homePath(...parts) {
  const fallbackHome = process.platform === "win32"
    ? (process.env.USERPROFILE || os.homedir() || process.env.HOME)
    : (process.env.HOME || os.homedir() || process.env.USERPROFILE);
  return path.join(valueAfter("--home", fallbackHome), ...parts);
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function cmdQuote(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function commandQuote(value) {
  return process.platform === "win32" ? cmdQuote(value) : shellQuote(value);
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Cannot parse ${filePath}: ${error.message}`);
  }
}

function objectOrEmpty(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function writeJson(filePath, value, actions, action) {
  if (fs.existsSync(filePath)) {
    const backup = `${filePath}.rust-skills-backup-${Date.now()}`;
    actions.push({ action: "backup", source: filePath, target: backup });
    if (!dryRun) fs.copyFileSync(filePath, backup);
  }
  actions.push({ action, target: filePath });
  if (!dryRun) {
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
  }
}

function copyInstall(source, target, actions, options = {}) {
  actions.push(...copyRecursive(source, target, { ...options, dryRun }));
}

function nativeBinaryName() {
  return process.platform === "win32" ? "rust-skills.exe" : "rust-skills";
}

function builtNativeBinaryPath(profile = "release") {
  return path.join(root, "target", profile, nativeBinaryName());
}

function buildNativeCli(actions) {
  const existingRelease = builtNativeBinaryPath("release");
  const existingDebug = builtNativeBinaryPath("debug");

  if (fs.existsSync(existingRelease)) {
    actions.push({ action: "native-cli-present", target: existingRelease });
    return existingRelease;
  }
  if (fs.existsSync(existingDebug)) {
    actions.push({ action: "native-cli-present", target: existingDebug });
    return existingDebug;
  }
  if (dryRun) {
    actions.push({ action: "build-native-cli", command: "cargo build --release --workspace" });
    return null;
  }

  const result = childProcess.spawnSync(
    "cargo",
    ["build", "--release", "-p", "rust-skills-cli", "--bin", "rust-skills"],
    {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024
    }
  );
  actions.push({ action: "build-native-cli", command: "cargo build --release -p rust-skills-cli --bin rust-skills" });
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || "").trim();
    throw new Error(`failed to build native rust-skills CLI${detail ? `: ${detail}` : ""}`);
  }
  return existingRelease;
}

function readClaudeHookMatcher() {
  const hooksConfig = readJson(path.join(root, "hooks", "hooks.json"));
  return hooksConfig.hooks?.UserPromptSubmit?.[0]?.matcher || "(?i)(rust|cargo|rustc|Cargo\\.toml|E0\\d{3,4})";
}

function copyRuntimeData(targetRoot, actions) {
  const dataRoot = path.join(targetRoot, "rust-skills");
  for (const entry of ["index", "skills", "cache", "agents", "commands", "templates", "_meta", "docs"]) {
    copyInstall(path.join(root, entry), path.join(dataRoot, entry), actions);
  }
  for (const file of ["VERSION", "metadata.json", "README.md", "README-zh.md", "README-ja.md"]) {
    copyInstall(path.join(root, file), path.join(dataRoot, file), actions);
  }
}

function packageSkillIds() {
  const skillsRoot = path.join(root, "skills");
  if (!fs.existsSync(skillsRoot)) return [];
  return fs.readdirSync(skillsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => fs.existsSync(path.join(skillsRoot, name, "SKILL.md")));
}

function pruneLegacyTopLevelSkills(targetRoot, actions) {
  const topLevelSkillsRoot = path.join(targetRoot, "skills");
  const backupRoot = path.join(targetRoot, "rust-skills-legacy-top-level-backup");
  const timestamp = Date.now();
  for (const skillId of packageSkillIds()) {
    if (skillId === "rust-skills") continue;
    const target = path.join(topLevelSkillsRoot, skillId);
    if (!fs.existsSync(target)) continue;
    let backup = path.join(backupRoot, `${skillId}-${timestamp}`);
    let suffix = 1;
    while (!dryRun && fs.existsSync(backup)) {
      backup = path.join(backupRoot, `${skillId}-${timestamp}-${suffix}`);
      suffix += 1;
    }
    actions.push({ action: "backup-legacy-top-level-skill", source: target, target: backup });
    if (!dryRun) {
      ensureDir(path.dirname(backup));
      fs.renameSync(target, backup);
    }
  }
}

function installTopLevelSkills(targetRoot, actions) {
  if (legacyTopLevelSkills) {
    copyInstall(path.join(root, "skills"), path.join(targetRoot, "skills"), actions);
    return;
  }
  if (shouldPruneLegacyTopLevelSkills) pruneLegacyTopLevelSkills(targetRoot, actions);
  copyInstall(
    path.join(root, "installer", "skills", "rust-skills"),
    path.join(targetRoot, "skills", "rust-skills"),
    actions
  );
}

function installRuntimeCli(targetRoot, actions) {
  const binDir = path.join(targetRoot, "bin");
  const nativeSource = buildNativeCli(actions);
  const targetNative = path.join(binDir, nativeBinaryName());
  if (nativeSource) {
    copyInstall(nativeSource, targetNative, actions, { executable: true });
  } else {
    actions.push({ action: "copy-native-cli", target: targetNative });
  }
  copyInstall(path.join(root, "rust-skills.js"), path.join(binDir, "rust-skills.js"), actions, { executable: true });
  copyInstall(path.join(root, "lib"), path.join(binDir, "lib"), actions);
  if (!dryRun && process.platform !== "win32") fs.chmodSync(targetNative, 0o755);

  if (process.platform === "win32") {
    const cmdPath = path.join(binDir, "rust-skills.cmd");
    actions.push({ action: "write", target: cmdPath });
    if (!dryRun) {
      fs.writeFileSync(cmdPath, `@echo off\r\n"%~dp0rust-skills.exe" %*\r\n`);
    }
    return cmdPath;
  }
  return targetNative;
}

function installUserBin(sourceBin, actions) {
  if (noUserBin) return;
  const userBinDir = homePath(".local", "bin");
  const target = path.join(userBinDir, process.platform === "win32" ? "rust-skills.cmd" : "rust-skills");
  actions.push({ action: "install-user-bin-shim", source: sourceBin, target });
  if (dryRun) return;
  ensureDir(userBinDir);
  if (process.platform === "win32") {
    fs.writeFileSync(target, `@echo off\r\ncall ${cmdQuote(sourceBin)} %*\r\n`);
  } else {
    fs.writeFileSync(target, `#!/bin/sh\nexec ${shellQuote(sourceBin)} "$@"\n`);
    fs.chmodSync(target, 0o755);
  }
}

function updateFeaturesToml(content) {
  const newline = content.includes("\r\n") ? "\r\n" : "\n";
  const lines = content.length ? content.split(/\r?\n/) : [];
  if (lines.length && lines[lines.length - 1] === "") lines.pop();

  let featuresStart = lines.findIndex((line) => /^\s*\[features\]\s*$/.test(line));
  if (featuresStart === -1) {
    if (lines.length && lines[lines.length - 1].trim() !== "") lines.push("");
    lines.push("[features]", "hooks = true");
    return `${lines.join(newline)}${newline}`;
  }

  let featuresEnd = lines.length;
  for (let index = featuresStart + 1; index < lines.length; index += 1) {
    if (/^\s*\[.*\]\s*$/.test(lines[index])) {
      featuresEnd = index;
      break;
    }
  }

  let hooksLine = -1;
  const nextLines = [...lines];
  for (let index = featuresStart + 1; index < featuresEnd; index += 1) {
    if (/^\s*codex_hooks\s*=/.test(nextLines[index])) {
      nextLines[index] = null;
      continue;
    }
    if (/^\s*hooks\s*=/.test(nextLines[index])) hooksLine = index;
  }

  const compact = nextLines.filter((line) => line !== null);
  if (hooksLine !== -1) {
    const removedBeforeHooks = nextLines.slice(0, hooksLine).filter((line) => line === null).length;
    compact[hooksLine - removedBeforeHooks] = "hooks = true";
  } else {
    featuresStart = compact.findIndex((line) => /^\s*\[features\]\s*$/.test(line));
    compact.splice(featuresStart + 1, 0, "hooks = true");
  }

  return `${compact.join(newline)}${newline}`;
}

function ensureCodexHooksFeature(targetRoot, actions) {
  const configPath = path.join(targetRoot, "config.toml");
  const original = fs.existsSync(configPath) ? fs.readFileSync(configPath, "utf8") : "";
  const next = updateFeaturesToml(original);
  if (next === original) {
    actions.push({ action: "codex-hooks-feature-present", target: configPath });
    return;
  }
  if (fs.existsSync(configPath)) {
    const backup = `${configPath}.rust-skills-backup-${Date.now()}`;
    actions.push({ action: "backup", source: configPath, target: backup });
    if (!dryRun) fs.copyFileSync(configPath, backup);
  }
  actions.push({ action: "enable-codex-hooks-feature", target: configPath });
  if (!dryRun) {
    ensureDir(path.dirname(configPath));
    fs.writeFileSync(configPath, next);
  }
}

function isRustSkillsCodexHook(entry) {
  return JSON.stringify(entry).includes("rust-skill-router-hook.js")
    || JSON.stringify(entry).includes("rust-skill-eval-hook.");
}

function writeCodexHookSettings(targetRoot, actions) {
  if (noHooks) return;
  ensureCodexHooksFeature(targetRoot, actions);

  const hooksPath = path.join(targetRoot, "hooks.json");
  const hookScript = path.join(path.resolve(targetRoot), "hooks", "rust-skill-router-hook.js");
  const command = `node ${commandQuote(hookScript)}`;
  const settings = readJson(hooksPath);
  const existingHooks = objectOrEmpty(settings.hooks);
  const existingUserPromptHooks = Array.isArray(existingHooks.UserPromptSubmit)
    ? existingHooks.UserPromptSubmit
    : [];
  const preserved = existingUserPromptHooks.filter((entry) => !isRustSkillsCodexHook(entry));
  const nextSettings = {
    ...settings,
    hooks: {
      ...existingHooks,
      UserPromptSubmit: [
        ...preserved,
        {
          hooks: [
            {
              type: "command",
              command
            }
          ]
        }
      ]
    }
  };
  if (JSON.stringify(settings) !== JSON.stringify(nextSettings)) {
    writeJson(hooksPath, nextSettings, actions, "merge-codex-hook-settings");
  } else {
    actions.push({ action: "codex-hook-settings-present", target: hooksPath });
  }
}

function writeClaudeHookSettings(targetRoot, actions) {
  if (noHooks) return;
  const settingsPath = path.join(targetRoot, "settings.json");
  const hookScript = path.join(path.resolve(targetRoot), "hooks", "rust-skill-eval-hook.js");
  const command = `node ${commandQuote(hookScript)}`;
  const settings = readJson(settingsPath);
  const existingHooks = objectOrEmpty(settings.hooks);
  const existingUserPromptHooks = Array.isArray(existingHooks.UserPromptSubmit)
    ? existingHooks.UserPromptSubmit
    : [];
  const preserved = existingUserPromptHooks.filter((entry) =>
    !JSON.stringify(entry).includes("rust-skill-eval-hook.")
  );
  const nextSettings = {
    ...settings,
    hooks: {
      ...existingHooks,
      UserPromptSubmit: [
        ...preserved,
        {
          matcher: readClaudeHookMatcher(),
          hooks: [
            {
              type: "command",
              command
            }
          ]
        }
      ]
    }
  };
  if (JSON.stringify(settings) !== JSON.stringify(nextSettings)) {
    writeJson(settingsPath, nextSettings, actions, "merge-claude-hook-settings");
  } else {
    actions.push({ action: "claude-hook-settings-present", target: settingsPath });
  }
}

function installCodexTarget(actions) {
  const targetRoot = valueAfter("--codex-dir", homePath(".codex"));
  installTopLevelSkills(targetRoot, actions);
  copyInstall(path.join(root, ".codex", "hooks"), path.join(targetRoot, "hooks"), actions);
  copyRuntimeData(targetRoot, actions);
  const bin = installRuntimeCli(targetRoot, actions);
  installUserBin(bin, actions);
  writeCodexHookSettings(targetRoot, actions);
}

function installClaudeTarget(actions) {
  const targetRoot = valueAfter("--claude-dir", homePath(".claude"));
  installTopLevelSkills(targetRoot, actions);
  copyInstall(path.join(root, ".claude", "hooks"), path.join(targetRoot, "hooks"), actions);
  copyRuntimeData(targetRoot, actions);
  const bin = installRuntimeCli(targetRoot, actions);
  installUserBin(bin, actions);
  writeClaudeHookSettings(targetRoot, actions);
}

if (args.has("--help") || args.has("-h")) {
  usage();
  process.exit(0);
}

if (!installCodex && !installClaude) {
  usage();
  process.exit(2);
}

const actions = [];
if (installCodex) installCodexTarget(actions);
if (installClaude) installClaudeTarget(actions);

process.stdout.write(`${JSON.stringify({
  status: "ok",
  dryRun,
  topLevelSkills: legacyTopLevelSkills ? "legacy" : "single-entry",
  targets: {
    codex: installCodex,
    claude: installClaude
  },
  actions
}, null, 2)}\n`);
