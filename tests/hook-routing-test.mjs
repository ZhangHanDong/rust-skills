#!/usr/bin/env node
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(root, "rust-skills.js");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function runHook(hookPath, prompt, extraEnv = {}) {
  const result = spawnSync(process.execPath, [hookPath], {
    cwd: root,
    input: JSON.stringify({ prompt }),
    encoding: "utf8",
    env: {
      ...process.env,
      RUST_SKILLS_BIN: cli,
      RUST_SKILLS_ROOT: root,
      CLAUDE_PLUGIN_ROOT: root,
      ...extraEnv
    }
  });
  assert(result.status === 0, result.stderr || result.stdout);
  return result.stdout;
}

function runHookPayload(hookPath, payload, extraEnv = {}) {
  const result = spawnSync(process.execPath, [hookPath], {
    cwd: root,
    input: JSON.stringify(payload),
    encoding: "utf8",
    env: {
      ...process.env,
      RUST_SKILLS_BIN: cli,
      RUST_SKILLS_ROOT: root,
      CLAUDE_PLUGIN_ROOT: root,
      ...extraEnv
    }
  });
  assert(result.status === 0, result.stderr || result.stdout);
  return result.stdout;
}

const codexHook = path.join(root, ".codex", "hooks", "rust-skill-router-hook.js");
const claudeHook = path.join(root, ".claude", "hooks", "rust-skill-eval-hook.js");

const codexNonRust = runHook(codexHook, "帮我订一张机票");
assert(codexNonRust.trim() === "{}", `Codex non-Rust prompt should no-op, got ${codexNonRust}`);

const codexDecorPrompt = runHookPayload(codexHook, {
  prompt: "装修卧室灯光，先总结每个灯的尺寸和亮度文档，然后讨论怎么挂",
  transcript: "Previous unrelated command: cargo test"
});
assert(
  codexDecorPrompt.trim() === "{}",
  `Codex should route only the current prompt, got ${codexDecorPrompt}`
);

const codexUnknownPayload = runHookPayload(codexHook, {
  transcript: "Previous unrelated command: cargo test and Rust docs"
});
assert(
  codexUnknownPayload.trim() === "{}",
  `Codex unknown JSON payload should fail closed, got ${codexUnknownPayload}`
);

const codexRust = JSON.parse(runHook(codexHook, "Web API reports Rc cannot be sent between threads"));
const codexContext = codexRust.hookSpecificOutput?.additionalContext || "";
assert(codexContext.includes("RUST SKILLS CLI ROUTE"), "Codex Rust prompt should inject route context");
assert(codexContext.includes("m07-concurrency"), "Codex Rust prompt should route m07-concurrency");
assert(codexContext.includes("domain-web"), "Codex Rust prompt should route domain-web");

const claudeNonRust = runHook(claudeHook, "今天天气怎么样");
assert(claudeNonRust.length === 0, `Claude non-Rust prompt should no-op, got ${claudeNonRust}`);

const claudeRust = runHook(claudeHook, "Rust E0382 value moved in trading system");
assert(claudeRust.includes("RUST SKILLS CLI ROUTE"), "Claude Rust prompt should inject route context");
assert(claudeRust.includes("m01-ownership"), "Claude Rust prompt should route m01-ownership");
assert(claudeRust.includes("domain-fintech"), "Claude Rust prompt should route domain-fintech");
assert(!claudeRust.includes("Always invoke with Skill() tool"), "Claude hook should not require deep top-level Skill entries");

console.log("hook routing test: PASS");
