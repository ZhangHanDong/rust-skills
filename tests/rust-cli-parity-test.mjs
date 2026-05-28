#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const registry = JSON.parse(fs.readFileSync(path.join(root, "index", "routes.json"), "utf8"));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      RUST_SKILLS_ROOT: root,
      ...options.env
    },
    maxBuffer: 16 * 1024 * 1024,
    ...options
  });
  assert(result.status === 0, result.stderr || result.stdout);
  return result;
}

run("cargo", ["build", "--workspace"]);

const nativeBin = path.join(
  root,
  "target",
  "debug",
  process.platform === "win32" ? "rust-skills.exe" : "rust-skills"
);
const jsLauncher = path.join(root, "rust-skills.js");

function routeWithRust(prompt) {
  const result = run(nativeBin, ["route", "--json", prompt]);
  return JSON.parse(result.stdout);
}

function detectWithRust(prompt) {
  const result = run(nativeBin, ["detect", "--json", prompt]);
  return JSON.parse(result.stdout);
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

function hasRustSignal(text) {
  const signals = registry.rust_signals || {};
  if ((signals.keywords || []).some((keyword) => keywordMatches(text, keyword))) return true;
  if ((signals.regexes || []).some((regex) => regexMatches(text, regex))) return true;
  return false;
}

function uniq(values) {
  return [...new Set(values)];
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

function legacyRoute(prompt) {
  const skillsById = new Map((registry.skills || []).map((skill) => [skill.id, skill]));
  const text = String(prompt || "");
  const rustSignal = hasRustSignal(text);
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

function legacyDetect(prompt) {
  const route = legacyRoute(prompt);
  return {
    decision: route.decision,
    should_inject: route.should_inject,
    prompt_is_rust: route.prompt_is_rust,
    rust_signal: route.rust_signal,
    skills: route.skills,
    runtime_root: route.runtime_root
  };
}

function normalize(value) {
  if (typeof value === "string") {
    return value.replaceAll(os.tmpdir(), "<tmp>");
  }
  if (Array.isArray(value)) return value.map(normalize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, normalize(child)]));
}

function assertDeepEqual(label, actual, expected) {
  const actualJson = JSON.stringify(normalize(actual), null, 2);
  const expectedJson = JSON.stringify(normalize(expected), null, 2);
  assert(actualJson === expectedJson, `${label} mismatch\nactual=${actualJson}\nexpected=${expectedJson}`);
}

const routingCorpus = JSON.parse(fs.readFileSync(path.join(root, "tests", "routing-corpus.json"), "utf8"));
const routingAom = JSON.parse(fs.readFileSync(path.join(root, "tests", "aom", "fixtures", "routing-aom.json"), "utf8"));
const prompts = new Map();

for (const testCase of routingCorpus) prompts.set(`corpus:${testCase.id}`, testCase.prompt);
for (const testCase of routingAom) prompts.set(`aom:${testCase.id}`, testCase.prompt);

let routeCases = 0;
for (const [id, prompt] of prompts) {
  assertDeepEqual(id, routeWithRust(prompt), legacyRoute(prompt));
  routeCases += 1;
}

for (const [id, prompt] of [...prompts].slice(0, 12)) {
  assertDeepEqual(`detect:${id}`, detectWithRust(prompt), legacyDetect(prompt));
}

const verify = JSON.parse(run(nativeBin, ["verify", "--json"]).stdout);
assert(verify.status === "PASS", `verify should pass: ${JSON.stringify(verify, null, 2)}`);
assert(verify.skill_count === registry.skills.length, "verify skill count mismatch");
assert(verify.route_count === registry.routes.length, "verify route count mismatch");

const list = JSON.parse(run(nativeBin, ["index", "list", "--json"]).stdout);
assert(list.skills.length === registry.skills.length, "index list skill count mismatch");

const query = JSON.parse(run(nativeBin, ["index", "query", "rust-router", "--json"]).stdout);
assert(query.found === true, "index query should find rust-router");
assert(query.path === "skills/rust-router/SKILL.md", "index query path mismatch");

function assertHelp(args, expected) {
  const result = run(nativeBin, args);
  assert(result.stdout.includes(expected), `help ${args.join(" ")} missing ${expected}`);
}

assertHelp(["route", "--help"], "Route a Rust prompt");
assertHelp(["index", "--help"], "Inspect the installed Rust Skills registry");
assertHelp(["index", "query", "--help"], "Look up one Rust Skill by ID");
assertHelp(["verify", "--help"], "Verify the installed Rust Skills runtime");

const compatibilityPrompt = "Rust E0382 value moved in axum state";
assertDeepEqual(
  "compatibility launcher route",
  JSON.parse(run(process.execPath, [jsLauncher, "route", "--json", compatibilityPrompt]).stdout),
  routeWithRust(compatibilityPrompt)
);
assertDeepEqual(
  "compatibility launcher detect",
  JSON.parse(run(process.execPath, [jsLauncher, "detect", "--json", compatibilityPrompt]).stdout),
  detectWithRust(compatibilityPrompt)
);

console.log(`rust cli parity test: PASS route_cases=${routeCases} detect_cases=12`);
