# Rust Skills

[English](./README.md) | [中文](./README-zh.md)

> メタ認知フレームワークを備えた AI Rust 開発アシスタント

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Claude Code](https://img.shields.io/badge/Claude%20Code-Plugin-blue)](https://github.com/anthropics/claude-code)

## Rust Skills とは？

**Rust Skills** は Claude Code プラグインで、AI による Rust 開発支援の方法を変革します。表面的な回答ではなく、認知層を遡って**ドメイン的に正しいアーキテクチャソリューション**を提供します。

### 問題点

従来の AI による Rust 支援：
```
ユーザー: "取引システムで E0382 エラーが出ます"
AI: ".clone() を使ってください"  ← 表面的な修正、ドメイン制約を無視
```

### 解決策

メタ認知を備えた Rust Skills：
```
ユーザー: "取引システムで E0382 エラーが出ます"

AI (Rust Skills 使用):
├── Layer 1: E0382 = 所有権エラー → なぜこのデータが必要？
│       ↑
├── Layer 3: 取引記録は不変の監査データ → コピーではなく共有すべき
│       ↓
├── Layer 2: Arc<TradeRecord> を共有不変値として使用
│       ↓
└── 推奨: clone() ではなく Arc<T> として再設計
```

## 機能

- **メタ認知フレームワーク**: 3層認知モデル (ドメイン → 設計 → 機構)
- **リアルタイム情報取得**: バックグラウンドエージェントで最新の Rust バージョンと crate 情報を取得
- **動的 Skills**: Cargo.toml の依存関係から自動的に skills を生成
- **ドメイン拡張**: FinTech、ML、クラウドネイティブ、IoT、組み込み、Web、CLI をサポート
- **コーディング規約**: 完全な Rust コーディング規約とベストプラクティス

## インストール

### 方法1：完全プラグイン（推奨）

この方法は **hooks を含むすべての機能**を有効にし、メタ認知を自動的にトリガーします。

```bash
# リポジトリをクローン
git clone https://github.com/ZhangHanDong/rust-skills.git

# プラグインディレクトリで起動
claude --plugin-dir /path/to/rust-skills
```

### 方法2：Skills のみ

この方法は skills のみをインストールし、hooks は含まれません。skills を手動で呼び出す必要があります。

**オプション A：npx を使用（推奨）**

```bash
npx add-skill ZhangHanDong/rust-skills
```

**オプション B：手動インストール**

```bash
# クローンして skills をコピー
git clone https://github.com/ZhangHanDong/rust-skills.git
cp -r rust-skills/skills/* ~/.claude/skills/
```

> ⚠️ **注意**：hooks がない場合、メタ認知は自動的にトリガーされません。`/rust-router` または特定の skills を手動で呼び出す必要があります。

### 機能比較

| 機能 | 完全プラグイン | Skills のみ |
|------|----------------|-------------|
| すべての Skills | ✅ | ✅ |
| 自動メタ認知トリガー | ✅ | ❌ |
| Hook ルーティング | ✅ | ❌ |
| バックグラウンドエージェント | ✅ | ✅ |

### 権限設定

バックグラウンドエージェントには `agent-browser` を実行する権限が必要です。プロジェクトで設定：

```bash
# サンプル設定をコピー
cp /path/to/rust-skills/.claude/settings.example.json .claude/settings.local.json
```

または手動で作成：

```bash
mkdir -p .claude
cat > .claude/settings.local.json << 'EOF'
{
  "permissions": {
    "allow": [
      "Bash(agent-browser *)"
    ]
  }
}
EOF
```

[.claude/settings.example.json](.claude/settings.example.json) を参照してください。

### その他のプラットフォーム

- **OpenCode**: [.opencode/INSTALL.md](.opencode/INSTALL.md) を参照
- **Codex**: [.codex/INSTALL.md](.codex/INSTALL.md) を参照

## メタ認知フレームワーク

### コアコンセプト

**直接回答せず、まず認知層を遡る。**

```
Layer 3: ドメイン制約 (WHY - なぜ)
├── ドメインルールが設計選択を決定
└── 例：金融システムは不変で監査可能なデータを要求

Layer 2: 設計選択 (WHAT - 何を)
├── デザインパターンとアーキテクチャ決定
└── 例：共有不変データに Arc<T> を使用

Layer 1: 言語機構 (HOW - どのように)
├── Rust 言語機能とコンパイラルール
└── 例：E0382 は所有権設計問題の症状
```

### ルーティングルール

| ユーザーシグナル | エントリ層 | 遡り方向 | 優先 Skill |
|------------------|------------|----------|------------|
| E0xxx エラー | Layer 1 | 上へ遡る ↑ | m01-m07 |
| "設計方法..." | Layer 2 | 双方向 | m09-m15 |
| "[ドメイン]アプリ開発" | Layer 3 | 下へ遡る ↓ | domain-* |
| パフォーマンス問題 | Layer 1→2 | 上から下 | m10-performance |

## Skills 概要

### コア Skills
- `rust-router` - すべての Rust 質問のマスタールーター（最初に呼び出し）
- `rust-learner` - 最新の Rust/crate バージョン情報を取得
- `coding-guidelines` - コーディング規約の検索

### Layer 1: 言語機構 (m01-m07)

| Skill | コア質問 | トリガー |
|-------|----------|----------|
| m01-ownership | このデータは誰が所有すべき？ | E0382, E0597, move, borrow |
| m02-resource | どの所有権パターンが適切？ | Box, Rc, Arc, RefCell |
| m03-mutability | なぜこのデータを変更する必要が？ | mut, Cell, E0596, E0499 |
| m04-zero-cost | コンパイル時か実行時の多態性？ | generic, trait, E0277 |
| m05-type-driven | 型で無効な状態を防ぐには？ | newtype, PhantomData |
| m06-error-handling | 予期される失敗かバグか？ | Result, Error, panic, ? |
| m07-concurrency | CPU バウンドか I/O バウンドか？ | async, Send, Sync, thread |

### Layer 2: 設計選択 (m09-m15)

| Skill | コア質問 | トリガー |
|-------|----------|----------|
| m09-domain | この概念のドメインでの役割は？ | DDD, entity, value object |
| m10-performance | ボトルネックはどこ？ | benchmark, profiling |
| m11-ecosystem | どの crate がこのタスクに適切？ | crate 選択, 依存関係 |
| m12-lifecycle | いつ作成、使用、クリーンアップ？ | RAII, Drop, lazy init |
| m13-domain-error | 誰がこのエラーを処理？ | retry, circuit breaker |
| m14-mental-model | この概念の正しい考え方は？ | Rust 学習, なぜ |
| m15-anti-pattern | このパターンは設計問題を隠している？ | code smell, よくある間違い |

### Layer 3: ドメイン制約 (domain-*)

| Skill | ドメイン | コア制約 |
|-------|----------|----------|
| domain-fintech | FinTech | 監査証跡, 精度, 一貫性 |
| domain-ml | 機械学習 | メモリ効率, GPU アクセラレーション |
| domain-cloud-native | クラウドネイティブ | 12-Factor, 可観測性, グレースフルシャットダウン |
| domain-iot | IoT | オフラインファースト, 電力管理, セキュリティ |
| domain-web | Web サービス | ステートレス, レイテンシ SLA, 並行性 |
| domain-cli | CLI | UX, 設定優先順位, 終了コード |
| domain-embedded | 組み込み | ヒープなし, no_std, リアルタイム |

## コマンド

| コマンド | 説明 |
|----------|------|
| `/rust-features [version]` | Rust バージョン機能を取得 |
| `/crate-info <crate>` | crate 情報を取得 |
| `/docs <crate> [item]` | API ドキュメントを取得 |
| `/sync-crate-skills` | Cargo.toml から skills を同期 |
| `/update-crate-skill <crate>` | 指定 crate skill を更新 |
| `/clean-crate-skills` | ローカル crate skills をクリーン |

## 動的 Skills

プロジェクトの依存関係からオンデマンドで skills を生成：

```bash
# Rust プロジェクトに入る
cd my-rust-project

# すべての依存関係を同期
/sync-crate-skills

# Skills は ~/.claude/skills/{crate}/ に作成されます
```

### 特徴
- **オンデマンド生成**: Cargo.toml 依存関係から作成
- **ローカルストレージ**: `~/.claude/skills/`
- **バージョン追跡**: 各 skill が crate バージョンを記録
- **ワークスペースサポート**: すべてのワークスペースメンバーを解析

## 動作原理

```
ユーザー質問
     │
     ▼
┌─────────────────────────────────────────┐
│           Hook レイヤー                  │
│  400+ キーワードでメタ認知をトリガー      │
└─────────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│           rust-router                    │
│  エントリ層 + ドメインを識別              │
│  決定: デュアルスキルロード               │
└─────────────────────────────────────────┘
     │
     ├──────────────┬──────────────┐
     ▼              ▼              ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│ Layer 1  │  │ Layer 2  │  │ Layer 3  │
│ m01-m07  │  │ m09-m15  │  │ domain-* │
└──────────┘  └──────────┘  └──────────┘
     │
     ▼
ドメイン的に正しいアーキテクチャソリューション
```

## ドキュメント

- [アーキテクチャ (中文)](./docs/architecture-zh.md)
- [機能概要 (中文)](./docs/functional-overview-zh.md)
- [Hook メカニズム (中文)](./docs/hook-mechanism-zh.md)
- [プロンプトエンジニアリング (中文)](./docs/prompt-engineering-zh.md)
- [メタ認知例: E0382](./docs/meta-cognition-example-e0382.md)

## 貢献

貢献を歓迎します！PR を提出する前に貢献ガイドラインをお読みください。

## ライセンス

MIT ライセンス - 詳細は [LICENSE](LICENSE) を参照

## リンク

- **GitHub**: https://github.com/ZhangHanDong/rust-skills
- **Issues**: https://github.com/ZhangHanDong/rust-skills/issues
