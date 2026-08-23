// Shared helper for tests that route prompts through the rust-skills binary.
// Replaces three near-identical resolveBin/spawn implementations
// (routing-eval, discriminating-eval, routing-heldout).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

export const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export function resolveBin(root = repoRoot) {
  const name = process.platform === "win32" ? "rust-skills.exe" : "rust-skills";
  for (const profile of ["release", "debug"]) {
    const candidate = path.join(root, "target", profile, name);
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error("rust-skills binary not found; run `cargo build --release`");
}

// Route one prompt, returning the parsed route JSON. Prompt goes via stdin
// (`route --json -- -`) so long/exotic prompts never hit ARG_MAX.
export function routeJson(prompt, { root = repoRoot, bin = resolveBin(root) } = {}) {
  const result = spawnSync(bin, ["route", "--json", "--", "-"], {
    env: { ...process.env, RUST_SKILLS_ROOT: root },
    input: String(prompt ?? ""),
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024
  });
  if (result.status !== 0) {
    throw new Error(`route failed (${result.status}): ${(result.stderr || result.stdout || "").slice(0, 300)}`);
  }
  return JSON.parse(result.stdout);
}

// Convenience: non-router skill ids for a prompt.
export function routedSkills(prompt, options = {}) {
  const route = routeJson(prompt, options);
  return {
    skills: (route.skills || []).filter((skill) => skill !== "rust-router"),
    paths: route.paths || {}
  };
}
