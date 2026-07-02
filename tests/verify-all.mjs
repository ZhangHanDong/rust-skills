#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Release binary: the suite spawns the CLI hundreds of times, and the debug
// build is ~8x slower per spawn.
const nativeBin = path.join(
  root,
  "target",
  "release",
  process.platform === "win32" ? "rust-skills.exe" : "rust-skills"
);

function run(label, command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, RUST_SKILLS_PREBUILT: "1" }
  });
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  if (result.status !== 0) {
    throw new Error(`${label} failed with exit ${result.status}`);
  }
}

run("cargo build", "cargo", ["build", "--release", "--workspace"]);
run("cargo test", "cargo", ["test", "--release", "--workspace", "--quiet"]);
run("registry verify", nativeBin, ["verify", "--json"]);
run("rust cli parity", process.execPath, [path.join(root, "tests", "rust-cli-parity-test.mjs")]);
run("routing aom", process.execPath, [path.join(root, "tests", "aom", "run-routing-aom.mjs")]);
run("aom evaluator", process.execPath, [path.join(root, "tests", "aom", "run-evaluator-self-test.mjs")]);
run("agent fixture audit", process.execPath, [path.join(root, "tests", "aom", "run-agent-fixture-audit.mjs")]);
run("CLI fixture audit", process.execPath, [
  path.join(root, "tests", "aom", "run-agent-fixture-audit.mjs"),
  "--cases",
  path.join(root, "tests", "aom", "fixtures", "agent-matrix-cli.json"),
  "--profile",
  "cli",
  "--report",
  path.join(root, "tests", "results", "agent-fixture-audit-cli-report.json")
]);
run("agent matrix dry-run", process.execPath, [
  path.join(root, "tests", "aom", "run-agent-matrix.mjs"),
  "--cases",
  path.join(root, "tests", "aom", "fixtures", "agent-matrix-smoke.json"),
  "--benchmark-mode",
  "--run-root",
  path.join(root, "tests", "results", "agent-matrix-smoke-dryrun"),
  "--report",
  path.join(root, "tests", "results", "agent-matrix-smoke-dryrun", "report.json")
]);
run("routing ab", process.execPath, [path.join(root, "tests", "routing-ab-test.mjs")]);
run("routing heldout", process.execPath, [path.join(root, "tests", "routing-heldout-test.mjs")]);
run("routing eval", process.execPath, [path.join(root, "tests", "routing-eval", "routing-eval.mjs")]);
run("skill generation gate", process.execPath, [
  path.join(root, "tests", "aom", "run-skill-generation-gate.mjs"),
  "--skills", "skills",
  "--baseline", path.join(root, "tests", "aom", "skill-gate-baseline.json"),
  "--json"
]);
run("hook routing", process.execPath, [path.join(root, "tests", "hook-routing-test.mjs")]);
run("install e2e", process.execPath, [path.join(root, "tests", "install-e2e.mjs")]);
run("package safety", process.execPath, [path.join(root, "tests", "package-safety-test.mjs")]);

console.log("verify all: PASS");
