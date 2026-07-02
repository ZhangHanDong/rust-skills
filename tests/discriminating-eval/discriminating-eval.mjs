#!/usr/bin/env node
/**
 * Discriminating knowledge-delivery eval — deterministic, no agents.
 *
 * The comprehensive agent bench is saturated (strong base models pass the common
 * cases with or without the plugin, so lift ~0). This eval measures the plugin's
 * actual mechanism of action instead: for a question that needs SPECIFIC Rust
 * guidance, does the plugin route to a skill whose injected window (first
 * windowChars) actually DELIVERS at least one correct-answer keyFact?
 *
 *   - Baseline (no plugin): delivers 0 by construction (no skill injected).
 *   - Plugin: delivers K/N. K/N is the honest "value the plugin adds that the
 *     baseline cannot" — NOT an answer-quality lift (the model may already know).
 *   - A miss is a REVEALED CONTENT GAP: the routed skill did not carry the fact.
 *     Skills must not be edited to make cases pass; fix the generator/content
 *     deliberately, then this number rises honestly.
 *
 * Usage: node tests/discriminating-eval/discriminating-eval.mjs [--json] [--floor N]
 * Exit non-zero if delivery drops below --floor (default: no floor / report only).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..", "..");

function argValue(name, fallback = null) {
  const i = process.argv.indexOf(name);
  if (i === -1) return fallback;
  const v = process.argv[i + 1];
  if (!v || v.startsWith("--")) throw new Error(`${name} requires a value`);
  return v;
}
const jsonOut = process.argv.includes("--json");
const floor = argValue("--floor", null);

function resolveBin() {
  for (const rel of ["target/release/rust-skills", "target/debug/rust-skills", "bin/rust-skills"]) {
    const p = path.join(REPO_ROOT, rel);
    if (fs.existsSync(p)) return p;
  }
  throw new Error("rust-skills binary not found; run `cargo build --release`");
}
const bin = resolveBin();
const dataset = JSON.parse(fs.readFileSync(path.join(HERE, "dataset.json"), "utf8"));
const windowChars = dataset.windowChars || 2500;

function routeSkills(prompt) {
  const res = spawnSync(bin, ["route", "--json", prompt], {
    env: { ...process.env, RUST_SKILLS_ROOT: REPO_ROOT },
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024
  });
  if (res.status !== 0) throw new Error(`route failed: ${(res.stderr || res.stdout || "").slice(0, 200)}`);
  const parsed = JSON.parse(res.stdout);
  return { skills: (parsed.skills || []).filter((s) => s !== "rust-router"), paths: parsed.paths || {} };
}

// The injected window a model would actually read for a routed skill.
function injectedWindow(relPath) {
  try {
    return fs.readFileSync(path.join(REPO_ROOT, relPath), "utf8").slice(0, windowChars).toLowerCase();
  } catch {
    return "";
  }
}

let delivered = 0;
const perCase = [];
for (const c of dataset.cases) {
  const { skills, paths } = routeSkills(c.prompt);
  // Concatenate the injected windows of all routed non-router skills.
  const corpus = skills.map((s) => injectedWindow(paths[s] || `skills/${s}/SKILL.md`)).join("\n");
  const hit = c.keyFacts.find((f) => corpus.includes(f.toLowerCase())) || null;
  const isDelivered = hit !== null;
  if (isDelivered) delivered += 1;
  perCase.push({ id: c.id, routed: skills, delivered: isDelivered, matchedFact: hit, keyFacts: c.keyFacts });
}

const total = dataset.cases.length;
const rate = total ? delivered / total : 0;
const gaps = perCase.filter((r) => !r.delivered);

const summary = {
  total,
  delivered,
  baselineDelivered: 0,
  deliveryRate: Number(rate.toFixed(4)),
  deliveryRateVsBaseline: Number(rate.toFixed(4)),
  contentGaps: gaps.length
};

if (jsonOut) {
  process.stdout.write(JSON.stringify({ summary, perCase }, null, 2) + "\n");
} else {
  process.stdout.write("=== Discriminating Knowledge-Delivery Eval ===\n");
  process.stdout.write(`binary: ${bin}\n\n`);
  process.stdout.write(`cases: ${total}\n`);
  process.stdout.write(`plugin delivered a key fact: ${delivered}/${total} (${(rate * 100).toFixed(1)}%)\n`);
  process.stdout.write(`baseline (no plugin): 0/${total} — injects no skill\n`);
  process.stdout.write(`content gaps (routed skill lacked the fact): ${gaps.length}\n\n`);
  for (const r of perCase) {
    const mark = r.delivered ? "OK " : "GAP";
    process.stdout.write(`[${mark}] ${r.id}  ->  ${r.routed.join(", ") || "(router only)"}${r.delivered ? `  [${r.matchedFact}]` : ""}\n`);
  }
}

if (floor !== null && delivered < Number(floor)) {
  process.stderr.write(`\nFAIL: delivery ${delivered} below floor ${floor}\n`);
  process.exit(1);
}
