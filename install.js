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
  --no-hooks              Do not merge Codex/Claude hook settings. Runtime and
                           hook files are still copied.
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

function latestMtimeMs(target) {
  if (!fs.existsSync(target)) return 0;
  const stat = fs.statSync(target);
  if (!stat.isDirectory()) return stat.mtimeMs;
  return fs.readdirSync(target)
    .map((entry) => latestMtimeMs(path.join(target, entry)))
    .reduce((latest, value) => Math.max(latest, value), stat.mtimeMs);
}

function rustSourceMtimeMs() {
  return Math.max(
    latestMtimeMs(path.join(root, "Cargo.toml")),
    latestMtimeMs(path.join(root, "Cargo.lock")),
    latestMtimeMs(path.join(root, "crates"))
  );
}

function nativeBinaryIsFresh(binaryPath) {
  return fs.existsSync(binaryPath) && fs.statSync(binaryPath).mtimeMs >= rustSourceMtimeMs();
}

function buildNativeCli(actions) {
  const existingRelease = builtNativeBinaryPath("release");
  const existingDebug = builtNativeBinaryPath("debug");

  if (nativeBinaryIsFresh(existingRelease)) {
    actions.push({ action: "native-cli-present", target: existingRelease });
    return existingRelease;
  }
  if (nativeBinaryIsFresh(existingDebug)) {
    actions.push({ action: "native-cli-present", target: existingDebug });
    return existingDebug;
  }
  if (fs.existsSync(existingRelease) || fs.existsSync(existingDebug)) {
    actions.push({ action: "native-cli-stale", target: existingRelease });
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
  if (result.error || result.status !== 0) {
    const detail = (result.error?.message || result.stderr || result.stdout || "").trim();
    fail(
      `failed to build native rust-skills CLI${detail ? `: ${detail}` : ""}\n` +
        "Install a Rust toolchain via https://rustup.rs and re-run `node install.js` — " +
        "the installer is idempotent and will pick up where it left off."
    );
  }
  return existingRelease;
}

function fail(message) {
  process.stderr.write(`install error: ${message}\n`);
  process.exit(1);
}

// Full installs always ship the native binary (preflightToolchain guarantees
// it), so hooks call it directly: one ~10ms native spawn per prompt instead
// of node (~50ms) + a nested binary spawn. The node hook scripts stay
// installed under <targetRoot>/hooks/ as a manual fallback and for plugin
// layouts that cannot guarantee a built binary.
function hookCommand(targetRoot, platform) {
  const binary = path.join(
    path.resolve(targetRoot),
    "bin",
    process.platform === "win32" ? "rust-skills.cmd" : "rust-skills"
  );
  return `${commandQuote(binary)} hook ${platform}`;
}

function cargoIsUsable() {
  const probe = childProcess.spawnSync("cargo", ["--version"], { encoding: "utf8" });
  return !probe.error && probe.status === 0;
}

// Fail fast BEFORE copying anything: a missing toolchain mid-install used to
// leave a partial install behind with only a bare stack trace.
function preflightToolchain() {
  if (dryRun) return;
  if (nativeBinaryIsFresh(builtNativeBinaryPath("release"))) return;
  if (nativeBinaryIsFresh(builtNativeBinaryPath("debug"))) return;
  if (cargoIsUsable()) return;
  fail(
    "no prebuilt rust-skills binary found and `cargo --version` failed.\n" +
      "Install a Rust toolchain via https://rustup.rs (or place a prebuilt binary at " +
      `${builtNativeBinaryPath("release")}), then re-run \`node install.js\`.`
  );
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

// Pinned install locations (actual --codex-dir/--claude-dir targets) take
// priority over the conventional $installed_home/$HOME probing so custom-dir
// installs resolve without RUST_SKILLS_BIN/ROOT being exported manually.
function posixUserBinShim(installedHome, pinnedRuntimes = []) {
  const quotedHome = shellQuote(installedHome);
  const pinnedLines = (profileFilter) => pinnedRuntimes
    .filter((entry) => profileFilter === null || entry.profile === profileFilter)
    .map((entry) => `    try_exec ${shellQuote(entry.bin)} ${shellQuote(entry.root)} "$@"`)
    .join("\n");
  return `#!/bin/sh
set -e

installed_home=${quotedHome}
profile=\${RUST_SKILLS_PROFILE:-}

try_exec() {
  candidate=$1
  runtime_root=$2
  shift 2
  if [ -n "$candidate" ] && [ -x "$candidate" ]; then
    if [ -n "$runtime_root" ] && [ -z "\${RUST_SKILLS_ROOT:-}" ]; then
      RUST_SKILLS_ROOT=$runtime_root
      export RUST_SKILLS_ROOT
    fi
    exec "$candidate" "$@"
  fi
}

if [ -n "\${RUST_SKILLS_BIN:-}" ]; then
  try_exec "$RUST_SKILLS_BIN" "\${RUST_SKILLS_ROOT:-}" "$@"
fi

if [ -n "\${RUST_SKILLS_ROOT:-}" ]; then
  runtime_parent=$(dirname "$RUST_SKILLS_ROOT")
  try_exec "$runtime_parent/bin/rust-skills" "$RUST_SKILLS_ROOT" "$@"
fi

case "$profile" in
  codex)
${pinnedLines("codex")}
    try_exec "$installed_home/.codex/bin/rust-skills" "$installed_home/.codex/rust-skills" "$@"
    try_exec "\${HOME:-}/.codex/bin/rust-skills" "\${HOME:-}/.codex/rust-skills" "$@"
    ;;
  claude|claude-code)
${pinnedLines("claude")}
    try_exec "$installed_home/.claude/bin/rust-skills" "$installed_home/.claude/rust-skills" "$@"
    try_exec "\${HOME:-}/.claude/bin/rust-skills" "\${HOME:-}/.claude/rust-skills" "$@"
    ;;
  "")
${pinnedLines(null)}
    try_exec "$installed_home/.codex/bin/rust-skills" "$installed_home/.codex/rust-skills" "$@"
    try_exec "$installed_home/.claude/bin/rust-skills" "$installed_home/.claude/rust-skills" "$@"
    try_exec "\${HOME:-}/.codex/bin/rust-skills" "\${HOME:-}/.codex/rust-skills" "$@"
    try_exec "\${HOME:-}/.claude/bin/rust-skills" "\${HOME:-}/.claude/rust-skills" "$@"
    ;;
  *)
    echo "unsupported RUST_SKILLS_PROFILE: $profile" >&2
    exit 2
    ;;
esac

echo "rust-skills shim could not find an installed runtime binary" >&2
exit 127
`;
}

function windowsUserBinShim(installedHome, pinnedRuntimes = []) {
  const escapedHome = String(installedHome).replace(/%/g, "%%");
  const winPath = (value) => String(value).replace(/%/g, "%%").replace(/\//g, "\\");
  const pinnedLines = (profileFilter) => pinnedRuntimes
    .filter((entry) => profileFilter === null || entry.profile === profileFilter)
    .map((entry) => `if exist "${winPath(entry.bin)}" call :run "${winPath(entry.bin)}" "${winPath(entry.root)}" %* & exit /b %ERRORLEVEL%\r`)
    .join("\n");
  return `@echo off\r
setlocal\r
set "INSTALLED_HOME=${escapedHome}"\r
if not "%RUST_SKILLS_BIN%"=="" if exist "%RUST_SKILLS_BIN%" "%RUST_SKILLS_BIN%" %* & exit /b %ERRORLEVEL%\r
if /I "%RUST_SKILLS_PROFILE%"=="codex" goto codex\r
if /I "%RUST_SKILLS_PROFILE%"=="claude" goto claude\r
if /I "%RUST_SKILLS_PROFILE%"=="claude-code" goto claude\r
if not "%RUST_SKILLS_PROFILE%"=="" goto bad_profile\r
:default\r
${pinnedLines(null)}
if exist "%INSTALLED_HOME%\\.codex\\bin\\rust-skills.exe" call :run "%INSTALLED_HOME%\\.codex\\bin\\rust-skills.exe" "%INSTALLED_HOME%\\.codex\\rust-skills" %* & exit /b %ERRORLEVEL%\r
if exist "%INSTALLED_HOME%\\.claude\\bin\\rust-skills.exe" call :run "%INSTALLED_HOME%\\.claude\\bin\\rust-skills.exe" "%INSTALLED_HOME%\\.claude\\rust-skills" %* & exit /b %ERRORLEVEL%\r
if exist "%USERPROFILE%\\.codex\\bin\\rust-skills.exe" call :run "%USERPROFILE%\\.codex\\bin\\rust-skills.exe" "%USERPROFILE%\\.codex\\rust-skills" %* & exit /b %ERRORLEVEL%\r
if exist "%USERPROFILE%\\.claude\\bin\\rust-skills.exe" call :run "%USERPROFILE%\\.claude\\bin\\rust-skills.exe" "%USERPROFILE%\\.claude\\rust-skills" %* & exit /b %ERRORLEVEL%\r
goto missing\r
:codex\r
${pinnedLines("codex")}
if exist "%INSTALLED_HOME%\\.codex\\bin\\rust-skills.exe" call :run "%INSTALLED_HOME%\\.codex\\bin\\rust-skills.exe" "%INSTALLED_HOME%\\.codex\\rust-skills" %* & exit /b %ERRORLEVEL%\r
if exist "%USERPROFILE%\\.codex\\bin\\rust-skills.exe" call :run "%USERPROFILE%\\.codex\\bin\\rust-skills.exe" "%USERPROFILE%\\.codex\\rust-skills" %* & exit /b %ERRORLEVEL%\r
goto missing\r
:claude\r
${pinnedLines("claude")}
if exist "%INSTALLED_HOME%\\.claude\\bin\\rust-skills.exe" call :run "%INSTALLED_HOME%\\.claude\\bin\\rust-skills.exe" "%INSTALLED_HOME%\\.claude\\rust-skills" %* & exit /b %ERRORLEVEL%\r
if exist "%USERPROFILE%\\.claude\\bin\\rust-skills.exe" call :run "%USERPROFILE%\\.claude\\bin\\rust-skills.exe" "%USERPROFILE%\\.claude\\rust-skills" %* & exit /b %ERRORLEVEL%\r
goto missing\r
:bad_profile\r
echo unsupported RUST_SKILLS_PROFILE: %RUST_SKILLS_PROFILE% 1>&2\r
exit /b 2\r
:missing\r
echo rust-skills shim could not find an installed runtime binary 1>&2\r
exit /b 127\r
:run\r
set "RUST_SKILLS_BIN_SELECTED=%~1"\r
if "%RUST_SKILLS_ROOT%"=="" set "RUST_SKILLS_ROOT=%~2"\r
shift\r
shift\r
"%RUST_SKILLS_BIN_SELECTED%" %*\r
exit /b %ERRORLEVEL%\r
`;
}

// Actual install locations recorded by installUserBin calls; the shim pins
// these so --codex-dir/--claude-dir installs outside --home still resolve.
// The second install target rewrites the shim with both entries included.
const pinnedRuntimes = [];

function installUserBin(sourceBin, actions, profile) {
  if (noUserBin) return;
  const targetRoot = path.dirname(path.dirname(sourceBin));
  pinnedRuntimes.push({
    profile,
    bin: sourceBin,
    root: path.join(targetRoot, "rust-skills")
  });
  const installHome = valueAfter("--home", process.platform === "win32"
    ? (process.env.USERPROFILE || os.homedir() || process.env.HOME)
    : (process.env.HOME || os.homedir() || process.env.USERPROFILE));
  const userBinDir = path.join(installHome, ".local", "bin");
  const target = path.join(userBinDir, process.platform === "win32" ? "rust-skills.cmd" : "rust-skills");
  actions.push({ action: "install-user-bin-shim", source: sourceBin, target, selector: "neutral-runtime" });
  if (dryRun) return;
  ensureDir(userBinDir);
  if (process.platform === "win32") {
    fs.writeFileSync(target, windowsUserBinShim(installHome, pinnedRuntimes));
  } else {
    fs.writeFileSync(target, posixUserBinShim(installHome, pinnedRuntimes));
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

// Matches both the current native hook command and the legacy node hook
// scripts, so re-installs and upgrades replace our entry instead of stacking.
// Quoting varies by platform (shellQuote single-quotes on POSIX, cmdQuote
// double-quotes on Windows), so allow any quote characters between the binary
// name and the hook subcommand.
function isRustSkillsHookEntry(entry) {
  const commands = [
    entry?.command,
    ...(Array.isArray(entry?.hooks) ? entry.hooks.map((hook) => hook?.command) : [])
  ].filter((value) => typeof value === "string");
  return commands.some((command) =>
    command.includes("rust-skill-router-hook.js")
      || command.includes("rust-skill-eval-hook.")
      || /rust-skills(\.cmd)?['"]* hook (codex|claude)(?![A-Za-z0-9_-])/.test(command));
}

function writeCodexHookSettings(targetRoot, actions) {
  if (noHooks) return;
  ensureCodexHooksFeature(targetRoot, actions);

  const hooksPath = path.join(targetRoot, "hooks.json");
  const command = hookCommand(targetRoot, "codex");
  const settings = readJson(hooksPath);
  const existingHooks = objectOrEmpty(settings.hooks);
  const existingUserPromptHooks = Array.isArray(existingHooks.UserPromptSubmit)
    ? existingHooks.UserPromptSubmit
    : [];
  const preserved = existingUserPromptHooks.filter((entry) => !isRustSkillsHookEntry(entry));
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
  const command = hookCommand(targetRoot, "claude");
  const settings = readJson(settingsPath);
  const existingHooks = objectOrEmpty(settings.hooks);
  const existingUserPromptHooks = Array.isArray(existingHooks.UserPromptSubmit)
    ? existingHooks.UserPromptSubmit
    : [];
  const preserved = existingUserPromptHooks.filter((entry) => !isRustSkillsHookEntry(entry));
  const nextSettings = {
    ...settings,
    hooks: {
      ...existingHooks,
      UserPromptSubmit: [
        ...preserved,
        {
          // No matcher: Claude Code does not apply matchers to
          // UserPromptSubmit, and gating happens inside the hook itself.
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
  installUserBin(bin, actions, "codex");
  writeCodexHookSettings(targetRoot, actions);
}

function installClaudeTarget(actions) {
  const targetRoot = valueAfter("--claude-dir", homePath(".claude"));
  installTopLevelSkills(targetRoot, actions);
  copyInstall(path.join(root, ".claude", "hooks"), path.join(targetRoot, "hooks"), actions);
  copyRuntimeData(targetRoot, actions);
  const bin = installRuntimeCli(targetRoot, actions);
  installUserBin(bin, actions, "claude");
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
preflightToolchain();
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

const localBin = homePath(".local", "bin");
const onPath = String(process.env.PATH || "")
  .split(path.delimiter)
  .some((entry) => entry && path.resolve(entry) === localBin);
if (!dryRun && !onPath) {
  process.stderr.write(
    `note: ${localBin} is not on your PATH; add it (export PATH="$HOME/.local/bin:$PATH") ` +
      "or call the installed shim by absolute path.\n"
  );
}
