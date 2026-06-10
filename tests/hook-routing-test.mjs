#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(
  root,
  "target",
  "release",
  process.platform === "win32" ? "rust-skills.exe" : "rust-skills"
);

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

function runIsolatedHook(hookPath, prompt, fakeCli) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "rust-skills-hook-"));
  try {
    const hookDir = hookPath.includes(`${path.sep}.claude${path.sep}`)
      ? path.join(temp, ".claude", "hooks")
      : path.join(temp, ".codex", "hooks");
    fs.mkdirSync(hookDir, { recursive: true });
    const isolatedHook = path.join(hookDir, path.basename(hookPath));
    fs.copyFileSync(hookPath, isolatedHook);
    const result = spawnSync(process.execPath, [isolatedHook], {
      cwd: temp,
      input: JSON.stringify({ prompt }),
      encoding: "utf8",
      env: {
        PATH: process.env.PATH,
        HOME: temp,
        USERPROFILE: temp,
        RUST_SKILLS_BIN: fakeCli,
        RUST_SKILLS_ROOT: path.join(temp, "missing-root"),
        CLAUDE_PLUGIN_ROOT: temp
      }
    });
    assert(result.status === 0, result.stderr || result.stdout);
    return result.stdout;
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

function writeFakeCliDetectInjectRouteNoop() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "rust-skills-cli-"));
  const fakeCli = path.join(temp, "fake-rust-skills.js");
  fs.writeFileSync(fakeCli, `#!/usr/bin/env node
const command = process.argv[2];
const inject = { decision: "inject", should_inject: true, skills: ["rust-router"] };
const noop = { decision: "no-op", should_inject: false, skills: [] };
process.stdout.write(JSON.stringify(command === "detect" ? inject : noop));
`);
  return { temp, fakeCli };
}

const codexHook = path.join(root, ".codex", "hooks", "rust-skill-router-hook.js");
const claudeHook = path.join(root, ".claude", "hooks", "rust-skill-eval-hook.js");

const codexNonRust = runHook(codexHook, "帮我订一张机票");
assert(codexNonRust.trim() === "{}", `Codex non-Rust prompt should no-op, got ${codexNonRust}`);

for (const prompt of [
  "Rocket Mortgage application status",
  "Tower fan bedroom lighting plan",
  "customer lifetime value model",
  "home ownership documents",
  "unsafe ladder installation guide",
  "房屋所有权证明怎么准备"
]) {
  const output = runHook(codexHook, prompt);
  assert(output.trim() === "{}", `Codex non-Rust ambiguous prompt should no-op, got ${output}`);
}

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
assert(codexContext.includes("RUST SKILLS AUTO ROUTE"), "Codex Rust prompt should inject auto route context");
assert(!codexContext.includes("RUST SKILLS CLI ROUTE"), "Codex default context should not expose CLI wording");
assert(!codexContext.includes("\"matches\""), "Codex default context should keep full JSON out of prompt context");
assert(codexContext.includes("m07-concurrency"), "Codex Rust prompt should route m07-concurrency");
assert(codexContext.includes("domain-web"), "Codex Rust prompt should route domain-web");
assert(codexContext.includes("skill files:"), "Codex Rust prompt should expose matched skill files");

const codexDebugRust = JSON.parse(runHook(
  codexHook,
  "Web API reports Rc cannot be sent between threads",
  { RUST_SKILLS_DEBUG: "1" }
));
const codexDebugContext = codexDebugRust.hookSpecificOutput?.additionalContext || "";
assert(codexDebugContext.includes("RUST SKILLS AUTO ROUTE"), "Codex debug context should keep compact auto route");
assert(codexDebugContext.includes("RUST SKILLS ROUTE JSON"), "Codex debug context should expose full route JSON");
assert(codexDebugContext.includes("\"matches\""), "Codex debug context should include route matches JSON");

const codexRustWithoutCli = JSON.parse(runHook(
  codexHook,
  "Rust axum handler Rc cannot be sent between threads",
  { RUST_SKILLS_BIN: path.join(root, "missing-rust-skills") }
));
const codexNoCliContext = codexRustWithoutCli.hookSpecificOutput?.additionalContext || "";
assert(codexNoCliContext.includes("RUST SKILLS AUTO ROUTE"), "Codex direct route should use auto route context");
assert(codexNoCliContext.includes("domain-web"), "Codex hook should route directly when CLI bin is missing");

const fakeCli = writeFakeCliDetectInjectRouteNoop();
try {
  const codexSecondStage = runIsolatedHook(codexHook, "Rust maybe", fakeCli.fakeCli);
  assert(
    codexSecondStage.trim() === "{}",
    `Codex hook should require route.should_inject after detect, got ${codexSecondStage}`
  );
  const claudeSecondStage = runIsolatedHook(claudeHook, "Rust maybe", fakeCli.fakeCli);
  assert(
    claudeSecondStage.length === 0,
    `Claude hook should require route.should_inject after detect, got ${claudeSecondStage}`
  );
} finally {
  fs.rmSync(fakeCli.temp, { recursive: true, force: true });
}

const claudeNonRust = runHook(claudeHook, "今天天气怎么样");
assert(claudeNonRust.length === 0, `Claude non-Rust prompt should no-op, got ${claudeNonRust}`);

const claudeRust = runHook(claudeHook, "Rust E0382 value moved in trading system");
assert(claudeRust.includes("RUST SKILLS AUTO ROUTE"), "Claude Rust prompt should inject auto route context");
assert(!claudeRust.includes("RUST SKILLS CLI ROUTE"), "Claude default context should not expose CLI wording");
assert(!claudeRust.includes("\"matches\""), "Claude default context should keep full JSON out of prompt context");
assert(claudeRust.includes("m01-ownership"), "Claude Rust prompt should route m01-ownership");
assert(claudeRust.includes("domain-fintech"), "Claude Rust prompt should route domain-fintech");
assert(!claudeRust.includes("Always invoke with Skill() tool"), "Claude hook should not require deep top-level Skill entries");

const claudeDebugRust = runHook(
  claudeHook,
  "Rust E0382 value moved in trading system",
  { RUST_SKILLS_DEBUG: "1" }
);
assert(claudeDebugRust.includes("RUST SKILLS AUTO ROUTE"), "Claude debug context should keep compact auto route");
assert(claudeDebugRust.includes("RUST SKILLS ROUTE JSON"), "Claude debug context should expose full route JSON");
assert(claudeDebugRust.includes("\"matches\""), "Claude debug context should include route matches JSON");

console.log("hook routing test: PASS");
