---
name: generated-rust-sample
description: "Use when: validating generated Rust skill structure in tests. Keywords: E0382, type inference, MSRV, cargo test."
---

# Generated Rust Sample

## Scope

Use this sample to validate the strict skill generation gate. It represents the
shape expected from generated Rust crate skills.

## Documentation

Load `./references/api.md` only when the task needs API details.

## Documentation Boundary

If the reference is missing, report that generated local documentation is
incomplete and recommend regenerating the skill.

## Calibration Anchors

- E0382: treat moved values and consuming builders as API design questions.
- E0282: add a type annotation or turbofish when inference lacks constraints.
- API evolution: check MSRV, semver, stabilization, and deprecation notes.
- Boundary: do not apply this skill to non-Rust tasks.

## When Writing Code

1. Prefer examples that can pass `cargo test`.
2. Use clone only when two independent owned values are required.
