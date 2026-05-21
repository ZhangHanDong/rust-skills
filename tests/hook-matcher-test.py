#!/usr/bin/env python3
"""
TDD tests for rust-skills hook matcher
Run: python3 tests/hook-matcher-test.py
"""

import re
import json
import sys
from pathlib import Path

# Load matcher from hooks.json
hooks_path = Path(__file__).parent.parent / "hooks" / "hooks.json"
with open(hooks_path) as f:
    hooks_config = json.load(f)

MATCHER = hooks_config["hooks"]["UserPromptSubmit"][0]["matcher"]

print(f"=== Hook Matcher TDD Tests ===")
print(f"Matcher loaded from: {hooks_path}\n")

# Test cases: (input, should_match, expected_match_word)
test_cases = [
    # Rust 技术问题 - 应该匹配
    ("Rust 支付系统精度问题", True, "Rust"),
    ("E0382 错误怎么解决", True, "E0382"),
    ("rust ownership问题", True, "rust"),
    ("how to use tokio", True, "tokio"),
    ("Rust 生命周期错误怎么解决", True, "Rust"),
    ("帮我写一个 Rust 异步函数", True, "Rust"),
    ("Rust 最佳实践是什么", True, "Rust"),
    ("value moved error", True, "value moved"),
    ("这个 Rust 函数怎么用", True, "Rust"),
    ("解释一下这段 .rs 代码", True, ".rs"),
    ("cargo build 报错了", True, "cargo"),
    ("Rust async await 怎么用", True, "Rust"),
    ("Send Sync trait 是什么", True, "Send"),
    ("借用检查器报错", True, "借用"),
    ("所有权和借用怎么理解", True, "所有权"),
    ("unsafe FFI raw pointer wrapper", True, "unsafe"),
    ("Rust 类型不匹配怎么办", True, "Rust"),

    # 非 Rust 问题不应启动 hook
    ("今天天气怎么样", False, None),
    ("帮我订一张机票", False, None),
    ("Compare Arc browser and Chrome", False, None),
    ("Send this package by cargo shipping", False, None),
    ("Rocket Mortgage application status", False, None),
    ("Tower fan bedroom lighting plan", False, None),
    ("Hyper browser tab management", False, None),
    ("Warp terminal theme setup", False, None),
    ("customer lifetime value model", False, None),
    ("home ownership documents", False, None),
    ("unsafe ladder installation guide", False, None),
    ("生命周期营销怎么做", False, None),
    ("房屋所有权证明怎么准备", False, None),
    ("wooden crate documentation for packaging", False, None),
    ("nightly skincare routine", False, None),
    ("明天几点开会", False, None),
    ("晚饭吃什么", False, None),
]

passed = 0
failed = 0

for text, should_match, expected_word in test_cases:
    match = re.search(MATCHER, text)
    matched = match is not None

    if matched == should_match:
        passed += 1
        if matched:
            print(f"✅ PASS: '{text}' -> matched '{match.group()}'")
        else:
            print(f"✅ PASS: '{text}' -> no match (expected)")
    else:
        failed += 1
        if matched:
            print(f"❌ FAIL: '{text}' -> matched '{match.group()}' (should NOT match)")
        else:
            print(f"❌ FAIL: '{text}' -> no match (should match '{expected_word}')")

print(f"\n=== Summary ===")
print(f"Passed: {passed}/{len(test_cases)}")
print(f"Failed: {failed}/{len(test_cases)}")

if failed > 0:
    sys.exit(1)
