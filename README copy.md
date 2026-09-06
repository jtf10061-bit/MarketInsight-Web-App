# Claude Code テンプレート

Claude Code をプロジェクトに導入するためのテンプレート素体。`.claude/` を移植先プロジェクトに配置し、`/manage-context` を実行することで CLAUDE.md と設計ドキュメント群が作成・更新される。

---

## 使い方

1. 本リポジトリの `.claude/` を移植先プロジェクト直下にコピー
2. 移植先で Claude Code を起動
3. `/manage-context` を実行 → リポ状態を検出し、以下 3 モードから推奨を提示
   - **モード 1（初期作成）**: コードなしの新規プロジェクトを対話で立ち上げる
   - **モード 2（既存リポスキャン）**: 既存コードをスキャンして CLAUDE.md と docs/ を一括生成
   - **モード 3（更新）**: 既存 docs/ を保持しつつ不足検出 + 差分提案

---

## /manage-context が生成するもの

### CLAUDE.md

プロジェクトの「共通認識」として機能するファイル。Claude が毎セッション自動で読み込む。

| セクション | 内容 | なぜ必要か |
|-----------|------|----------|
| プロジェクト概要 | 目的・技術スタック | Claude がプロジェクトの文脈を把握するため |
| ビルド・テスト・デプロイ | 実行コマンド | Claude が正しいコマンドを使うため。推測させると間違える |
| ディレクトリ構成 | 各ディレクトリの役割 | ファイルの配置先を間違えないようにするため |
| コーディング規約 | チームが決めた規約 | Claude のデフォルトの書き方と異なる点だけ明示する |
| 注意点 | 落とし穴・例外 | Claude が一般的な判断で間違える箇所を補正する |
| 作業ルール | steering 運用ルール | 作業の進め方を統一し、Claude の振る舞いを一定にする |

**書かなくていいもの：** 「きれいなコードを書け」「テストを書け」等の一般的なベストプラクティス。Claude は既に知っている。

### docs/ 設計ドキュメント

プロジェクトの設計情報を記録する永続的なドキュメント群。TODO コメント付きのテンプレートとして配置される。

| ファイル | 何を書くか | Claude がどう使うか |
|---------|----------|-------------------|
| `product-requirements.md` | プロダクト要件（目的・ユーザー・機能・ユーザーストーリー・受け入れ条件・スコープ外） | スコープ判断・機能の要否判断 |
| `functional-design.md` | 機能設計（画面構成・API仕様・データモデル） | 画面・API・データ構造の正確な実装 |
| `architecture.md` | 技術仕様（システム構成図・スタック・通信方式・環境変数） | スタック選定・レイヤー構造の理解 |
| `repository-structure.md` | リポジトリ構成（ディレクトリツリー・配置ルール） | ファイル配置の判断 |
| `development-guidelines.md` | 開発ガイドライン（コーディング規約・命名規則・環境変数管理・セキュリティ） | コードスタイルの統一 |
| `testing-guidelines.md` | テストガイドライン（テスト方針・対象範囲・記述ルール） | テストコードの書き方 |
| `glossary.md` | 用語集（ドメイン用語・技術用語とコード命名の対応） | 変数名・クラス名の命名 |

### docs/.steering/

作業計画の保存先。CLAUDE.md の steering 運用ルールに従う。

### docs/solutions/

解決済みの問題・ナレッジの蓄積先。`_index.md` で一覧管理する。開発中に得た教訓・パターンもここに蓄積する。

**solutions/ と rules/ を混ぜてはいけない理由：** solutions の内容を CLAUDE.md や rules/ に書くと、Claude が過去の解決記録を「今守るべきルール」として扱ってしまう。solutions は「参照する知識」、rules は「従う制約」として分離する。

---

## 同梱スキル

| スキル | コマンド | 概要 |
|--------|---------|------|
| manage-context | `/manage-context` | CLAUDE.md + docs/ の作成・更新（初期作成 / 既存リポスキャン / 更新の 3 モード） |
| create-branch | `/create-branch` | Issue を選択してブランチ名を自動生成 |
| create-hotfix-branch | `/create-hotfix-branch` | 本番障害レベルの緊急対応で main からhotfix ブランチを作成 |
| create-issue | `/create-issue` | GitHub Issue 作成（大規模時は子 Issue に分割） |
| create-pr | `/create-pr` | 事前品質チェック付きで PR 作成 |
| create-steering | `/create-steering` | 作業計画 steering（requirements / design / tasks）を対話的に作成 |
| fix-review | `/fix-review` | PR レビュー指摘に一括対応 |
| record-solution | `/record-solution` | 解決済みの問題を `docs/solutions/` に記録（必要に応じて `.claude/rules/` にルール抽出） |
| review-pr | `/review-pr` | PR を観点別にレビューしコメント投稿 |

### /manage-context

CLAUDE.md と docs/ の作成・更新を 3 モードで提供する。起動時にリポ状態（既存 docs / 依存ファイル）を検出して推奨モードを提示する。

- **モード 1: 初期作成** — コードがない新規プロジェクトを対話で立ち上げる。概要を 1 問だけ聞き、残り項目は推測 → 一括確認 → サブエージェント逐次起動で docs/ を順次生成
- **モード 2: 既存リポスキャン** — 既存コードをスキャンし、技術スタック・ビルドコマンド・ディレクトリ構成を自動検出して CLAUDE.md と docs/ を一括生成（`product-requirements.md` はコードから推定できないため TODO のまま）
- **モード 3: 更新** — 既存 docs/ を保持しつつ不足ファイル検出 + 既存ファイルの差分提案。非破壊的にユーザー承認後に反映

モード 1・2 は既存 CLAUDE.md / docs/ を上書きする可能性があるため、実行前に必ず確認を取る。

### /create-branch

Issue 番号・タイトルからブランチ名を自動生成する。Issue 番号をブランチ名に含める運用を確実にし、`/create-pr` での Issue 紐付け漏れを防ぐ。

### /create-hotfix-branch

本番障害レベルの緊急対応専用。`main` からhotfix ブランチを作成する。通常の `/create-branch` と異なり、Issue・steering 作成前に着手してよい例外フロー。

### /create-issue

GitHub Issue を作成する。大きなタスクは子 Issue への分割を提案し、Sub-issues API で親子関係を設定する。

### /create-pr

保護ブランチチェック・事前品質チェック（lint・型チェック等を自動検出）を行い、差分・コミット履歴・.steering から PR 本文を生成する。完了時に `/record-solution` で解決記録を残すべきか振り返りを行う。

### /create-steering

作業着手前の計画書（`docs/.steering/[YYYYMMDD]-[タイトル]/`）を対話的に作成する。設計判断の有無で軽量（`index.md` 1 ファイル）／通常（`requirements.md` + `design.md` + `tasks.md`）を判定する。

### /fix-review

PR のレビュー指摘を全件取得し、各指摘への対応方針をユーザーに確認してから順番にコード修正する。完了後に PR に対応サマリーコメントを投稿する。`/create-pr` 同様に完了時に解決記録の振り返りを行う。

### /record-solution

解決済みの問題を `docs/solutions/` に記録する。必要に応じて `.claude/rules/` に短いルールとして抽出する。

### /review-pr

PR を観点別（設計・実装・テスト・セキュリティ等）にレビューし、`.claude/skills/review-pr/references/` のテンプレートに従ってコメントを投稿する。

---

## 設定ファイル

### .claude/settings.json

Claude の動作を制御する設定ファイル。チームで共有する（git管理する）。

**deny リスト（テンプレートに含まれているもの）：**

| カテゴリ | ルール | 理由 |
|---------|--------|------|
| 秘密情報（ツール経由） | `Read/Edit/Write(**/.env, .env.local, .env.staging, .env.development, .env.production, *.pem, *.key, credentials.json, *secret*)` | Claude のツールで秘密情報を読ませない・書き換えさせない。`.env.example` は除外し読めるようにしている |
| 秘密情報（Bash経由） | `Bash(cat/head/tail/grep **/.env*, **/*.pem, **/*.key, **/credentials.json, **/*secret*)` | Read の deny だけでは Bash 経由のアクセスを防げないため、`cat` `head` `tail` `grep` をパターンごとに網羅 |
| システム認証情報 | `Read/Edit/Write(~/.ssh/**, ~/.aws/**)` + Bash 経由 deny | SSH鍵・AWSクレデンシャルへのアクセス・上書きを防ぐ |
| 破壊的Git操作 | `Bash(git push --force/--force-with-lease/-f *)`, `Bash(git reset --hard *)` | リモート履歴の破壊・未コミット変更の消失を防ぐ |
| ファイルシステム破壊 | `Bash(rm -rf /)`, `Bash(rm -rf ~)`, `Bash(rm -rf .)` | ファイルシステムの破壊を防ぐ |

**ask リスト（テンプレートに含まれているもの）：**

| ルール | 理由 |
|--------|------|
| `Edit/Write(.claude/settings.json)` | Claude が自分の権限設定を勝手に変更するのを防ぐ |
| `Edit/Write(.claude/settings.local.json)` | 同上 |

プロジェクトに応じて、クラウドリソースの作成・削除なども ask に追加する。

**allow リスト（プロジェクトごとに追加する）：**

テンプレートでは空。プロジェクトで使うコマンドを許可する。allow に追加しない場合、Claude はコマンド実行のたびにユーザーに確認を求める。

### .claude/skills/workflow-config.md / workflow-conventions.md / workflow-issues.md / workflow-playbooks.md

スキル群が参照する共通設定。役割別に 4 ファイルに分割している。

| ファイル | 内容 |
|---------|------|
| `workflow-config.md` | プロジェクト固有の設定値（デフォルトベースブランチ・保護ブランチ・レビュアー・GitHub 操作のツール選択） |
| `workflow-conventions.md` | Conventional Commits の type 規約・コミットメッセージ形式・PR タイトル形式 |
| `workflow-issues.md` | Issue タイトル規約・ラベル体系（area / priority / parent）・子 Issue 運用・Sub-issues API |
| `workflow-playbooks.md` | 解決記録の振り返り手順・目的別プレイブック（feat / fix / chore / docs / refactor） |

`development-guidelines.md` の Git 規約セクションはこれらのファイルへの参照のみ。

### .claude/rules/

ファイルパスに応じて自動で読み込まれるルール群。`paths:` 指定により必要なときだけ読み込まれる。

| ファイル | 発火条件 | 内容 |
|---------|---------|------|
| `.steering.md` | `docs/.steering/**` 操作時 | 作業計画ディレクトリの命名規則と 3 ファイル構成 |
| `claude-code-action.md` | 該当時 | GitHub 経由 `@claude` メンション連携の運用・トラブルシュート |
| `diagrams.md` | `docs/**` 操作時 | 図表の記載場所・記述形式（Mermaid 推奨） |
| `docs-content.md` | `docs/**` 操作時 | 各ドキュメントの役割・記載内容の対応表 |
| `docs-style.md` | `docs/**` 操作時 | docs/ の書式ルール（図記法・リンク・章番号・TODO 表記） |
| `restricted-files.md` | 該当時 | `.env` / 秘密鍵 / `credentials.json` / `*secret*` などアクセス制約のあるファイルの取り扱い |

### .claude/agents/

タスク単位で起動するサブエージェント定義。

| エージェント | 用途 |
|------------|------|
| `tech-researcher` | クラウド価格・LLM モデル可用性・採用比較などの外部 Web 調査をサブエージェント隔離で実行 |
| `test-engineer` | 実装直後に pytest / ruff を走らせ、失敗時は修正提案を要約して返す |

---

