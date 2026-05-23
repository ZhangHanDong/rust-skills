# Agent Benchmark Evidence: profile-root-unsafe-slice-real-rerun

- Status: MEASURED
- Generated at: 2026-05-23T03:17:24.485Z
- Engines: codex
- Profiles: baseline, rust-main, rust-skills
- Repeats: 1
- Concurrency: 1
- Benchmark mode: true
- Codex isolation: ignoreUserConfig=true, ignoreRules=true
- Cases: 3
- Runnable: 3
- Skipped: 0
- Failed: 2
- Quality gate pass rate: 33.3%
- Timeout rate: 0.0%

## Profiles

| Profile | Total | Runnable | Skipped | Response | Artifact | Patch | Quality | Timeout |
|---------|-------|----------|---------|----------|----------|-------|---------|---------|
| baseline | 1 | 1 | 0 | 100.0% | 0.0% | 0.0% | 100.0% | 0.0% |
| rust-main | 1 | 1 | 0 | 100.0% | 0.0% | 0.0% | 0.0% | 0.0% |
| rust-skills | 1 | 1 | 0 | 100.0% | 0.0% | 0.0% | 0.0% | 0.0% |

## Comparisons

### rust-main_vs_baseline

- responseGenerationRateDelta: 0
- artifactGenerationRateDelta: 0
- patchGenerationRateDelta: 0
- qualityGatePassRateDelta: -1
- timeoutRateDelta: 0

### rust-skills_vs_baseline

- responseGenerationRateDelta: 0
- artifactGenerationRateDelta: 0
- patchGenerationRateDelta: 0
- qualityGatePassRateDelta: -1
- timeoutRateDelta: 0

### rust-skills_vs_rust-main

- responseGenerationRateDelta: 0
- artifactGenerationRateDelta: 0
- patchGenerationRateDelta: 0
- qualityGatePassRateDelta: 0
- timeoutRateDelta: 0

## Profile Roots

- rust-main: /private/tmp/rust-skills-main-origin-compare

## Source Report

`tests/results/agent-matrix/profile-root-unsafe-slice-real-rerun/report.json`
