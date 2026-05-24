# Agent Benchmark Evidence: clean-regeneration-answer-codex-v3-20260523-agent-matrix

- Status: MEASURED
- Generated at: 2026-05-23T14:00:14.834Z
- Engines: codex
- Profiles: baseline, rust-main-regenerated, rust-skills
- Repeats: 1
- Concurrency: 4
- Benchmark mode: true
- Codex isolation: ignoreUserConfig=true, ignoreRules=true
- Cases: 33
- Runnable: 33
- Skipped: 0
- Failed: 7
- Quality gate pass rate: 78.8%
- Timeout rate: 0.0%

## Profiles

| Profile | Total | Runnable | Skipped | Response | Artifact | Patch | Quality | Timeout |
|---------|-------|----------|---------|----------|----------|-------|---------|---------|
| rust-main-regenerated | 11 | 11 | 0 | 100.0% | 0.0% | 0.0% | 90.9% | 0.0% |
| baseline | 11 | 11 | 0 | 100.0% | 0.0% | 0.0% | 54.5% | 0.0% |
| rust-skills | 11 | 11 | 0 | 100.0% | 0.0% | 0.0% | 90.9% | 0.0% |

## Comparisons

### rust-main-regenerated_vs_baseline

- responseGenerationRateDelta: 0
- artifactGenerationRateDelta: 0
- patchGenerationRateDelta: 0
- qualityGatePassRateDelta: 0.3636
- timeoutRateDelta: 0

### rust-skills_vs_baseline

- responseGenerationRateDelta: 0
- artifactGenerationRateDelta: 0
- patchGenerationRateDelta: 0
- qualityGatePassRateDelta: 0.3636
- timeoutRateDelta: 0

### rust-skills_vs_rust-main-regenerated

- responseGenerationRateDelta: 0
- artifactGenerationRateDelta: 0
- patchGenerationRateDelta: 0
- qualityGatePassRateDelta: 0
- timeoutRateDelta: 0

## Profile Roots

- rust-main-regenerated: /private/tmp/rust-skills-regenerated-main-full-20260523-v3
- rust-skills: /private/tmp/rust-skills-regenerated-current-full-20260523-v3

## Source Report

`tests/results/agent-matrix/clean-regeneration-answer-codex-v3-20260523-agent-matrix/report.json`
