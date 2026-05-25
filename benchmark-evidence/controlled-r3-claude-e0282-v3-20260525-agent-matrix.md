# Agent Benchmark Evidence: controlled-r3-claude-e0282-v3-20260525-agent-matrix

- Status: MEASURED
- Generated at: 2026-05-25T07:24:59.150Z
- Engines: claude-code
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
| baseline | 3 | 3 | 0 | 100.0% | 0.0% | 0.0% | 66.7% | 0.0% |
| rust-main-regenerated | 3 | 3 | 0 | 100.0% | 0.0% | 0.0% | 0.0% | 0.0% |
| rust-skills | 3 | 3 | 0 | 100.0% | 0.0% | 0.0% | 100.0% | 0.0% |

## Comparisons

### rust-main-regenerated_vs_baseline

- responseGenerationRateDelta: 0
- artifactGenerationRateDelta: 0
- patchGenerationRateDelta: 0
- qualityGatePassRateDelta: -0.6667
- timeoutRateDelta: 0

### rust-skills_vs_baseline

- responseGenerationRateDelta: 0
- artifactGenerationRateDelta: 0
- patchGenerationRateDelta: 0
- qualityGatePassRateDelta: 0.3333
- timeoutRateDelta: 0

### rust-skills_vs_rust-main-regenerated

- responseGenerationRateDelta: 0
- artifactGenerationRateDelta: 0
- patchGenerationRateDelta: 0
- qualityGatePassRateDelta: 1
- timeoutRateDelta: 0

## Profile Roots

- rust-main-regenerated: /tmp/rust-skills-regenerated-main-controlled-r3-20260525T141553
- rust-skills: /tmp/rust-skills-regenerated-current-controlled-r3-v3-20260525T152255

## Source Report

`tests/results/agent-matrix/controlled-r3-claude-e0282-v3-20260525-agent-matrix/report.json`
