#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function rmrf(target) {
  fs.rmSync(target, { recursive: true, force: true });
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    ...options
  });
  assert(result.status === 0, result.stderr || result.stdout);
  return result;
}

function realpath(target) {
  return fs.realpathSync(target);
}

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "rust-skills-install-"));
try {
  const dryRunTemp = path.join(temp, "dry-run");
  const dryRunCodexDir = path.join(dryRunTemp, ".codex");
  fs.mkdirSync(dryRunCodexDir, { recursive: true });
  const dryRunConfigPath = path.join(dryRunCodexDir, "config.toml");
  const dryRunConfig = [
    "[features]",
    "codex_hooks = true",
    ""
  ].join("\n");
  fs.writeFileSync(dryRunConfigPath, dryRunConfig);
  run(process.execPath, [
    path.join(root, "install.js"),
    "--codex",
    "--dry-run",
    "--home",
    dryRunTemp,
    "--codex-dir",
    dryRunCodexDir
  ]);
  assert(fs.readFileSync(dryRunConfigPath, "utf8") === dryRunConfig, "dry-run should not rewrite config");
  assert(!fs.existsSync(path.join(dryRunCodexDir, "skills")), "dry-run should not create skills");
  assert(!fs.existsSync(path.join(dryRunCodexDir, "hooks")), "dry-run should not create hooks");
  assert(!fs.existsSync(path.join(dryRunCodexDir, "bin")), "dry-run should not create bin");
  assert(!fs.existsSync(path.join(dryRunTemp, ".local")), "dry-run should not create user bin");

  const pruneDir = path.join(temp, "prune", ".codex");
  const pruneSkill = path.join(pruneDir, "skills", "m01-ownership", "SKILL.md");
  fs.mkdirSync(path.dirname(pruneSkill), { recursive: true });
  fs.writeFileSync(pruneSkill, "legacy or user top-level ownership skill\n");
  run(process.execPath, [
    path.join(root, "install.js"),
    "--codex",
    "--home",
    path.join(temp, "prune"),
    "--codex-dir",
    pruneDir,
    "--no-hooks",
    "--no-user-bin",
    "--prune-legacy-top-level-skills"
  ]);
  assert(!fs.existsSync(pruneSkill), "prune should move legacy top-level skill out of top-level namespace");
  const backupRoot = path.join(pruneDir, "rust-skills-legacy-top-level-backup");
  const backups = fs.readdirSync(backupRoot);
  assert(backups.some((entry) => entry.startsWith("m01-ownership-")), "legacy backup missing");
  const backupSkill = backups
    .map((entry) => path.join(backupRoot, entry, "SKILL.md"))
    .find((candidate) => fs.existsSync(candidate));
  assert(
    backupSkill && fs.readFileSync(backupSkill, "utf8") === "legacy or user top-level ownership skill\n",
    "legacy backup should preserve original skill content"
  );

  const quotedHome = path.join(temp, "home with spaces");
  const quotedCodexDir = path.join(quotedHome, ".codex");
  run(process.execPath, [
    path.join(root, "install.js"),
    "--codex",
    "--home",
    quotedHome,
    "--codex-dir",
    quotedCodexDir,
    "--no-hooks"
  ]);
  const quotedUserBin = path.join(
    quotedHome,
    ".local",
    "bin",
    process.platform === "win32" ? "rust-skills.cmd" : "rust-skills"
  );
  const quotedRoute = run(quotedUserBin, ["detect", "--json", "Rust E0382 value moved"]);
  assert(JSON.parse(quotedRoute.stdout).should_inject === true, "quoted user bin shim should work");
  if (process.platform !== "win32") {
    assert(
      fs.readFileSync(quotedUserBin, "utf8").includes("neutral-runtime") ||
        fs.readFileSync(quotedUserBin, "utf8").includes("RUST_SKILLS_PROFILE"),
      "POSIX user bin shim should select an installed runtime dynamically"
    );
  }

  const codexDir = path.join(temp, ".codex");
  const claudeDir = path.join(temp, ".claude");
  fs.mkdirSync(codexDir, { recursive: true });
  const preservedSkill = path.join(codexDir, "skills", "m01-ownership", "SKILL.md");
  fs.mkdirSync(path.dirname(preservedSkill), { recursive: true });
  fs.writeFileSync(preservedSkill, "user custom ownership skill\n");
  fs.writeFileSync(
    path.join(codexDir, "config.toml"),
    [
      "[other]",
      "hooks = false",
      "",
      "[features]",
      "codex_hooks = true",
      "",
      "[projects.\"/tmp/example\"]",
      "trust_level = \"trusted\"",
      ""
    ].join("\n")
  );

  run(process.execPath, [
    path.join(root, "install.js"),
    "--codex",
    "--claude",
    "--home",
    temp,
    "--codex-dir",
    codexDir,
    "--claude-dir",
    claudeDir
  ]);

  assert(fs.existsSync(path.join(codexDir, "skills", "rust-skills", "SKILL.md")), "Codex top-level skill missing");
  assert(
    fs.readFileSync(preservedSkill, "utf8") === "user custom ownership skill\n",
    "installer should not prune pre-existing top-level skills by default"
  );
  assert(fs.existsSync(path.join(codexDir, "rust-skills", "skills", "m01-ownership", "SKILL.md")), "Codex deep skill missing");
  assert(fs.existsSync(path.join(claudeDir, "skills", "rust-skills", "SKILL.md")), "Claude top-level skill missing");
  assert(fs.existsSync(path.join(claudeDir, "rust-skills", "skills", "domain-web", "SKILL.md")), "Claude deep skill missing");
  assert(!fs.existsSync(path.join(codexDir, "AGENTS.md")), "installer should not overwrite global Codex AGENTS.md");
  assert(!fs.existsSync(path.join(claudeDir, "agents")), "installer should not write global Claude agents");
  assert(!fs.existsSync(path.join(claudeDir, "commands")), "installer should not write global Claude commands");

  const config = fs.readFileSync(path.join(codexDir, "config.toml"), "utf8");
  assert(config.includes("[other]\nhooks = false"), "installer should preserve unrelated hooks key");
  assert(config.includes("[features]\nhooks = true"), "installer should enable [features].hooks");
  assert(!config.includes("codex_hooks"), "installer should remove deprecated codex hook feature");

  const hooks = JSON.parse(fs.readFileSync(path.join(codexDir, "hooks.json"), "utf8"));
  const rustHooks = (hooks.hooks.UserPromptSubmit || [])
    .filter((entry) => JSON.stringify(entry).includes("hook codex"));
  assert(rustHooks.length === 1, `expected one Codex hook, got ${rustHooks.length}`);

  const claudeSettings = JSON.parse(fs.readFileSync(path.join(claudeDir, "settings.json"), "utf8"));
  const claudeHooks = (claudeSettings.hooks.UserPromptSubmit || [])
    .filter((entry) => JSON.stringify(entry).includes("hook claude"));
  assert(claudeHooks.length === 1, `expected one Claude hook, got ${claudeHooks.length}`);

  // The installed native hook must work end-to-end via the binary itself.
  const installedBin = path.join(codexDir, "bin", process.platform === "win32" ? "rust-skills.cmd" : "rust-skills");
  const codexHookOut = run(installedBin, ["hook", "codex"], { input: '{"prompt":"Rust E0382 value moved in axum handler"}' });
  assert(codexHookOut.stdout.includes("hookSpecificOutput"), "native codex hook should emit an envelope for Rust prompts");
  assert(codexHookOut.stdout.includes("rust-router"), "native codex hook should route rust-router");
  const codexHookSilent = run(installedBin, ["hook", "codex"], { input: '{"prompt":"what should I cook tonight"}' });
  assert(codexHookSilent.stdout.trim() === "{}", "native codex hook should emit {} for non-Rust prompts");
  const claudeBin = path.join(claudeDir, "bin", process.platform === "win32" ? "rust-skills.cmd" : "rust-skills");
  const claudeHookOut = run(claudeBin, ["hook", "claude"], { input: '{"prompt":"Rust E0382 value moved"}' });
  assert(claudeHookOut.stdout.includes("RUST SKILLS AUTO ROUTE"), "native claude hook should emit context for Rust prompts");
  const claudeHookSilent = run(claudeBin, ["hook", "claude"], { input: '{"prompt":"hello there"}' });
  assert(claudeHookSilent.stdout.trim() === "", "native claude hook should stay silent for non-Rust prompts");

  const userBin = path.join(temp, ".local", "bin", process.platform === "win32" ? "rust-skills.cmd" : "rust-skills");
  assert(fs.existsSync(userBin), "user PATH bin missing");
  assert(!fs.existsSync(path.join(temp, ".local", "bin", "lib")), "user PATH bin should not contain a generic lib directory");

  const route = run(userBin, ["route", "--json", "Rust axum handler Rc cannot be sent"]);
  const routeJson = JSON.parse(route.stdout);
  assert(routeJson.skills.includes("rust-router"), "installed CLI should route rust-router");
  assert(routeJson.skills.includes("domain-web"), "installed CLI should route domain-web");
  assert(routeJson.skills.includes("m07-concurrency"), "installed CLI should route m07-concurrency");

  const codexVerify = JSON.parse(
    run(userBin, ["verify", "--json"], {
      env: { ...process.env, RUST_SKILLS_PROFILE: "codex" }
    }).stdout
  );
  assert(
    realpath(codexVerify.runtime_root) === realpath(path.join(codexDir, "rust-skills")),
    "shim should select Codex runtime"
  );

  const claudeVerify = JSON.parse(
    run(userBin, ["verify", "--json"], {
      env: { ...process.env, RUST_SKILLS_PROFILE: "claude" }
    }).stdout
  );
  assert(
    realpath(claudeVerify.runtime_root) === realpath(path.join(claudeDir, "rust-skills")),
    "shim should select Claude runtime"
  );

  console.log("install e2e: PASS");
} finally {
  rmrf(temp);
}
