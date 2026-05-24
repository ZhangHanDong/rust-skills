# Agent Benchmark Evidence: clean-regeneration-full-codex-v4-20260523-agent-matrix

- Status: MEASURED
- Generated at: 2026-05-23T23:32:24.997Z
- Engines: codex
- Profiles: baseline, rust-main-regenerated, rust-skills
- Repeats: 1
- Concurrency: 4
- Benchmark mode: true
- Codex isolation: ignoreUserConfig=true, ignoreRules=true
- Cases: 78
- Runnable: 78
- Skipped: 0
- Failed: 24
- Quality gate pass rate: 69.2%
- Timeout rate: 16.7%

## Profiles

| Profile | Total | Runnable | Skipped | Response | Artifact | Patch | Quality | Timeout |
|---------|-------|----------|---------|----------|----------|-------|---------|---------|
| rust-skills | 26 | 26 | 0 | 80.8% | 38.5% | 23.1% | 73.1% | 19.2% |
| rust-main-regenerated | 26 | 26 | 0 | 84.6% | 38.5% | 23.1% | 73.1% | 15.4% |
| baseline | 26 | 26 | 0 | 84.6% | 38.5% | 26.9% | 61.5% | 15.4% |

## Comparisons

### rust-skills_vs_baseline

- responseGenerationRateDelta: -0.0385
- artifactGenerationRateDelta: 0
- patchGenerationRateDelta: -0.0384
- qualityGatePassRateDelta: 0.1154
- timeoutRateDelta: 0.0385

### rust-main-regenerated_vs_baseline

- responseGenerationRateDelta: 0
- artifactGenerationRateDelta: 0
- patchGenerationRateDelta: -0.0384
- qualityGatePassRateDelta: 0.1154
- timeoutRateDelta: 0

### rust-skills_vs_rust-main-regenerated

- responseGenerationRateDelta: -0.0385
- artifactGenerationRateDelta: 0
- patchGenerationRateDelta: 0
- qualityGatePassRateDelta: 0
- timeoutRateDelta: 0.0385

## Profile Roots

- rust-main-regenerated: /private/tmp/rust-skills-regenerated-main-full-20260523-v4
- rust-skills: /private/tmp/rust-skills-regenerated-current-full-20260523-v4

## Source Report

`tests/results/agent-matrix/clean-regeneration-full-codex-v4-20260523-agent-matrix/report.json`
