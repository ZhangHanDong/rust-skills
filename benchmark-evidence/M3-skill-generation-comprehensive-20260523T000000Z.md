# Agent Benchmark Evidence: M3-skill-generation-comprehensive-20260523T000000Z

- Status: MEASURED
- Generated at: 2026-05-23T02:51:00.156Z
- Engines: codex, claude-code
- Profiles: baseline, rust-skills
- Repeats: 1
- Concurrency: 4
- Benchmark mode: true
- Codex isolation: ignoreUserConfig=true, ignoreRules=true
- Cases: 80
- Runnable: 80
- Skipped: 0
- Failed: 5
- Quality gate pass rate: 93.8%
- Timeout rate: 0.0%

## Profiles

| Profile | Total | Runnable | Skipped | Response | Artifact | Patch | Quality | Timeout |
|---------|-------|----------|---------|----------|----------|-------|---------|---------|
| rust-skills | 40 | 40 | 0 | 100.0% | 45.0% | 45.0% | 97.5% | 0.0% |
| baseline | 40 | 40 | 0 | 100.0% | 45.0% | 45.0% | 90.0% | 0.0% |

## Comparison

- responseGenerationRateDelta: 0
- artifactGenerationRateDelta: 0
- patchGenerationRateDelta: 0
- qualityGatePassRateDelta: 0.075
- timeoutRateDelta: 0

## Source Report

`tests/results/agent-matrix/M3-skill-generation-comprehensive-20260523T000000Z/report.json`
