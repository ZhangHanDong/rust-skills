#!/usr/bin/env node
import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const COPY_PATHS = [
  "commands",
  "skills",
  "index",
  "lib",
  "crates",
  "agents",
  "references",
  "Cargo.toml",
  "Cargo.lock",
  "rust-skills.js",
  "package.json",
  "VERSION",
  "metadata.json"
];

function argValue(name, fallback = null) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value`);
  return value;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function removeDir(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
}

function copyRecursive(source, target) {
  if (!fs.existsSync(source)) return false;
  const stat = fs.statSync(source);
  if (stat.isDirectory()) {
    ensureDir(target);
    for (const entry of fs.readdirSync(source)) {
      copyRecursive(path.join(source, entry), path.join(target, entry));
    }
    return true;
  }
  ensureDir(path.dirname(target));
  fs.copyFileSync(source, target);
  return true;
}

function fileSha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function listFiles(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  const files = [];
  const stack = [dirPath];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }
  }
  return files.sort();
}

function runGit(sourceRoot, args) {
  const result = spawnSync("git", args, {
    cwd: sourceRoot,
    encoding: "utf8"
  });
  return result.status === 0 ? result.stdout.trim() : null;
}

function insertAnchors(content, anchors) {
  const lines = content.split("\n");
  const headingIndex = lines.findIndex((line) => line.startsWith("# "));
  const insertIndex = headingIndex >= 0 ? headingIndex + 1 : lines.length;
  const section = [
    "",
    "## Generated Contract Anchors",
    "",
    ...anchors.map((anchor) => `- ${anchor}`)
  ];
  lines.splice(insertIndex, 0, ...section);
  return lines.join("\n");
}

function applyGenerationContract(sourceRoot, outRoot) {
  const contractPath = path.join(sourceRoot, "commands", "skill-generation-contract.json");
  const contract = readJsonIfExists(contractPath);
  if (!contract) {
    return {
      status: "SKIP",
      reason: "no generation contract found",
      path: contractPath,
      overlays: []
    };
  }

  const overlays = [];
  for (const [skillId, overlay] of Object.entries(contract.skillOverlays || {})) {
    const anchors = Array.isArray(overlay.anchors)
      ? overlay.anchors.filter((anchor) => typeof anchor === "string" && anchor.trim())
      : [];
    const skillPath = path.join(outRoot, "skills", skillId, "SKILL.md");
    if (anchors.length === 0) {
      overlays.push({ skillId, status: "SKIP", reason: "no anchors" });
      continue;
    }
    if (!fs.existsSync(skillPath)) {
      overlays.push({ skillId, status: "SKIP", reason: "missing skill", path: skillPath });
      continue;
    }
    const before = fs.readFileSync(skillPath, "utf8");
    const after = insertAnchors(before, anchors);
    fs.writeFileSync(skillPath, after);
    overlays.push({
      skillId,
      status: "APPLIED",
      path: skillPath,
      anchors: anchors.length,
      beforeSha256: crypto.createHash("sha256").update(before).digest("hex"),
      afterSha256: crypto.createHash("sha256").update(after).digest("hex")
    });
  }

  return {
    status: "PASS",
    path: contractPath,
    schemaVersion: contract.schemaVersion,
    overlays
  };
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

const outRootArg = argValue("--out-root");
if (!outRootArg) throw new Error("--out-root is required");

const sourceRoot = path.resolve(argValue("--source-root", root));
const outRoot = path.resolve(outRootArg);
const force = hasFlag("--force");
const label = argValue("--label", path.basename(outRoot));
const manifestPath = path.join(outRoot, "generation-manifest.json");

if (!fs.existsSync(path.join(sourceRoot, "skills"))) {
  throw new Error(`source root must contain skills/: ${sourceRoot}`);
}
if (fs.existsSync(outRoot) && !force) {
  throw new Error(`output root already exists; pass --force to replace it: ${outRoot}`);
}

removeDir(outRoot);
ensureDir(outRoot);

const copied = [];
const skipped = [];
for (const relative of COPY_PATHS) {
  const source = path.join(sourceRoot, relative);
  const target = path.join(outRoot, relative);
  if (copyRecursive(source, target)) {
    copied.push(relative);
  } else {
    skipped.push(relative);
  }
}

const generationContract = applyGenerationContract(sourceRoot, outRoot);

const files = listFiles(outRoot)
  .filter((filePath) => path.relative(outRoot, filePath) !== "generation-manifest.json")
  .map((filePath) => ({
    path: path.relative(outRoot, filePath),
    bytes: fs.statSync(filePath).size,
    sha256: fileSha256(filePath)
  }));

const manifest = {
  schemaVersion: 1,
  label,
  generatedAt: new Date().toISOString(),
  policy: {
    mode: "clean-materialized-regenerated-root",
    source: "source checkout after generation rules are applied there",
    generationContract: "commands/skill-generation-contract.json when present",
    note: "This script clears the output root and materializes a benchmark runtime root. Contract overlays are generated from source-controlled rules, not hand edits."
  },
  source: {
    root: sourceRoot,
    gitCommit: runGit(sourceRoot, ["rev-parse", "HEAD"]),
    gitBranch: runGit(sourceRoot, ["branch", "--show-current"]),
    gitStatusShort: runGit(sourceRoot, ["status", "--short"])
  },
  output: {
    root: outRoot,
    copied,
    skipped,
    generationContract,
    fileCount: files.length,
    files
  }
};

writeJson(manifestPath, manifest);
console.log(JSON.stringify({
  status: "PASS",
  manifest: manifestPath,
  sourceRoot,
  outRoot,
  copied,
  skipped,
  fileCount: files.length
}, null, 2));
