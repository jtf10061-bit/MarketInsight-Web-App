---
name: manage-context
description: CLAUDE.md と docs/ を作成・更新する。初期作成（コードなし対話起点）/ 既存リポ読み取り作成 / 更新（不足検出 + 既存 doc 差分提案）の 3 モードを持つ。
disable-model-invocation: true
---

# プロジェクトコンテキスト管理スキル

CLAUDE.md と `docs/` 配下の設計ドキュメント群を **作成・更新** する。3 モードを単一エントリで提供する：

| モード | 用途 |
|---|---|
| 1. 初期作成 | コードがまだない新規プロジェクトを対話で立ち上げる |
| 2. 既存リポ読み取り作成 | テンプレ移植直後、既存コードをスキャンして CLAUDE.md と docs/ を一括生成 |
| 3. 更新 | 必須 doc の存在判定で候補を提示し、不足ファイル新規作成 or 既存ファイル差分提案を自動分岐 |

**前提**: `.claude/`（agents / rules / skills / settings.json）は本テンプレリポから単純コピーで持ち込まれている前提。本スキルの責務は **CLAUDE.md と docs/ の作成・更新のみ** で、`.claude/` 配下の配布・`.claude/skills/workflow-config.md` の設定は責務外。

**書式準拠**: 生成・更新される CLAUDE.md と docs/ は [`.claude/rules/docs-style.md`](../../rules/docs-style.md) の書式統一ルール（図記法・リンク・章番号・コード長・TODO 表記等）に準拠する。

## 現在の状態

- リポジトリルート: !`pwd`
- 既存の CLAUDE.md: !`ls CLAUDE.md 2>/dev/null || echo "なし"`
- 既存の docs/: !`ls -d docs/ 2>/dev/null || echo "なし"`
- docs/ 配下の主要ファイル: !`ls docs/*.md 2>/dev/null || echo "なし"`
- 依存ファイル: !`ls package.json pyproject.toml go.mod Cargo.toml pom.xml build.gradle Gemfile composer.json 2>/dev/null || echo "なし"`

## ワークフロー

### ステップ 1: リポ状態検出 → デフォルトモード提案

「現在の状態」の出力から、以下の表に基づいてデフォルトモードを決定する：

| `docs/` 配下の主要ファイル | 依存ファイル | デフォルトモード |
|---|---|---|
| なし | なし | **モード 1（初期作成）** |
| なし | あり | **モード 2（既存リポ読み取り作成）** |
| 一部 or 全部存在 | 問わず | **モード 3（更新）** |

ユーザーに以下の形式で提示する：

```
[manage-context] リポ状態を検出しました:
  - docs/ 配下の主要ファイル: <検出結果>
  - 依存ファイル: <検出結果>

推奨モード: <番号>. <モード名>

このまま進めます。別のモードを使う場合は番号を入力してください:
  1. 初期作成（CLAUDE.md と docs/ を全て新規作成。既存ファイルは上書き）
  2. 既存リポから生成（リポをスキャンして CLAUDE.md と docs/ を全て新規作成。既存ファイルは上書き）
  3. 更新（既存 docs/ を保持しつつ、乖離候補をスキャンして選択的に更新）

→ (Enter / yes / 推奨モードの番号 でそのまま続行 / 他の番号で切り替え)
```

ユーザーが回答。Enter / yes / 推奨と同じ番号なら推奨モードを採用する。他の番号なら指定モードに切り替える。

### ステップ 2: 上書き確認（モード 1・2 のみ）

モード 1 または 2 を選んだ場合、既存の CLAUDE.md / docs/ 配下の主要ファイルを **上書きする可能性がある** ため、必ず確認を取る：

```
モード <番号> は既存の CLAUDE.md と docs/ を上書きします。
  - 上書き対象: <ファイル一覧>
  - 保護される: docs/.steering/ / docs/solutions/

続行しますか？ (yes / no)
```

`no` または曖昧な回答なら **スキル終了**。`yes` の場合のみ次へ進む。

### ステップ 3: 対応する reference を Read

選択されたモードに応じて、以下のいずれかを Read で読み込む：

| モード | Read 対象 |
|---|---|
| 1. 初期作成 | [`references/mode-init.md`](references/mode-init.md) |
| 2. 既存リポ読み取り作成 | [`references/mode-scan.md`](references/mode-scan.md) |
| 3. 更新 | [`references/mode-update.md`](references/mode-update.md) |

以降は Read した reference の指示に従って実行する。

## 注意事項

- このスキルは `disable-model-invocation: true` のため auto-invoke しない。ユーザーが明示的に `/manage-context` で呼び出す前提
- 発動タイミングはユーザー判断（任意のタイミング）。自動発動のフック（`create-pr` 連携等）は別作業
- モード 1・2 は **既存ファイル上書き** の可能性がある破壊的操作。必ず確認を取る
- モード 3 は **既存ファイルを保持** しつつ差分提案する非破壊的操作（ユーザー承認後に反映）
- `.claude/skills/workflow-config.md` の設定（デフォルトベースブランチ等）は本スキルの責務外
- `.claude/agents/`, `.claude/rules/`, `.claude/skills/`（manage-context 以外）は本スキルで配布しない（責務分離）
