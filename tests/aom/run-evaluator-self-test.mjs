#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  evaluateSemanticText,
  evaluateText,
  summarize
} from "./evaluation.mjs";

function result(profile, hardGate, semanticGate, conceptCovered, conceptTotal) {
  return {
    profile,
    status: "PASS",
    hardGate,
    semanticGate,
    metrics: {
      responseGenerated: true,
      artifactGenerated: false,
      patchGenerated: false,
      conceptCovered,
      conceptTotal
    }
  };
}

const typedExpected = { mustMention: ["typed errors"] };
const typedText = "Expose typed public errors at the library boundary.";
assert.deepEqual(evaluateText(typedText, typedExpected), [
  { kind: "missing_phrase", phrase: "typed errors" }
]);
assert.equal(evaluateSemanticText(typedText, typedExpected).semanticGate, "PASS");

const scopeExpected = { mustMention: ["scope", "deadlock"] };
const scopeText = "Keep the critical section small and drop the guard before await to avoid deadlocks.";
assert.equal(evaluateText(scopeText, scopeExpected).length, 1);
assert.equal(evaluateSemanticText(scopeText, scopeExpected).semanticGate, "PASS");

const missExpected = { mustMention: ["release notes"] };
const missText = "Use semver and provide a fallback path for older consumers.";
assert.deepEqual(evaluateSemanticText(missText, missExpected).semanticFailures, [
  { kind: "missing_concept", concept: "release notes" }
]);

assert.equal(evaluateSemanticText("plain output", {}).semanticGate, "N/A");

const summary = summarize([
  result("baseline", "PASS", "PASS", 2, 2),
  result("baseline", "PASS", "PASS", 2, 2),
  result("rust-skills", "PASS", "PASS", 2, 2),
  result("rust-skills", "FAIL", "FAIL", 1, 2)
]);

assert.equal(summary.profiles.baseline.qualityGatePassRate, 1);
assert.equal(summary.profiles["rust-skills"].qualityGatePassRate, 0.5);
assert.equal(summary.profiles.baseline.semanticGatePassRate, 1);
assert.equal(summary.profiles["rust-skills"].semanticGatePassRate, 0.5);
assert.deepEqual(summary.skillHarm.harmfulProfiles, ["rust-skills"]);
assert.equal(summary.skillHarm.findings[0].deltas.qualityGatePassRateDelta, -0.5);
assert.equal(summary.skillHarm.findings[0].deltas.semanticGatePassRateDelta, -0.5);

console.log(JSON.stringify({
  status: "PASS",
  checks: [
    "hard gate preserves exact missing phrase",
    "semantic gate accepts documented aliases",
    "semantic gate reports true concept misses",
    "skill harm detects below-baseline profiles"
  ]
}, null, 2));
