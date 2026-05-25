const DEFAULT_CONCEPT_ALIASES = {
  "typed errors": [
    "typed public errors",
    "public error enum",
    "structured error",
    "thiserror enum"
  ],
  scope: [
    "critical section",
    "drop guard",
    "drop the guard",
    "release the lock",
    "lock only around"
  ],
  deadlock: [
    "deadlocks",
    "deadlock risk",
    "executor starvation",
    "stalls under load"
  ],
  "release notes": [
    "changelog",
    "document the MSRV",
    "document it clearly",
    "migration note"
  ],
  "type annotation": [
    "collect::<Vec<_>>()",
    "turbofish",
    "annotate the type"
  ],
  lifetime: [
    "temporary value",
    "bind to a variable",
    "owned String"
  ]
};

function normalizeForMatch(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function includesNormalized(text, phrase) {
  const normalizedText = normalizeForMatch(text);
  const normalizedPhrase = normalizeForMatch(phrase);
  return normalizedPhrase.length > 0 && normalizedText.includes(normalizedPhrase);
}

function conceptEntries(expected = {}) {
  const entries = [];
  for (const phrase of expected.mustMention || []) {
    entries.push({ concept: String(phrase), aliases: [] });
  }
  for (const item of expected.concepts || []) {
    if (typeof item === "string") {
      entries.push({ concept: item, aliases: [] });
    } else if (item && typeof item === "object") {
      entries.push({
        concept: String(item.concept || item.name || ""),
        aliases: Array.isArray(item.aliases) ? item.aliases.map(String) : []
      });
    }
  }

  const byName = new Map();
  for (const entry of entries) {
    const concept = String(entry.concept || "").trim();
    if (!concept) continue;
    const key = normalizeForMatch(concept);
    const aliases = byName.get(key)?.aliases || [];
    byName.set(key, {
      concept,
      aliases: [...new Set([...aliases, ...entry.aliases.map(String)])]
    });
  }
  return [...byName.values()];
}

function aliasesForConcept(entry, registry = DEFAULT_CONCEPT_ALIASES) {
  const key = normalizeForMatch(entry.concept);
  const registryAliases = registry[key] || [];
  return [...new Set([entry.concept, ...registryAliases, ...entry.aliases])];
}

export function evaluateText(text, expected = {}) {
  const failures = [];
  if (text.length < (expected.minResponseChars || 0)) {
    failures.push({
      kind: "response_too_short",
      expected: expected.minResponseChars || 0,
      actual: text.length
    });
  }
  for (const phrase of expected.mustMention || []) {
    if (!text.toLowerCase().includes(String(phrase).toLowerCase())) {
      failures.push({ kind: "missing_phrase", phrase });
    }
  }
  for (const phrase of expected.mustNotMention || []) {
    if (text.toLowerCase().includes(String(phrase).toLowerCase())) {
      failures.push({ kind: "forbidden_phrase", phrase });
    }
  }
  return failures;
}

export function evaluateSemanticText(text, expected = {}, options = {}) {
  const registry = options.aliases || DEFAULT_CONCEPT_ALIASES;
  const concepts = conceptEntries(expected);
  if (concepts.length === 0) {
    return {
      semanticGate: "N/A",
      semanticFailures: [],
      conceptResults: [],
      conceptTotal: 0,
      conceptCovered: 0,
      conceptCoverageRate: null
    };
  }

  const conceptResults = concepts.map((entry) => {
    const aliases = aliasesForConcept(entry, registry);
    const matched = aliases.find((alias) => includesNormalized(text, alias)) || null;
    return {
      concept: entry.concept,
      matched: Boolean(matched),
      matchedBy: matched,
      aliases
    };
  });
  const semanticFailures = conceptResults
    .filter((result) => !result.matched)
    .map((result) => ({ kind: "missing_concept", concept: result.concept }));
  const conceptCovered = conceptResults.length - semanticFailures.length;

  return {
    semanticGate: semanticFailures.length === 0 ? "PASS" : "FAIL",
    semanticFailures,
    conceptResults,
    conceptTotal: conceptResults.length,
    conceptCovered,
    conceptCoverageRate: Number((conceptCovered / Math.max(1, conceptResults.length)).toFixed(4))
  };
}

export function summarizeBase(results) {
  const runnable = results.filter((result) => result.status !== "SKIP");
  const semanticApplicable = runnable.filter((result) => result.semanticGate !== "N/A");
  const generatedResponses = runnable.filter((result) => result.metrics.responseGenerated).length;
  const generatedArtifacts = runnable.filter((result) => result.metrics.artifactGenerated).length;
  const generatedPatches = runnable.filter((result) => result.metrics.patchGenerated).length;
  const gatePasses = runnable.filter((result) => result.hardGate === "PASS").length;
  const semanticPasses = semanticApplicable.filter((result) => result.semanticGate === "PASS").length;
  const conceptTotals = semanticApplicable.reduce(
    (accumulator, result) => {
      accumulator.covered += result.metrics.conceptCovered || 0;
      accumulator.total += result.metrics.conceptTotal || 0;
      return accumulator;
    },
    { covered: 0, total: 0 }
  );
  return {
    total: results.length,
    runnable: runnable.length,
    skipped: results.length - runnable.length,
    passed: gatePasses,
    failed: runnable.length - gatePasses,
    responseGenerationRate: Number((generatedResponses / Math.max(1, runnable.length)).toFixed(4)),
    artifactGenerationRate: Number((generatedArtifacts / Math.max(1, runnable.length)).toFixed(4)),
    patchGenerationRate: Number((generatedPatches / Math.max(1, runnable.length)).toFixed(4)),
    qualityGatePassRate: Number((gatePasses / Math.max(1, runnable.length)).toFixed(4)),
    semanticApplicable: semanticApplicable.length,
    semanticPassed: semanticPasses,
    semanticFailed: semanticApplicable.length - semanticPasses,
    semanticGatePassRate: Number((semanticPasses / Math.max(1, semanticApplicable.length)).toFixed(4)),
    conceptCoverageRate: conceptTotals.total === 0
      ? null
      : Number((conceptTotals.covered / conceptTotals.total).toFixed(4)),
    timeoutRate: Number((runnable.filter((result) => result.status === "TIMEOUT").length / Math.max(1, runnable.length)).toFixed(4))
  };
}

export function summarizeGroup(results, key) {
  const names = [...new Set(results.map((result) => result[key] || "unspecified"))].sort();
  return Object.fromEntries(names.map((name) => [
    name,
    summarizeBase(results.filter((result) => (result[key] || "unspecified") === name))
  ]));
}

function comparisonFor(target, base) {
  return {
    responseGenerationRateDelta: Number((target.responseGenerationRate - base.responseGenerationRate).toFixed(4)),
    artifactGenerationRateDelta: Number((target.artifactGenerationRate - base.artifactGenerationRate).toFixed(4)),
    patchGenerationRateDelta: Number((target.patchGenerationRate - base.patchGenerationRate).toFixed(4)),
    qualityGatePassRateDelta: Number((target.qualityGatePassRate - base.qualityGatePassRate).toFixed(4)),
    semanticGatePassRateDelta: Number((target.semanticGatePassRate - base.semanticGatePassRate).toFixed(4)),
    conceptCoverageRateDelta: target.conceptCoverageRate === null || base.conceptCoverageRate === null
      ? null
      : Number((target.conceptCoverageRate - base.conceptCoverageRate).toFixed(4)),
    timeoutRateDelta: Number((target.timeoutRate - base.timeoutRate).toFixed(4))
  };
}

export function detectSkillHarm(profileSummaries, options = {}) {
  const threshold = Math.abs(Number(options.threshold || 0));
  const baseline = profileSummaries.baseline;
  if (!baseline || baseline.runnable === 0) {
    return {
      status: "NOT_APPLICABLE",
      threshold,
      baseline: baseline ? "baseline" : null,
      findings: [],
      harmfulProfiles: []
    };
  }

  const findings = [];
  for (const [profile, summary] of Object.entries(profileSummaries)) {
    if (profile === "baseline" || summary.runnable === 0) continue;
    const deltas = comparisonFor(summary, baseline);
    const reasons = [];
    if (deltas.qualityGatePassRateDelta < -threshold) {
      reasons.push("hard_quality_below_baseline");
    }
    if (deltas.semanticGatePassRateDelta < -threshold) {
      reasons.push("semantic_quality_below_baseline");
    }
    findings.push({
      profile,
      baseline: "baseline",
      threshold,
      harmful: reasons.length > 0,
      reasons,
      deltas
    });
  }

  const harmfulProfiles = findings
    .filter((finding) => finding.harmful)
    .map((finding) => finding.profile);
  return {
    status: harmfulProfiles.length === 0 ? "PASS" : "WARN",
    threshold,
    baseline: "baseline",
    findings,
    harmfulProfiles
  };
}

export function summarize(results, options = {}) {
  const summary = summarizeBase(results);
  const profileNames = [...new Set(results.map((result) => result.profile || "baseline"))];
  summary.profiles = Object.fromEntries(profileNames.map((profile) => [
    profile,
    summarizeBase(results.filter((result) => (result.profile || "baseline") === profile))
  ]));
  summary.categories = summarizeGroup(results, "category");
  summary.difficulties = summarizeGroup(results, "difficulty");

  const comparisons = {};
  if (summary.profiles.baseline) {
    for (const profile of profileNames) {
      if (profile === "baseline") continue;
      comparisons[`${profile}_vs_baseline`] = comparisonFor(
        summary.profiles[profile],
        summary.profiles.baseline
      );
    }
  }
  if (summary.profiles["rust-skills"]) {
    for (const profile of profileNames) {
      if (profile === "rust-skills") continue;
      comparisons[`rust-skills_vs_${profile}`] = comparisonFor(
        summary.profiles["rust-skills"],
        summary.profiles[profile]
      );
    }
  }
  if (Object.keys(comparisons).length > 0) {
    summary.comparisons = comparisons;
  }
  summary.skillHarm = detectSkillHarm(summary.profiles, {
    threshold: options.skillHarmThreshold || 0
  });
  return summary;
}

export { DEFAULT_CONCEPT_ALIASES };
