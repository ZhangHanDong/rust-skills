#!/usr/bin/env node
// Pinned-table test for the rust-router routing tables.
//
// The 72+ row semantic table in skills/rust-router/SKILL.md is human-curated
// prose that cannot be generated. verify's C2 check only catches a *missing*
// layer1/2 skill id; it cannot see row rewording or accidental structure loss.
// This pin makes any table change DELIBERATE: editing the table is fine, but
// you must re-pin (run with --write-pin) in the same commit, which shows up in
// review. Catches accidental deletions, botched merges, and format drift that
// would otherwise silently degrade C2's substring matching.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const routerPath = path.join(root, "skills", "rust-router", "SKILL.md");
const pinPath = path.join(root, "tests", "fixtures", "router-table-pin.json");

const content = fs.readFileSync(routerPath, "utf8");
// Pin exactly the table rows (lines starting with '|') — prose edits around
// the tables don't invalidate the pin; row edits do.
const rows = content.split("\n").filter((line) => line.startsWith("|"));
const current = {
  rowCount: rows.length,
  sha256: crypto.createHash("sha256").update(rows.join("\n")).digest("hex")
};

if (process.argv.includes("--write-pin")) {
  fs.mkdirSync(path.dirname(pinPath), { recursive: true });
  fs.writeFileSync(pinPath, JSON.stringify({
    note: "Pin of the rust-router SKILL.md table rows (lines starting with '|'). If you edited the tables intentionally, re-pin with: node tests/router-table-pin-test.mjs --write-pin — in the SAME commit so the change is visible in review.",
    ...current
  }, null, 2) + "\n");
  console.log(`router table pin written: ${current.rowCount} rows, ${current.sha256.slice(0, 16)}`);
  process.exit(0);
}

const pinned = JSON.parse(fs.readFileSync(pinPath, "utf8"));
if (pinned.sha256 !== current.sha256) {
  console.error(JSON.stringify({
    status: "FAIL",
    reason: "rust-router table rows changed without re-pinning",
    pinnedRows: pinned.rowCount,
    currentRows: current.rowCount,
    hint: "If the edit is intentional: node tests/router-table-pin-test.mjs --write-pin (same commit)."
  }, null, 2));
  process.exit(1);
}
console.log(`router table pin test: PASS (${current.rowCount} rows)`);
