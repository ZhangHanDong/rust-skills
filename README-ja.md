# Rust Skills

[English](./README.md) | [中文](./README-zh.md)

> メタ認知フレームワークを備えた AI Rust 開発アシスタント

[![Version](https://img.shields.io/badge/version-2.1.0-green.svg)](https://github.com/actionbook/rust-skills/releases)
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

Rust Skills は3つのインストールモードをサポートしています：

- **ローカル Runtime モード**（Codex と Claude Code）：単一のトップレベル `rust-skills`、hook ベースのルーティング、Rust-native `rust-skills` CLI を提供
- **Plugin モード**（Claude Code）：hooks、agents、自動メタ認知トリガーを含む完全機能
- **Skills-only モード**：skills をサポートする任意のコーディングエージェントで動作（Claude Code、Vercel AI など）

---

### ローカル Runtime インストール（Codex + Claude Code）

ローカル hook と実行可能なルーティングコマンドを使いたい場合に推奨します。インストーラは Node でファイル配置を行い、Rust-native CLI、runtime データ、単一トップレベル skill、hook を構築/コピーします。`~/.local/bin/rust-skills` には、インストール済み runtime CLI へ転送する軽量 shim を配置します。

ソースからインストールする場合の前提：

- `install.js` と hook 実行用の Node.js。
- 事前ビルド済み binary がない場合、native `rust-skills` CLI を構築するための Rust/Cargo。

Runtime hook は 2 段階のトリガーガードを使います：

1. 低コストの hook matcher は、ルーターを実行する候補かどうかだけを判断します。
2. `route --json` が `should_inject: true` を返した場合にだけ、Rust コンテキストを注入します。

これにより、`cargo`、`ownership`、`lifetime`、`Rocket`、`Tower`、`unsafe` などの曖昧な語を含む非 Rust 作業を静かに扱えます。

```bash
git clone https://github.com/actionbook/rust-skills.git
cd rust-skills
node install.js --codex --claude

rust-skills route --json "Rust E0382 value moved in axum state"
```

インストールされる内容：

- `~/.codex/skills/rust-skills/SKILL.md` および/または `~/.claude/skills/rust-skills/SKILL.md`
- 深い skill データ：`~/.codex/rust-skills/` および/または `~/.claude/rust-skills/`
- Hook スクリプト：`~/.codex/hooks/` および/または `~/.claude/hooks/`
- Rust-native Runtime CLI：`~/.codex/bin/` および/または `~/.claude/bin/`
- 任意の PATH shim：`~/.local/bin/rust-skills`

インストーラはグローバル `AGENTS.md`、Claude `agents/`、Claude `commands/` を上書きしません。古いトップレベル deep skills をバックアップへ移動するのは、`--prune-legacy-top-level-skills` を明示した場合のみです。

Codex インストールでは現在の feature flag 形式を使用します：

```toml
[features]
hooks = true
```

インストール時に非推奨の `[features].codex_hooks` が存在すれば削除します。

ローカル検証：

```bash
npm test
rust-skills verify --json
rust-skills detect --json "今天天気怎么样"
rust-skills route --json "Rust Web API Rc cannot be sent between threads"
```

---

### Skills-only インストール（推奨）

最もシンプルな方法。Claude Code、[Vercel `add-skills`](https://github.com/nicepkg/add-skills) など、**skills をサポートする任意のコーディングエージェント**で動作します。

Skills には**インラインフォールバックロジック**が組み込まれており、エージェントファイルが利用できない場合、組み込みツール（actionbook、agent-browser、WebFetch）を使用して直接実行します。

#### 方法 A：NPX（最も簡単）

```bash
npx skills add actionbook/rust-skills
```

#### 方法 B：CoWork CLI

[CoWork](https://crates.io/crates/cowork)（Rust ベースの skills 管理ツール）を使用してインストール：

```bash
# CoWork をインストール
cargo install cowork

# 方法 1：直接インストール
cowork install actionbook/rust-skills

# 方法 2：設定ファイルベースのインストール（チーム向け推奨）
cowork config init                    # .cowork/Skills.toml を作成
# Skills.toml を編集して rust-skills を追加（下記参照）
cowork config install                 # 設定された全 skills をインストール
```

**Skills.toml 設定例：**

```toml
[project]
name = "my-rust-project"

[skills.install]
rust-skills = "actionbook/rust-skills"

[security]
trusted_authors = ["ZhangHanDong"]
```

> CoWork（短縮形 `co`）はバージョン管理、依存関係解決、lock ファイル、セキュリティ監査を提供します。詳細は [CoWork ドキュメント](https://crates.io/crates/cowork) を参照してください。

#### 方法 C：手動コピー

```bash
git clone https://github.com/actionbook/rust-skills.git
cp -r rust-skills/skills/* ~/.claude/skills/
```

> **注意**：Skills-only モードには hooks が含まれないため、メタ認知は自動トリガーされません。`/rust-router` または特定の skills を手動で呼び出せます。バックグラウンドエージェントは自動的にインライン実行にフォールバックします。

---

### Claude Code Plugin インストール（完全機能）

hooks、バックグラウンドエージェント、自動メタ認知トリガーを含む完全な体験を求める **Claude Code ユーザー**向け。

#### 方法 A：Marketplace

```bash
# ステップ 1: marketplace を追加
/plugin marketplace add actionbook/rust-skills

# ステップ 2: プラグインをインストール
/plugin install rust-skills@rust-skills
```

> **注意**：ステップ 1 は marketplace（プラグインソース）を追加するだけです。ステップ 2 で実際に rust-skills プラグインをインストールし、すべての機能を有効にします。

#### 方法 B：完全プラグイン（ローカル）

```bash
# リポジトリをクローン
git clone https://github.com/actionbook/rust-skills.git

# プラグインディレクトリで起動
claude --plugin-dir /path/to/rust-skills
```

---

### 機能比較

| 機能 | ローカル Runtime | Plugin（Marketplace） | Plugin（ローカル） | Skills-only（NPX/CoWork/手動） |
|------|------------------|---------------------|-------------------|-------------------------------|
| 全 Skills | ✅ | ✅ | ✅ | ✅ |
| 単一トップレベル skill | ✅ | ✅ | ✅ | ❌ |
| ローカル `rust-skills` CLI | ✅ | ❌ | ✅ | ❌ |
| 自動メタ認知トリガー | ✅ | ✅ | ✅ | ❌（手動呼び出し） |
| Hook ルーティング | ✅ | ✅ | ✅ | ❌ |
| バックグラウンドエージェント | ✅ | ✅ | ✅ | ✅（インラインフォールバック） |
| ソース runtime インストールに Rust/Cargo が必要 | 事前ビルド済み binary がない場合は必要 | ❌ | native CLI をローカル構築する場合は必要 | ❌ |
| Codex 対応 | ✅ | ❌ | ❌ | ✅ |

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

## 依存 Skills

Rust Skills は完全な機能のために以下の外部ツールに依存しています：

| ツール | 説明 | GitHub |
|--------|------|--------|
| **actionbook** | ウェブサイトアクションマニュアル用 MCP サーバー。エージェントが構造化されたウェブコンテンツ（Rust リリース、crate 情報、ドキュメント）を取得するために使用。 | [actionbook/actionbook](https://github.com/actionbook/actionbook) |
| **agent-browser** | リアルタイムウェブデータ取得のためのブラウザ自動化ツール。actionbook が利用できない場合のフォールバック。 | [vercel-labs/agent-browser](https://github.com/vercel-labs/agent-browser) |

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
│  低コストの候補トリガー                  │
│  CLI が should_inject を確認してから読込 │
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

## 謝辞

- [@pinghe](https://github.com/pinghe) - `context: fork` サポートの提案 ([#4](https://github.com/actionbook/rust-skills/issues/4))
- [@DoiiarX](https://github.com/DoiiarX) - OpenCode インストール修正 ([#6](https://github.com/actionbook/rust-skills/issues/6))

## ライセンス

MIT ライセンス - 詳細は [LICENSE](LICENSE) を参照

## リンク

- **GitHub**: https://github.com/actionbook/rust-skills
- **Issues**: https://github.com/actionbook/rust-skills/issues
