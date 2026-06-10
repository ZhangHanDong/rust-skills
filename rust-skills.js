#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const childProcess = require("child_process");

const root = __dirname;
const binaryName = process.platform === "win32" ? "rust-skills.exe" : "rust-skills";

function fileExists(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function nativeCandidates() {
  return [
    process.env.RUST_SKILLS_NATIVE_BIN,
    path.join(root, "target", "release", binaryName),
    path.join(root, "target", "debug", binaryName),
    path.join(root, "bin", binaryName),
    path.join(path.dirname(process.argv[1] || root), binaryName)
  ].filter(Boolean);
}

function sourceCargoManifest() {
  const manifest = path.join(root, "Cargo.toml");
  return fileExists(manifest) ? manifest : null;
}

function commandPlan(argv) {
  for (const candidate of nativeCandidates()) {
    if (fileExists(candidate)) return { command: candidate, args: argv, cwd: root };
  }

  if (sourceCargoManifest()) {
    return {
      command: "cargo",
      args: ["run", "--quiet", "-p", "rust-skills-cli", "--bin", "rust-skills", "--", ...argv],
      cwd: root
    };
  }

  return null;
}

function main(argv) {
  const plan = commandPlan(argv);
  if (!plan) {
    process.stderr.write("rust-skills native binary not found; run cargo build --workspace\n");
    return 1;
  }

  const env = {
    ...process.env,
    RUST_SKILLS_ROOT: process.env.RUST_SKILLS_ROOT || root
  };
  const result = childProcess.spawnSync(plan.command, plan.args, {
    cwd: plan.cwd,
    env,
    encoding: "utf8",
    // inherit stdin so stdin-reading subcommands (hook, route --json -- -)
    // work through the launcher
    stdio: ["inherit", "pipe", "pipe"],
    maxBuffer: 16 * 1024 * 1024
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) {
    process.stderr.write(`${result.error.message}\n`);
    return 1;
  }
  return result.status ?? 1;
}

process.exitCode = main(process.argv.slice(2));
