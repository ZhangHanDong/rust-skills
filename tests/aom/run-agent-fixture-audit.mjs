#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function argValue(name, fallback = null) {
  const index = process.argv.indexOf(name);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value`);
  return value;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function countBy(items, key) {
  const counts = {};
  for (const item of items) {
    const value = item[key] || "unspecified";
    counts[value] = (counts[value] || 0) + 1;
  }
  return counts;
}

function tagCounts(items) {
  const counts = {};
  for (const item of items) {
    for (const tag of item.tags || []) counts[tag] = (counts[tag] || 0) + 1;
  }
  return counts;
}

function coverageRequirements(profile) {
  if (profile === "cli") {
    return {
      minCases: 12,
      requiredCategories: {
        "answer-quality": 3,
        "artifact-generation": 2,
        "code-generation": 4,
        "review-debugging": 3
      },
      requiredTags: [
        "cli",
        "automation",
        "error-handling",
        "config",
        "json",
        "filesystem",
        "cross-platform",
        "testing",
        "codegen"
      ],
      requireTagOnAllCases: "cli"
    };
  }
  if (profile !== "comprehensive") {
    throw new Error(`unsupported fixture audit profile: ${profile}`);
  }
  return {
    minCases: 18,
    requiredCategories: {
      "answer-quality": 6,
      "artifact-generation": 3,
      "code-generation": 4,
      "review-debugging": 2
    },
    requiredTags: [
      "ownership",
      "concurrency",
      "error-handling",
      "unsafe",
      "performance",
      "async",
      "web",
      "cli",
      "embedded",
      "no-std",
      "codegen"
    ],
    requireTagOnAllCases: null
  };
}

function hasExpectedSignal(testCase) {
  const expected = testCase.expected || {};
  return Boolean(
    expected.minResponseChars ||
    (expected.mustMention || []).length ||
    (expected.concepts || []).length ||
    (expected.mustNotMention || []).length ||
    (expected.files || []).length ||
    (expected.mustMentionInFiles || []).length ||
    (testCase.verifyCommands || []).length
  );
}

function auditCase(testCase, seenIds) {
  const failures = [];
  if (!testCase.id) failures.push({ kind: "missing_id" });
  if (seenIds.has(testCase.id)) failures.push({ kind: "duplicate_id", id: testCase.id });
  seenIds.add(testCase.id);

  if (!testCase.category) failures.push({ kind: "missing_category", id: testCase.id });
  if (!testCase.difficulty) failures.push({ kind: "missing_difficulty", id: testCase.id });
  if (!testCase.prompt || testCase.prompt.length < 40) {
    failures.push({ kind: "weak_prompt", id: testCase.id });
  }
  if (!Array.isArray(testCase.tags) || testCase.tags.length < 2) {
    failures.push({ kind: "missing_tags", id: testCase.id });
  }
  if (!hasExpectedSignal(testCase)) {
    failures.push({ kind: "missing_mechanical_expectation", id: testCase.id });
  }
  if (testCase.expected?.concepts !== undefined) {
    const concepts = testCase.expected.concepts;
    if (!Array.isArray(concepts)) {
      failures.push({ kind: "invalid_concepts", id: testCase.id, reason: "expected.concepts must be an array" });
    } else {
      for (const concept of concepts) {
        const validString = typeof concept === "string" && concept.trim().length > 0;
        const validObject = concept && typeof concept === "object" && String(concept.concept || concept.name || "").trim();
        if (!validString && !validObject) {
          failures.push({ kind: "invalid_concept", id: testCase.id, concept });
        }
      }
    }
  }

  const prompt = String(testCase.prompt || "").toLowerCase();
  const unfairPatterns = [
    /\brust-skills\b/,
    /\bbaseline\b/,
    /\bour product\b/,
    /\bthis repo\b/,
    /\bthis repository\b/,
    /\bbeat the other\b/,
    /\boutperform\b/,
    /\buse the provided skill\b/
  ];
  for (const pattern of unfairPatterns) {
    if (pattern.test(prompt)) failures.push({ kind: "unfair_prompt_signal", id: testCase.id, pattern: String(pattern) });
  }

  if (testCase.fixtureDir && !fs.existsSync(path.resolve(root, testCase.fixtureDir))) {
    failures.push({ kind: "missing_fixture_dir", id: testCase.id, fixtureDir: testCase.fixtureDir });
  }
  if (testCase.fixtureDir) {
    const fixturePath = path.resolve(root, testCase.fixtureDir);
    if (fs.existsSync(path.join(fixturePath, "target"))) {
      failures.push({ kind: "fixture_contains_build_artifacts", id: testCase.id, fixtureDir: testCase.fixtureDir });
    }
    const gitignorePath = path.join(fixturePath, ".gitignore");
    const gitignore = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, "utf8") : "";
    if (testCase.category === "code-generation" && !gitignore.split(/\r?\n/).includes("/target/")) {
      failures.push({ kind: "fixture_target_not_ignored", id: testCase.id, fixtureDir: testCase.fixtureDir });
    }
    const cargoTomlPath = path.join(fixturePath, "Cargo.toml");
    if (testCase.category === "code-generation" && fs.existsSync(cargoTomlPath)) {
      const cargoToml = fs.readFileSync(cargoTomlPath, "utf8");
      if (!/^\[workspace\]\s*$/m.test(cargoToml)) {
        failures.push({
          kind: "fixture_missing_standalone_workspace",
          id: testCase.id,
          fixtureDir: testCase.fixtureDir
        });
      }
    }
  }
  if (testCase.category === "code-generation" && (testCase.verifyCommands || []).length === 0) {
    failures.push({ kind: "codegen_without_verify_command", id: testCase.id });
  }
  return failures;
}

const casesPath = path.resolve(argValue(
  "--cases",
  path.join(root, "tests", "aom", "fixtures", "agent-matrix-comprehensive.json")
));
const profile = argValue("--profile", "comprehensive");
const reportPath = path.resolve(argValue(
  "--report",
  path.join(root, "tests", "results", "agent-fixture-audit-report.json")
));
const cases = readJson(casesPath);
const requirements = coverageRequirements(profile);
const seenIds = new Set();
const failures = cases.flatMap((testCase) => auditCase(testCase, seenIds));
const categories = countBy(cases, "category");
const difficulties = countBy(cases, "difficulty");
const tags = tagCounts(cases);

for (const [category, minimum] of Object.entries(requirements.requiredCategories)) {
  if ((categories[category] || 0) < minimum) {
    failures.push({ kind: "category_undercovered", category, minimum, actual: categories[category] || 0 });
  }
}

for (const tag of requirements.requiredTags) {
  if (!tags[tag]) failures.push({ kind: "tag_missing", tag });
}

if (requirements.requireTagOnAllCases) {
  for (const testCase of cases) {
    if (!(testCase.tags || []).includes(requirements.requireTagOnAllCases)) {
      failures.push({
        kind: "case_missing_required_profile_tag",
        id: testCase.id,
        tag: requirements.requireTagOnAllCases
      });
    }
  }
}

if (cases.length < requirements.minCases) {
  failures.push({ kind: "too_few_cases", minimum: requirements.minCases, actual: cases.length });
}

const report = {
  status: failures.length === 0 ? "PASS" : "FAIL",
  generatedAt: new Date().toISOString(),
  casesPath,
  profile,
  summary: {
    total: cases.length,
    categories,
    difficulties,
    tags
  },
  fairness: {
    promptPolicy: "No prompt may mention rust-skills, baseline, this repository, or ask one profile to outperform another.",
    productNeutral: true,
    profile
  },
  failures
};

writeJson(reportPath, report);
console.log(JSON.stringify({
  status: report.status,
  report: reportPath,
  summary: report.summary
}, null, 2));

if (failures.length > 0) {
  console.error(JSON.stringify({ status: "FAIL", failures }, null, 2));
  process.exit(1);
}
