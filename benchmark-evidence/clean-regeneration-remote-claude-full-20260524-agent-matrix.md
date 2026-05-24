# Agent Benchmark Evidence: clean-regeneration-remote-claude-full-20260524-remote-hongdachen

- Status: MEASURED
- Generated at: 2026-05-24T15:01:00.708Z
- Engines: claude-code
- Profiles: baseline, rust-main-regenerated, rust-skills
- Repeats: 1
- Concurrency: 4
- Benchmark mode: true
- Codex isolation: ignoreUserConfig=true, ignoreRules=true
- Cases: 78
- Runnable: 78
- Skipped: 0
- Failed: 3
- Quality gate pass rate: 96.2%
- Timeout rate: 0.0%

## Profiles

| Profile | Total | Runnable | Skipped | Response | Artifact | Patch | Quality | Timeout |
|---------|-------|----------|---------|----------|----------|-------|---------|---------|
| rust-main-regenerated | 26 | 26 | 0 | 100.0% | 38.5% | 38.5% | 96.2% | 0.0% |
| rust-skills | 26 | 26 | 0 | 100.0% | 38.5% | 38.5% | 100.0% | 0.0% |
| baseline | 26 | 26 | 0 | 100.0% | 38.5% | 38.5% | 92.3% | 0.0% |

## Comparisons

### rust-main-regenerated_vs_baseline

- responseGenerationRateDelta: 0
- artifactGenerationRateDelta: 0
- patchGenerationRateDelta: 0
- qualityGatePassRateDelta: 0.0384
- timeoutRateDelta: 0

### rust-skills_vs_baseline

- responseGenerationRateDelta: 0
- artifactGenerationRateDelta: 0
- patchGenerationRateDelta: 0
- qualityGatePassRateDelta: 0.0769
- timeoutRateDelta: 0

### rust-skills_vs_rust-main-regenerated

- responseGenerationRateDelta: 0
- artifactGenerationRateDelta: 0
- patchGenerationRateDelta: 0
- qualityGatePassRateDelta: 0.0385
- timeoutRateDelta: 0

## Profile Roots

- rust-main-regenerated: /tmp/rust-skills-profiles-20260524-remote-99155/main
- rust-skills: /tmp/rust-skills-profiles-20260524-remote-99155/current

## Source Report

`tests/results/agent-matrix/clean-regeneration-remote-claude-full-20260524-remote-hongdachen/report.json`
