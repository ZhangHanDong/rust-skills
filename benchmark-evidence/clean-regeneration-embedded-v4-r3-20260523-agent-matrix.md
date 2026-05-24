# Agent Benchmark Evidence: clean-regeneration-embedded-v4-r3-20260523-agent-matrix

- Status: MEASURED
- Generated at: 2026-05-23T14:04:15.103Z
- Engines: codex
- Profiles: baseline, rust-main-regenerated, rust-skills
- Repeats: 3
- Concurrency: 3
- Benchmark mode: true
- Codex isolation: ignoreUserConfig=true, ignoreRules=true
- Cases: 9
- Runnable: 9
- Skipped: 0
- Failed: 4
- Quality gate pass rate: 55.6%
- Timeout rate: 0.0%

## Profiles

| Profile | Total | Runnable | Skipped | Response | Artifact | Patch | Quality | Timeout |
|---------|-------|----------|---------|----------|----------|-------|---------|---------|
| baseline | 3 | 3 | 0 | 100.0% | 0.0% | 0.0% | 33.3% | 0.0% |
| rust-main-regenerated | 3 | 3 | 0 | 100.0% | 0.0% | 0.0% | 33.3% | 0.0% |
| rust-skills | 3 | 3 | 0 | 100.0% | 0.0% | 0.0% | 100.0% | 0.0% |

## Comparisons

### rust-main-regenerated_vs_baseline

- responseGenerationRateDelta: 0
- artifactGenerationRateDelta: 0
- patchGenerationRateDelta: 0
- qualityGatePassRateDelta: 0
- timeoutRateDelta: 0

### rust-skills_vs_baseline

- responseGenerationRateDelta: 0
- artifactGenerationRateDelta: 0
- patchGenerationRateDelta: 0
- qualityGatePassRateDelta: 0.6667
- timeoutRateDelta: 0

### rust-skills_vs_rust-main-regenerated

- responseGenerationRateDelta: 0
- artifactGenerationRateDelta: 0
- patchGenerationRateDelta: 0
- qualityGatePassRateDelta: 0.6667
- timeoutRateDelta: 0

## Profile Roots

- rust-main-regenerated: /private/tmp/rust-skills-regenerated-main-full-20260523-v4
- rust-skills: /private/tmp/rust-skills-regenerated-current-full-20260523-v4

## Source Report

`tests/results/agent-matrix/clean-regeneration-embedded-v4-r3-20260523-agent-matrix/report.json`
