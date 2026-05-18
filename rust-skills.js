#!/usr/bin/env node
"use strict";

const {
  detectPrompt,
  listSkills,
  querySkill,
  routePrompt,
  verifyRegistry
} = require("./lib/routing");

function printHelp() {
  process.stdout.write(`Rust Skills local runtime

Usage:
  rust-skills detect [--json] <prompt>
  rust-skills route [--json] <prompt>
  rust-skills index list [--json]
  rust-skills index query <skill-id> [--json]
  rust-skills verify [--json]

Environment:
  RUST_SKILLS_ROOT  Override runtime data root.
`);
}

function hasFlag(args, flag) {
  return args.includes(flag);
}

function stripFlags(args) {
  return args.filter((arg) => !arg.startsWith("--"));
}

function promptFrom(args) {
  return stripFlags(args).join(" ").trim();
}

function writeJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function writeText(value) {
  process.stdout.write(`${value}\n`);
}

function main(argv) {
  const [command, ...args] = argv;
  const json = hasFlag(args, "--json");

  if (!command || command === "help" || command === "--help" || command === "-h") {
    printHelp();
    return 0;
  }

  if (command === "detect") {
    const result = detectPrompt(promptFrom(args));
    json ? writeJson(result) : writeText(result.decision);
    return 0;
  }

  if (command === "route") {
    const result = routePrompt(promptFrom(args));
    json ? writeJson(result) : writeText(result.skills.join("\n"));
    return 0;
  }

  if (command === "index") {
    const [subcommand, ...rest] = args;
    if (subcommand === "list") {
      const result = listSkills();
      json ? writeJson(result) : writeText(result.skills.map((skill) => skill.id).join("\n"));
      return 0;
    }
    if (subcommand === "query") {
      const [skillId] = stripFlags(rest);
      if (!skillId) {
        process.stderr.write("Missing skill id\n");
        return 2;
      }
      const result = querySkill(skillId);
      json ? writeJson(result) : writeText(result.found ? result.path : "not found");
      return result.found ? 0 : 1;
    }
  }

  if (command === "verify") {
    const result = verifyRegistry();
    json ? writeJson(result) : writeText(result.status);
    return result.status === "PASS" ? 0 : 1;
  }

  process.stderr.write(`Unknown command: ${command}\n\n`);
  printHelp();
  return 2;
}

process.exitCode = main(process.argv.slice(2));
