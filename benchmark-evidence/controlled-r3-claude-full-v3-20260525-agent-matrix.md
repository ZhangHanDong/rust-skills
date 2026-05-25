# Agent Benchmark Evidence: controlled-r3-claude-full-v3-20260525-agent-matrix

- Status: MEASURED
- Generated at: 2026-05-25T07:59:24.379Z
- Engines: claude-code
- Profiles: baseline, rust-main-regenerated, rust-skills
- Repeats: 3
- Concurrency: 6
- Benchmark mode: true
- Codex isolation: ignoreUserConfig=true, ignoreRules=true
- Cases: 234
- Runnable: 234
- Skipped: 0
- Failed: 28
- Quality gate pass rate: 88.0%
- Timeout rate: 0.0%

## Profiles

| Profile | Total | Runnable | Skipped | Response | Artifact | Patch | Quality | Timeout |
|---------|-------|----------|---------|----------|----------|-------|---------|---------|
| rust-main-regenerated | 78 | 78 | 0 | 100.0% | 38.5% | 38.5% | 83.3% | 0.0% |
| baseline | 78 | 78 | 0 | 100.0% | 38.5% | 38.5% | 88.5% | 0.0% |
| rust-skills | 78 | 78 | 0 | 100.0% | 38.5% | 37.2% | 92.3% | 0.0% |

## Comparisons

### rust-main-regenerated_vs_baseline

- responseGenerationRateDelta: 0
- artifactGenerationRateDelta: 0
- patchGenerationRateDelta: 0
- qualityGatePassRateDelta: -0.0513
- timeoutRateDelta: 0

### rust-skills_vs_baseline

- responseGenerationRateDelta: 0
- artifactGenerationRateDelta: 0
- patchGenerationRateDelta: -0.0128
- qualityGatePassRateDelta: 0.0385
- timeoutRateDelta: 0

### rust-skills_vs_rust-main-regenerated

- responseGenerationRateDelta: 0
- artifactGenerationRateDelta: 0
- patchGenerationRateDelta: -0.0128
- qualityGatePassRateDelta: 0.0898
- timeoutRateDelta: 0

## Profile Roots

- rust-main-regenerated: /tmp/rust-skills-regenerated-main-controlled-r3-20260525T141553
- rust-skills: /tmp/rust-skills-regenerated-current-controlled-r3-v3-20260525T152255

## Source Report

`tests/results/agent-matrix/controlled-r3-claude-full-v3-20260525-agent-matrix/report.json`
