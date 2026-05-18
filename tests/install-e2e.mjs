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

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "rust-skills-install-"));
try {
  const codexDir = path.join(temp, ".codex");
  const claudeDir = path.join(temp, ".claude");
  fs.mkdirSync(codexDir, { recursive: true });
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
  assert(!fs.existsSync(path.join(codexDir, "skills", "m01-ownership")), "Codex should not expose deep skills at top level");
  assert(fs.existsSync(path.join(codexDir, "rust-skills", "skills", "m01-ownership", "SKILL.md")), "Codex deep skill missing");
  assert(fs.existsSync(path.join(claudeDir, "skills", "rust-skills", "SKILL.md")), "Claude top-level skill missing");
  assert(fs.existsSync(path.join(claudeDir, "rust-skills", "skills", "domain-web", "SKILL.md")), "Claude deep skill missing");

  const config = fs.readFileSync(path.join(codexDir, "config.toml"), "utf8");
  assert(config.includes("[other]\nhooks = false"), "installer should preserve unrelated hooks key");
  assert(config.includes("[features]\nhooks = true"), "installer should enable [features].hooks");
  assert(!config.includes("codex_hooks"), "installer should remove deprecated codex hook feature");

  const hooks = JSON.parse(fs.readFileSync(path.join(codexDir, "hooks.json"), "utf8"));
  const rustHooks = (hooks.hooks.UserPromptSubmit || [])
    .filter((entry) => JSON.stringify(entry).includes("rust-skill-router-hook.js"));
  assert(rustHooks.length === 1, `expected one Codex hook, got ${rustHooks.length}`);

  const claudeSettings = JSON.parse(fs.readFileSync(path.join(claudeDir, "settings.json"), "utf8"));
  const claudeHooks = (claudeSettings.hooks.UserPromptSubmit || [])
    .filter((entry) => JSON.stringify(entry).includes("rust-skill-eval-hook.js"));
  assert(claudeHooks.length === 1, `expected one Claude hook, got ${claudeHooks.length}`);

  const userBin = path.join(temp, ".local", "bin", process.platform === "win32" ? "rust-skills.cmd" : "rust-skills");
  assert(fs.existsSync(userBin), "user PATH bin missing");

  const route = run(userBin, ["route", "--json", "Rust axum handler Rc cannot be sent"]);
  const routeJson = JSON.parse(route.stdout);
  assert(routeJson.skills.includes("rust-router"), "installed CLI should route rust-router");
  assert(routeJson.skills.includes("domain-web"), "installed CLI should route domain-web");
  assert(routeJson.skills.includes("m07-concurrency"), "installed CLI should route m07-concurrency");

  console.log("install e2e: PASS");
} finally {
  rmrf(temp);
}
