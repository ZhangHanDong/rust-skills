#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const hooksConfig = JSON.parse(fs.readFileSync(path.join(root, "hooks", "hooks.json"), "utf8"));
const matcher = hooksConfig.hooks.UserPromptSubmit[0].matcher;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function compileMatcher(source) {
  let pattern = source;
  let flags = "";
  if (pattern.startsWith("(?i)")) {
    pattern = pattern.slice(4);
    flags = "i";
  }
  return new RegExp(pattern, flags);
}

const regex = compileMatcher(matcher);
const cases = [
	  ["Rust 支付系统精度问题", true],
	  ["E0382 错误怎么解决", true],
	  ["rust ownership问题", true],
	  ["how to use tokio", true],
	  ["rust-skill install for Claude Code", true],
	  ["rustskills install for Codex", true],
	  ["rustup component add clippy", true],
	  ["Rust 生命周期错误怎么解决", true],
	  ["cargo build 报错了", true],
	  ["Send Sync trait 是什么", true],
	  ["unsafe FFI raw pointer wrapper", true],
	  ["所有权和借用怎么理解", true],
	  ["借用检查器报错", true],
	  ["Compare Arc browser and Chrome", false],
	  ["Send this package by cargo shipping", false],
	  ["Rocket Mortgage application status", false],
	  ["Tower fan bedroom lighting plan", false],
	  ["Hyper browser tab management", false],
	  ["Warp terminal theme setup", false],
	  ["customer lifetime value model", false],
	  ["home ownership documents", false],
	  ["unsafe ladder installation guide", false],
	  ["skill installation guide for design teams", false],
	  ["生命周期营销怎么做", false],
	  ["房屋所有权证明怎么准备", false],
	  ["wooden crate documentation for packaging", false],
	  ["nightly skincare routine", false],
	  ["今天天气怎么样", false],
	  ["帮我订一张机票", false]
	];

for (const [prompt, expected] of cases) {
  const actual = regex.test(prompt);
  assert(actual === expected, `${prompt}: expected ${expected}, got ${actual}`);
}

console.log(`hook matcher test: PASS cases=${cases.length}`);
