# Agent Benchmark Evidence: profile-root-unsafe-focused-real

- Status: MEASURED
- Generated at: 2026-05-23T03:14:57.695Z
- Engines: codex
- Profiles: baseline, rust-main, rust-skills
- Repeats: 1
- Concurrency: 2
- Benchmark mode: true
- Codex isolation: ignoreUserConfig=true, ignoreRules=true
- Cases: 12
- Runnable: 12
- Skipped: 0
- Failed: 2
- Quality gate pass rate: 83.3%
- Timeout rate: 0.0%

## Profiles

| Profile | Total | Runnable | Skipped | Response | Artifact | Patch | Quality | Timeout |
|---------|-------|----------|---------|----------|----------|-------|---------|---------|
| rust-main | 4 | 4 | 0 | 100.0% | 50.0% | 50.0% | 100.0% | 0.0% |
| baseline | 4 | 4 | 0 | 100.0% | 50.0% | 50.0% | 75.0% | 0.0% |
| rust-skills | 4 | 4 | 0 | 100.0% | 50.0% | 50.0% | 75.0% | 0.0% |

## Comparisons

### rust-main_vs_baseline

- responseGenerationRateDelta: 0
- artifactGenerationRateDelta: 0
- patchGenerationRateDelta: 0
- qualityGatePassRateDelta: 0.25
- timeoutRateDelta: 0

### rust-skills_vs_baseline

- responseGenerationRateDelta: 0
- artifactGenerationRateDelta: 0
- patchGenerationRateDelta: 0
- qualityGatePassRateDelta: 0
- timeoutRateDelta: 0

### rust-skills_vs_rust-main

- responseGenerationRateDelta: 0
- artifactGenerationRateDelta: 0
- patchGenerationRateDelta: 0
- qualityGatePassRateDelta: -0.25
- timeoutRateDelta: 0

## Profile Roots

- rust-main: /private/tmp/rust-skills-main-origin-compare

## Source Report

`tests/results/agent-matrix/profile-root-unsafe-focused-real/report.json`
