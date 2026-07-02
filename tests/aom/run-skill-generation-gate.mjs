#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const BANNED_PHRASES = [
  "CRITICAL:",
  "You are an expert",
  "Claude MUST",
  "INSTRUCTIONS FOR CLAUDE"
];

const ANCHOR_FAMILIES = {
  ownership: ["E0382", "moved value", "consuming builder", "clone"],
  borrow: ["E0499", "E0502", "borrow", "mutable borrow"],
  lifetime: ["E0597", "E0716", "lifetime", "temporary"],
  traitBounds: ["E0277", "Send", "Sync", "trait bound"],
  inference: ["E0282", "type inference", "turbofish", "type annotation"],
  errors: ["E0308", "Result", "thiserror", "error boundary"],
  apiEvolution: ["MSRV", "semver", "deprecation", "stabilized"],
  unsafeFfi: ["SAFETY", "pointer", "length", "alignment", "lifetime", "aliasing"],
  quality: ["cargo fmt", "clippy", "cargo test", "doc test"]
};

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

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function listSkillFiles(targetPath) {
  const absolute = path.resolve(root, targetPath);
  if (!fs.existsSync(absolute)) throw new Error(`skills path does not exist: ${targetPath}`);
  const stat = fs.statSync(absolute);
  if (stat.isFile()) return [absolute];
  if (fs.existsSync(path.join(absolute, "SKILL.md"))) return [path.join(absolute, "SKILL.md")];

  const files = [];
  const entries = fs.readdirSync(absolute, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name));
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillPath = path.join(absolute, entry.name, "SKILL.md");
    if (fs.existsSync(skillPath)) files.push(skillPath);
  }
  return files;
}

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { metadata: {}, body: content, hasFrontmatter: false };

  const metadata = {};
  const lines = match[1].split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const field = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!field) continue;
    const key = field[1];
    let value = field[2].trim();
    if (value === "|" || value === ">") {
      const block = [];
      for (index += 1; index < lines.length; index += 1) {
        const blockLine = lines[index];
        if (/^[A-Za-z0-9_-]+:\s*/.test(blockLine)) {
          index -= 1;
          break;
        }
        block.push(blockLine.replace(/^ {2}/, ""));
      }
      metadata[key] = block.join("\n").trim();
    } else {
      metadata[key] = value.replace(/^["']|["']$/g, "");
    }
  }

  return {
    metadata,
    body: content.slice(match[0].length),
    hasFrontmatter: true
  };
}

function isAscii(text) {
  return /^[\x00-\x7F]*$/.test(text);
}

function findLocalReferences(body) {
  const searchable = body.replace(/```[\s\S]*?```/g, "");
  const refs = new Set();
  const patterns = [
    /\]\((\.\/)?((?:references|patterns|examples|assets|scripts|rules|checklists)\/[^)#\s]+)\)/g,
    /`(\.\/)?((?:references|patterns|examples|assets|scripts|rules|checklists)\/[^`]+)`/g
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(searchable)) !== null) {
      const ref = match[2].replace(/[:.,;]+$/, "");
      if (ref.includes("*") || ref.includes("{") || ref.includes("}")) continue;
      refs.add(ref);
    }
  }
  return [...refs];
}

function anchorHits(text) {
  const hits = [];
  for (const [family, terms] of Object.entries(ANCHOR_FAMILIES)) {
    if (terms.some((term) => text.includes(term))) hits.push(family);
  }
  return hits;
}

function pushIssue(collection, kind, message, extra = {}) {
  collection.push({ kind, message, ...extra });
}

function auditSkill(skillPath, options) {
  const content = fs.readFileSync(skillPath, "utf8");
  const relativePath = path.relative(root, skillPath);
  // Stable, location-independent key (relative to the skills dir being audited)
  // so a baseline captured from skills/ still matches a copy elsewhere.
  const keyPath = path.relative(path.resolve(root, options.skillsPath), skillPath);
  const skillDir = path.dirname(skillPath);
  const { metadata, body, hasFrontmatter } = parseFrontmatter(content);
  const hard = [];
  const soft = [];
  const description = metadata.description || "";
  const bodyLines = body.trim() ? body.split(/\r?\n/).length : 0;
  const firstWindow = content.slice(0, options.windowChars);
  const anchors = anchorHits(firstWindow);

  if (!hasFrontmatter) pushIssue(hard, "missing_frontmatter", "SKILL.md is missing YAML frontmatter");
  if (!metadata.name) pushIssue(hard, "missing_name", "frontmatter is missing name");
  if (!description) pushIssue(hard, "missing_description", "frontmatter is missing description");
  if (description.length > options.maxDescriptionChars) {
    pushIssue(hard, "description_too_long", "description exceeds hard limit", {
      actual: description.length,
      limit: options.maxDescriptionChars
    });
  }
  if (bodyLines > options.maxBodyLines) {
    pushIssue(hard, "body_too_long", "SKILL.md body exceeds hard line limit", {
      actual: bodyLines,
      limit: options.maxBodyLines
    });
  }

  for (const ref of findLocalReferences(body)) {
    if (!fs.existsSync(path.join(skillDir, ref))) {
      pushIssue(hard, "missing_reference", "SKILL.md references a missing local file", { ref });
    }
  }

  if (description.length > options.warnDescriptionChars) {
    pushIssue(soft, "description_verbose", "description is above warning threshold", {
      actual: description.length,
      threshold: options.warnDescriptionChars
    });
  }
  if (bodyLines > options.warnBodyLines) {
    pushIssue(soft, "body_verbose", "body is above warning threshold", {
      actual: bodyLines,
      threshold: options.warnBodyLines
    });
  }
  if (!description.includes("Use when")) {
    pushIssue(soft, "description_shape", "description should include Use when");
  }
  if (!description.includes("Keywords")) {
    pushIssue(soft, "description_keywords", "description should include Keywords");
  }
  // ASCII is a GENERATED-skill rule (per this check's own message). Static
  // curated skills are intentionally bilingual — CJK routing keywords in the
  // description are a feature, not drift — so only enforce this for generated
  // skills (--strict-generated), where it is promoted to a hard failure below.
  if (!isAscii(content) && options.strictGenerated) {
    pushIssue(soft, "non_ascii", "generated skill contains non-ASCII content; generated crate skills must be English/ASCII");
  }
  for (const phrase of BANNED_PHRASES) {
    if (content.includes(phrase)) {
      pushIssue(soft, "banned_phrase", "legacy or prompt-like phrase found", { phrase });
    }
  }
  if (anchors.length === 0) {
    pushIssue(soft, "no_early_anchor", "no Rust calibration anchor found in the early activation window", {
      windowChars: options.windowChars
    });
  }
  if (/README\.md|CHANGELOG\.md|INSTALLATION_GUIDE\.md/.test(body)) {
    pushIssue(soft, "auxiliary_docs", "skill body references auxiliary docs that generated skills should avoid");
  }

  if (options.strictGenerated) {
    hard.push(...soft.map((issue) => ({ ...issue, promotedFromSoft: true })));
    soft.length = 0;
  }

  return {
    path: relativePath,
    keyPath,
    name: metadata.name || null,
    descriptionLength: description.length,
    bodyLines,
    anchors,
    hard,
    soft,
    passed: hard.length === 0
  };
}

const options = {
  skillsPath: argValue("--skills", "skills"),
  reportPath: path.resolve(argValue(
    "--report",
    path.join(root, "tests", "results", "skill-generation-gate-report.json")
  )),
  maxDescriptionChars: Number(argValue("--max-description-chars", "1024")),
  warnDescriptionChars: Number(argValue("--warn-description-chars", "400")),
  maxBodyLines: Number(argValue("--max-body-lines", "500")),
  warnBodyLines: Number(argValue("--warn-body-lines", "120")),
  windowChars: Number(argValue("--window-chars", "2500")),
  strictGenerated: hasFlag("--strict-generated"),
  // Regression ratchet: grandfather existing soft warnings; any NEW warning
  // beyond the baseline counts becomes a hard failure. Counts only shrink.
  baselinePath: argValue("--baseline", null),
  writeBaseline: argValue("--write-baseline", null)
};

// Key a warning by (skills-relative path, kind) — location-independent so the
// baseline matches whether the same skills tree is audited in place or copied.
function warningKey(warning) {
  return `${warning.keyPath}::${warning.kind}`;
}

function countWarnings(warningList) {
  const counts = {};
  for (const warning of warningList) {
    const key = warningKey(warning);
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

const files = listSkillFiles(options.skillsPath);
const skills = files.map((file) => auditSkill(file, options));
const hardFailures = skills.flatMap((skill) => skill.hard.map((issue) => ({
  path: skill.path,
  keyPath: skill.keyPath,
  ...issue
})));
const warnings = skills.flatMap((skill) => skill.soft.map((issue) => ({
  path: skill.path,
  keyPath: skill.keyPath,
  ...issue
})));

// --write-baseline: snapshot current warnings as the grandfathered baseline.
if (options.writeBaseline) {
  const baseline = {
    note: "Grandfathered soft warnings for the skill-generation gate. A NEW warning beyond these per-(path,kind) counts fails the gate (regression ratchet). Reduce these over time; never hand-raise them.",
    generatedFrom: options.skillsPath,
    counts: countWarnings(warnings)
  };
  writeJson(path.resolve(root, options.writeBaseline), baseline);
  console.log(JSON.stringify({ status: "BASELINE_WRITTEN", path: options.writeBaseline, total: warnings.length }, null, 2));
  process.exit(0);
}

// --baseline: promote warnings exceeding the baseline counts to hard regressions.
let regressions = [];
if (options.baselinePath) {
  const baseline = JSON.parse(fs.readFileSync(path.resolve(root, options.baselinePath), "utf8"));
  const allowed = baseline.counts || {};
  const currentCounts = countWarnings(warnings);
  const seen = {};
  for (const warning of warnings) {
    const key = warningKey(warning);
    seen[key] = (seen[key] || 0) + 1;
    if (seen[key] > (allowed[key] || 0)) {
      regressions.push({ ...warning, baselineAllowed: allowed[key] || 0, current: currentCounts[key] });
    }
  }
  hardFailures.push(...regressions.map((r) => ({ ...r, kind: `regression:${r.kind}` })));
}

const report = {
  status: hardFailures.length === 0 ? "PASS" : "FAIL",
  generatedAt: new Date().toISOString(),
  options,
  summary: {
    totalSkills: skills.length,
    passed: skills.filter((skill) => skill.passed).length,
    failed: skills.filter((skill) => !skill.passed).length,
    hardFailures: hardFailures.length,
    warnings: warnings.length,
    strictGenerated: options.strictGenerated
  },
  policy: {
    hardGate: "Structural validity, frontmatter, hard size limits, and referenced local files.",
    softGate: "Legacy style, verbosity, non-ASCII, prompt-like phrasing, and missing early anchors.",
    strictGenerated: "Use --strict-generated for newly generated sample skills; soft issues become hard failures."
  },
  hardFailures,
  warnings,
  skills
};

writeJson(options.reportPath, report);
const output = {
  status: report.status,
  report: options.reportPath,
  summary: report.summary
};
console.log(JSON.stringify(hasFlag("--json") ? output : report, null, 2));

if (hardFailures.length > 0) {
  console.error(JSON.stringify({ status: "FAIL", hardFailures: hardFailures.slice(0, 20) }, null, 2));
  process.exit(1);
}
