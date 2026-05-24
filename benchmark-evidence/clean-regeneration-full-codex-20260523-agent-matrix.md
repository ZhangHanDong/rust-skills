# Agent Benchmark Evidence: clean-regeneration-full-codex-20260523-agent-matrix

- Status: MEASURED
- Generated at: 2026-05-23T13:52:43.325Z
- Engines: codex
- Profiles: baseline, rust-main-regenerated, rust-skills
- Repeats: 1
- Concurrency: 4
- Benchmark mode: true
- Codex isolation: ignoreUserConfig=true, ignoreRules=true
- Cases: 78
- Runnable: 78
- Skipped: 0
- Failed: 8
- Quality gate pass rate: 89.7%
- Timeout rate: 0.0%

## Profiles

| Profile | Total | Runnable | Skipped | Response | Artifact | Patch | Quality | Timeout |
|---------|-------|----------|---------|----------|----------|-------|---------|---------|
| rust-main-regenerated | 26 | 26 | 0 | 100.0% | 38.5% | 38.5% | 88.5% | 0.0% |
| rust-skills | 26 | 26 | 0 | 100.0% | 38.5% | 38.5% | 84.6% | 0.0% |
| baseline | 26 | 26 | 0 | 100.0% | 38.5% | 38.5% | 96.2% | 0.0% |

## Comparisons

### rust-main-regenerated_vs_baseline

- responseGenerationRateDelta: 0
- artifactGenerationRateDelta: 0
- patchGenerationRateDelta: 0
- qualityGatePassRateDelta: -0.0769
- timeoutRateDelta: 0

### rust-skills_vs_baseline

- responseGenerationRateDelta: 0
- artifactGenerationRateDelta: 0
- patchGenerationRateDelta: 0
- qualityGatePassRateDelta: -0.1153
- timeoutRateDelta: 0

### rust-skills_vs_rust-main-regenerated

- responseGenerationRateDelta: 0
- artifactGenerationRateDelta: 0
- patchGenerationRateDelta: 0
- qualityGatePassRateDelta: -0.0384
- timeoutRateDelta: 0

## Profile Roots

- rust-main-regenerated: /private/tmp/rust-skills-regenerated-main-full-20260523
- rust-skills: /private/tmp/rust-skills-regenerated-current-full-20260523

## Source Report

`tests/results/agent-matrix/clean-regeneration-full-codex-20260523-agent-matrix/report.json`
