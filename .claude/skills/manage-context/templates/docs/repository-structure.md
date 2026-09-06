# リポジトリ構造定義書

`{プロジェクト名}` のディレクトリ構成と「どこに何を置くか」のルール。新しいファイルを追加する時はまず本ドキュメントを確認し、配置先を決める。

> **本テンプレの想定**: AI エージェント Web アプリ。ディレクトリ構成（`backend/` `frontend/` `infra/` 等）は採用言語・フレームワークで命名が変わる場合がある。本ファイル中の `{...}` プレースホルダと例示は移植先で実体に合わせて置換する。

---

## 1. 全体構成

```
{プロジェクト名}/
├── .claude/                    # Claude Code 設定（rules / skills / templates / agents / settings）
├── .github/                    # GitHub 関連（workflows / dependabot.yml 等）
├── backend/                    # バックエンド（API サービス）
├── frontend/                   # フロントエンド
├── infra/                      # IaC（Terraform 等）
├── docs/                       # 永続的設計ドキュメント
│   ├── product-requirements.md
│   ├── functional-design.md
│   ├── agent-design.md         # エージェント機能を使わない場合は冒頭 callout に `status: not-applicable` を記載
│   ├── architecture.md
│   ├── repository-structure.md
│   ├── development-guidelines.md
│   ├── testing-guidelines.md
│   ├── glossary.md
│   ├── .steering/              # 作業計画（YYYYMMDD-タイトル/ ごとにディレクトリ）
│   └── solutions/              # 解決済み問題のナレッジ
├── docker-compose.yml          # ローカル開発用
├── .env.example                # 環境変数テンプレ（git 管理）
├── .pre-commit-config.yaml     # pre-commit フック設定
├── CLAUDE.md                   # Claude Code 向けプロジェクト指示書
└── README.md                   # 案件向けの利用手順
```

### 全体の配置原則

- **新しいトップレベルディレクトリを増やさない**: `backend/` `frontend/` `infra/` `docs/` `.claude/` `.github/` 以外は原則作らない
- **ドキュメントは `docs/` に集約**: 8 ファイル（エージェント機能を使わない場合は 7 ファイル）+ `.steering/` + `solutions/`。新規ドキュメントは増やさず、既存ファイルのいずれかに追記する
- **「本当に必要か」を問う**: テンプレ複製先でファイルが 1 つ増えると複製先も増える

---

## 2. バックエンド（`backend/`）

> **未確定**: 該当しないプロジェクト（フロントのみ等）はセクションごと削除する。

```
{backend ルート}/
├── {app ルート}/               # アプリケーションコード（例: app/ / src/ / cmd/）
│   ├── main.{言語拡張子}       # エントリポイント、初期化順序の集約
│   ├── api/                    # ルーター（HTTP / SSE エンドポイント）
│   │   └── routes/
│   ├── agent/                  # エージェント実装（ReAct ループ・ツール）
│   │   ├── orchestrator.{言語拡張子}
│   │   ├── events.{言語拡張子}
│   │   ├── prompts.{言語拡張子}
│   │   └── tools/              # 個別ツール + レジストリ
│   ├── core/                   # 横断的関心事（設定・ロガー・OTel・auth・例外）
│   ├── llm/                    # LLM 呼び出し抽象化
│   └── repositories/           # データ層
├── data/                       # サンプルデータ
├── prompts/                    # プロンプトファイル
├── tests/                      # 単体・結合テスト
│   ├── conftest.{言語拡張子}（または setup ファイル）
│   ├── test_*.{言語拡張子}
│   └── integration/
└── evaluations/                # 評価データセット・スクリプト
```

### 配置ルール

| ディレクトリ | 置くもの | 置かないもの |
|---|---|---|
| `app/api/` | ルーター（エンドポイント定義） | ビジネスロジック・LLM 呼び出し本体 |
| `app/agent/` | エージェントオーケストレーション・ツール実装・プロンプト読み込み | HTTP / API 層の関心事 |
| `app/core/` | 全レイヤー共通の基盤（設定・ロガー・OTel・認証・例外階層） | ドメイン固有のロジック |
| `app/llm/` | LLM プロバイダ抽象化 | プロンプト本体・エージェントロジック |
| `app/repositories/` | データソース抽象化と各実装 | ビジネスロジック・LLM 呼び出し |
| `data/` | テンプレ同梱のサンプルデータ | 案件ごとに変動する大量データ・センシティブデータ |
| `prompts/` | プロンプトテンプレ | 動的生成ロジック |
| `tests/` | テスト（単体・結合） | 評価データセット |
| `evaluations/` | 評価データセット・スコアリングスクリプト | 通常の自動テスト |

### レイヤー間の依存方向

`api → agent → repositories` は単方向。`core` は全レイヤーから参照可能。逆方向の依存（例: `core` から `api` を import）は禁止。詳細は [`architecture.md` §4.1](architecture.md#41-バックエンドのレイヤ構造) 参照。

### AI エージェント関連配置ルール

> **未確定**: エージェント機能を使わないプロジェクトは本サブセクションごと削除する。

| ディレクトリ | 置くもの | 例 |
|---|---|---|
| `prompts/` | システムプロンプト・Few-shot 例 | `system.md`, `few_shot/` |
| `{app ルート}/agent/tools/` | エージェントが呼ぶツール（1 ファイル 1 ツール） | `search_items.{言語拡張子}` |
| `{app ルート}/agent/` | Orchestrator / events / state | `orchestrator.{言語拡張子}`, `events.{言語拡張子}` |
| `evaluations/` | 評価データセット・評価コード | `datasets/`, `test_*.{言語拡張子}` |

---

## 3. フロントエンド（`frontend/`）

> **未確定**: 該当しないプロジェクト（バックエンドのみ等）はセクションごと削除する。

```
{frontend ルート}/
├── src/
│   ├── main.{言語拡張子}       # エントリ
│   ├── App.{言語拡張子}        # ルート定義
│   ├── components/             # 共有コンポーネント
│   │   └── ui/                 # {UI コンポーネントライブラリ}（コピペ型の場合のコピー先、案件側で直接編集可）
│   ├── features/               # 機能単位（feature-based）
│   │   └── chat/
│   │       ├── api/
│   │       ├── components/
│   │       ├── hooks/
│   │       ├── reducer.{言語拡張子}
│   │       └── types.{言語拡張子}
│   ├── lib/                    # 横断ユーティリティ
│   ├── providers/              # アプリ全体の Provider
│   ├── routes/                 # Route 単位コンポーネント（薄い）
│   ├── styles/                 # globals.css
│   └── test/                   # テスト setup
├── public/
├── package.json
└── {ビルド設定}                # 例: vite.config.ts / next.config.js
```

### 配置ルール

| ディレクトリ | 置くもの | 置かないもの |
|---|---|---|
| `src/components/` | features 横断で使う UI | 機能特化ロジック（→ `features/<name>/components/`） |
| `src/components/ui/` | `{UI コンポーネントライブラリ}` のコピー（コピペ型の場合、案件側で編集可） | 手書きの汎用コンポーネント |
| `src/features/<name>/` | 1 機能を構成する全レイヤー | 他 feature が使う共有コード |
| `src/lib/` | フレームワーク非依存の純粋ユーティリティ | UI コンポーネント |
| `src/providers/` | アプリ全体に effect を持つ Provider | 単一機能内の Provider |
| `src/routes/` | Route 単位の薄いラップ（中身は features を呼ぶだけ） | ビジネスロジック・データ取得本体 |
| `src/styles/` | グローバル CSS | コンポーネント単位のスタイル |
| `src/test/` | テスト setup | テストファイル本体（→ co-located） |

### import 規約

- **`@/` alias 必須**: 相対パス `../../` を避ける
- **features 間 import 禁止**: 共有が必要なら `src/lib/` か `src/components/` に切り出す
- **barrel `index.ts` 不採用**: 各ファイルから直接 import

---

## 4. インフラ（`infra/`）

> **未確定**: 該当しないプロジェクトはセクションごと削除する。

```
infra/
└── {azure/}                    # IaC（クラウドごとにディレクトリ分割）
```

複数クラウド対応の場合は `infra/aws/` `infra/gcp/` 等を併存させる。

---

## 5. CI/CD（`.github/`）

```
.github/
├── workflows/                  # GitHub Actions
│   ├── ci.yml                  # lint / 型チェック / テスト
│   ├── deploy-backend.yml
│   └── deploy-frontend.yml
└── dependabot.yml              # 依存パッケージの自動更新
```

---

## 6. ドキュメント（`docs/`）

ファイル一覧は §1 の全体構成を参照。各ファイルの **役割** は [`.claude/rules/docs-content.md`](../.claude/rules/docs-content.md)、書式ルールは [`.claude/rules/docs-style.md`](../.claude/rules/docs-style.md) に従う。本セクションでは `.steering/` と `solutions/` の運用のみ扱う。

### `.steering/` の運用

- 1 作業 = 1 ディレクトリ（例: `20260101-add-search-filter/`）
- 設計判断あり = `requirements.md` + `design.md` + `tasks.md`（通常 steering）
- 設計判断なし = `index.md` 1 ファイル（軽量 steering）
- 詳細は [`.claude/rules/.steering.md`](../.claude/rules/.steering.md)

### `solutions/` の運用

実装中に発生した問題と解決方法を `[テーマ].md` で蓄積。後続案件で同じ問題に再遭遇した時に最初に読む場所。
