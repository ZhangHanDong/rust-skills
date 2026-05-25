#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function run(label, command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8"
  });
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  if (result.status !== 0) {
    throw new Error(`${label} failed with exit ${result.status}`);
  }
}

run("registry verify", process.execPath, [path.join(root, "rust-skills.js"), "verify", "--json"]);
run("rust cli parity", process.execPath, [path.join(root, "tests", "rust-cli-parity-test.mjs")]);
run("hook matcher", process.execPath, [path.join(root, "tests", "hook-matcher-test.mjs")]);
run("routing eval", process.execPath, [path.join(root, "tests", "routing-eval-test.mjs")]);
run("routing aom", process.execPath, [path.join(root, "tests", "aom", "run-routing-aom.mjs")]);
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
run("routing ab", process.execPath, [path.join(root, "tests", "routing-ab-test.mjs")]);
run("hook routing", process.execPath, [path.join(root, "tests", "hook-routing-test.mjs")]);
run("install e2e", process.execPath, [path.join(root, "tests", "install-e2e.mjs")]);
run("package safety", process.execPath, [path.join(root, "tests", "package-safety-test.mjs")]);

console.log("verify all: PASS");
