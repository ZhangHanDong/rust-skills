"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");

function uniq(values) {
  return [...new Set(values)];
}

function fileExists(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function dirExists(dirPath) {
  try {
    return fs.statSync(dirPath).isDirectory();
  } catch {
    return false;
  }
}

function hasRoutesJson(root) {
  return fileExists(path.join(root, "index", "routes.json"));
}

function homeCandidates() {
  return uniq([process.env.HOME, process.env.USERPROFILE, os.homedir()].filter(Boolean));
}

function runtimeRootCandidates(startDir = __dirname) {
  const candidates = [
    process.env.RUST_SKILLS_ROOT,
    path.resolve(startDir, ".."),
    path.resolve(startDir, "..", "..", "rust-skills")
  ].filter(Boolean);

  for (const home of homeCandidates()) {
    candidates.push(path.join(home, ".codex", "rust-skills"));
    candidates.push(path.join(home, ".claude", "rust-skills"));
    candidates.push(path.join(home, ".local", "share", "rust-skills"));
  }
  candidates.push(process.cwd());

  return uniq(candidates.map((candidate) => path.resolve(candidate)));
}

function findRuntimeRoot(startDir = __dirname) {
  for (const candidate of runtimeRootCandidates(startDir)) {
    if (hasRoutesJson(candidate)) return candidate;
  }
  return path.resolve(startDir, "..");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function loadRegistry(root = findRuntimeRoot()) {
  const routesPath = path.join(root, "index", "routes.json");
  if (!fileExists(routesPath)) {
    throw new Error(`routes registry not found: ${routesPath}`);
  }
  const registry = readJson(routesPath);
  const skills = new Map((registry.skills || []).map((skill) => [skill.id, skill]));
  return { root, registry, skills };
}

function parseSkillFrontmatter(content) {
  if (!content.startsWith("---\n")) return null;
  const end = content.indexOf("\n---", 4);
  if (end === -1) return null;

  const metadata = {};
  const block = content.slice(4, end).trim();
  for (const line of block.split(/\r?\n/)) {
    const match = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (!match) continue;
    const [, key, rawValue] = match;
    metadata[key] = rawValue.replace(/^["']|["']$/g, "");
  }

  return {
    metadata,
    body: content.slice(end + "\n---".length)
  };
}

function verifyRustRouterSkill(root) {
  const errors = [];
  const warnings = [];
  const relativePath = path.join("skills", "rust-router", "SKILL.md");
  const skillPath = path.join(root, relativePath);

  if (!fileExists(skillPath)) {
    return { errors: [`missing rust-router skill file: ${relativePath}`], warnings };
  }

  const content = fs.readFileSync(skillPath, "utf8");
  const parsed = parseSkillFrontmatter(content);
  if (!parsed) {
    return { errors: [`rust-router skill is missing YAML frontmatter: ${relativePath}`], warnings };
  }

  const { metadata, body } = parsed;
  const description = metadata.description || "";
  const firstWindow = content.slice(0, 2500);
  const bodyLines = body.split(/\r?\n/).length;

  if (metadata.name !== "rust-router") {
    errors.push(`rust-router frontmatter name must be rust-router: ${relativePath}`);
  }
  if (description.length > 1024) {
    errors.push(`rust-router description exceeds 1024 characters: ${description.length}`);
  }
  if (!description.includes("Use when:") || !description.includes("Keywords:")) {
    errors.push("rust-router description must include Use when: and Keywords:");
  }
  if (bodyLines > 500) {
    errors.push(`rust-router body exceeds 500 lines: ${bodyLines}`);
  }
  if (/[^\x00-\x7F]/.test(content)) {
    errors.push("rust-router skill must stay plain English/ASCII");
  }

  for (const anchor of [
    "## Routing Calibration",
    "Concept Anchors",
    "public API contract",
    "length, alignment",
    "criterion",
    "exit code",
    "object safe",
    "no_std",
    "embedded",
    "deadlock risk"
  ]) {
    if (!firstWindow.includes(anchor)) {
      errors.push(`rust-router first 2500 chars must expose anchor: ${anchor}`);
    }
  }

  for (const forbidden of ["INSTRUCTIONS FOR CLAUDE", "INSTRUCTIONS FOR CODEX"]) {
    if (body.includes(forbidden)) {
      errors.push(`rust-router body contains platform-specific heading: ${forbidden}`);
    }
  }

  return { errors, warnings };
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isWordLike(value) {
  return /^[A-Za-z0-9_+:-]+$/.test(value);
}

function keywordMatches(text, keyword) {
  const source = String(keyword);
  const lowerText = text.toLowerCase();
  const lowerKeyword = source.toLowerCase();
  const rustCaseSensitiveTokens = new Set([
    "Rc",
    "Arc",
    "Box",
    "RefCell",
    "Cell",
    "Mutex",
    "RwLock",
    "Send",
    "Sync",
    "Drop"
  ]);

  if (rustCaseSensitiveTokens.has(source)) {
    const pattern = new RegExp(`(^|[^A-Za-z0-9_])${escapeRegex(source)}([^A-Za-z0-9_]|$)`);
    return pattern.test(text);
  }

  if (isWordLike(source) && source.length <= 12) {
    const pattern = new RegExp(`(^|[^A-Za-z0-9_])${escapeRegex(source)}([^A-Za-z0-9_]|$)`, "i");
    return pattern.test(text);
  }
  return lowerText.includes(lowerKeyword);
}

function regexMatches(text, regexSource) {
  try {
    return new RegExp(regexSource, "i").test(text);
  } catch {
    return false;
  }
}

function matchRoute(text, route) {
  const keyword = (route.keywords || []).find((item) => keywordMatches(text, item));
  if (keyword) return { kind: "keyword", value: keyword };
  const regex = (route.regexes || []).find((item) => regexMatches(text, item));
  if (regex) return { kind: "regex", value: regex };
  return null;
}

function hasRustSignal(text, registry) {
  const signals = registry.rust_signals || {};
  if ((signals.keywords || []).some((keyword) => keywordMatches(text, keyword))) return true;
  if ((signals.regexes || []).some((regex) => regexMatches(text, regex))) return true;
  return false;
}

function buildLayers(skills, skillsById) {
  const layers = { router: [], layer1: [], layer2: [], layer3: [], utility: [], experimental: [] };
  for (const skillId of skills) {
    const layer = skillsById.get(skillId)?.layer || "utility";
    if (!layers[layer]) layers[layer] = [];
    layers[layer].push(skillId);
  }
  return layers;
}

function routePrompt(prompt, options = {}) {
  const root = options.root || findRuntimeRoot();
  const { registry, skills: skillsById } = loadRegistry(root);
  const text = String(prompt || "");
  const rustSignal = hasRustSignal(text, registry);
  const routeMatches = [];

  for (const route of registry.routes || []) {
    if (route.requires_rust_signal && !rustSignal) continue;
    const matched = matchRoute(text, route);
    if (matched) {
      routeMatches.push({
        route: route.id,
        skill: route.skill,
        layer: route.layer,
        category: route.category,
        priority: route.priority || 0,
        matched
      });
    }
  }

  if (rustSignal && !routeMatches.some((match) => match.skill === "rust-router")) {
    routeMatches.push({
      route: "rust-signal",
      skill: "rust-router",
      layer: "router",
      category: "rust",
      priority: 1000,
      matched: { kind: "signal", value: "rust" }
    });
  }

  const orderedMatches = routeMatches.sort((left, right) => {
    if (left.skill === "rust-router") return -1;
    if (right.skill === "rust-router") return 1;
    return right.priority - left.priority || left.skill.localeCompare(right.skill);
  });
  const skillIds = uniq(orderedMatches.map((match) => match.skill));
  const shouldInject = skillIds.length > 0;
  const paths = Object.fromEntries(
    skillIds.map((skillId) => [skillId, skillsById.get(skillId)?.path || null])
  );

  return {
    decision: shouldInject ? "inject" : "no-op",
    should_inject: shouldInject,
    prompt_is_rust: shouldInject,
    rust_signal: rustSignal,
    skills: skillIds,
    layers: buildLayers(skillIds, skillsById),
    matches: orderedMatches,
    paths,
    context_cost: skillIds.length,
    runtime_root: root
  };
}

function detectPrompt(prompt, options = {}) {
  const route = routePrompt(prompt, options);
  return {
    decision: route.decision,
    should_inject: route.should_inject,
    prompt_is_rust: route.prompt_is_rust,
    rust_signal: route.rust_signal,
    skills: route.skills,
    runtime_root: route.runtime_root
  };
}

function querySkill(skillId, options = {}) {
  const root = options.root || findRuntimeRoot();
  const { skills } = loadRegistry(root);
  const skill = skills.get(skillId);
  if (!skill) {
    return { found: false, id: skillId, runtime_root: root };
  }
  const absolute_path = path.join(root, skill.path);
  return {
    found: true,
    ...skill,
    absolute_path,
    exists: fileExists(absolute_path),
    runtime_root: root
  };
}

function listSkills(options = {}) {
  const root = options.root || findRuntimeRoot();
  const { registry } = loadRegistry(root);
  return {
    runtime_root: root,
    skills: registry.skills || []
  };
}

function verifyRegistry(options = {}) {
  const root = options.root || findRuntimeRoot();
  const { registry, skills } = loadRegistry(root);
  const errors = [];
  const warnings = [];

  for (const skill of registry.skills || []) {
    const skillPath = path.join(root, skill.path);
    if (!fileExists(skillPath)) errors.push(`missing skill file: ${skill.path}`);
  }

  for (const route of registry.routes || []) {
    if (!skills.has(route.skill)) errors.push(`route ${route.id} references unknown skill ${route.skill}`);
  }

  const routerSkillResult = verifyRustRouterSkill(root);
  errors.push(...routerSkillResult.errors);
  warnings.push(...routerSkillResult.warnings);

  const publicFilesToScan = [
    ".codex/hooks/rust-skill-router-hook.js",
    ".claude/hooks/rust-skill-eval-hook.js",
    "hooks/hooks.json"
  ];
  for (const relative of publicFilesToScan) {
    const filePath = path.join(root, relative);
    if (fileExists(filePath)) {
      const content = fs.readFileSync(filePath, "utf8");
      if (content.includes("codex_hooks")) errors.push(`deprecated codex_hooks appears in ${relative}`);
    }
  }

  return {
    status: errors.length === 0 ? "PASS" : "FAIL",
    runtime_root: root,
    skill_count: (registry.skills || []).length,
    route_count: (registry.routes || []).length,
    errors,
    warnings
  };
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyRecursive(source, target, options = {}) {
  if (!fs.existsSync(source)) {
    if (options.required === false) return [];
    throw new Error(`copy source not found: ${source}`);
  }
  const actions = [];
  const dryRun = options.dryRun === true;
  const stat = fs.statSync(source);
  if (stat.isDirectory()) {
    if (!dryRun) ensureDir(target);
    actions.push({ action: "mkdir", target });
    for (const entry of fs.readdirSync(source)) {
      actions.push(...copyRecursive(path.join(source, entry), path.join(target, entry), options));
    }
    return actions;
  }

  if (!dryRun) {
    ensureDir(path.dirname(target));
    fs.copyFileSync(source, target);
    if (options.executable) fs.chmodSync(target, 0o755);
  }
  actions.push({ action: "copy", source, target });
  return actions;
}

function removeDir(target) {
  if (dirExists(target)) fs.rmSync(target, { recursive: true, force: true });
}

module.exports = {
  copyRecursive,
  detectPrompt,
  ensureDir,
  fileExists,
  findRuntimeRoot,
  listSkills,
  loadRegistry,
  querySkill,
  removeDir,
  routePrompt,
  verifyRegistry
};
