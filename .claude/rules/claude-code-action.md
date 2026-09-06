---
description: GitHub 経由で Claude Code Action を使う際のセットアップ・運用ルール
paths:
  - .github/workflows/claude*.yml
---

# Claude Code Action 運用ガイド

[`anthropics/claude-code-action@v1`](https://github.com/anthropics/claude-code-action) を使った 2 ファイルのワークフローを同梱。本テンプレートを複製した案件でも同じ手順で導入できる。

| ファイル | 役割 |
|---|---|
| [`.github/workflows/claude.yml`](../../.github/workflows/claude.yml) | `@claude` メンションで Claude を起動 |
| [`.github/workflows/claude-code-review.yml`](../../.github/workflows/claude-code-review.yml) | PR 作成・更新時に自動レビュー |

## 事前準備

リポジトリ管理者が 3 ステップで実施する。

### 1. Claude GitHub App をインストール

[github.com/apps/claude](https://github.com/apps/claude) で `Install`。**個人アカウント** + **`Only select repositories`** で対象リポジトリのみを選択するのが推奨（権限過剰を避ける）。

すでに別リポジトリに入れている場合は [Installed GitHub Apps](https://github.com/settings/installations) → `Claude` → `Configure` で対象を追加するだけ。

### 2. OAuth トークンを取得

ローカルで `claude setup-token` を実行 → ブラウザで承認 → ターミナルでトークン文字列（`sk-ant-oat01-...`）が表示される。

> **要件**: Claude Pro / Max サブスクリプション必須。
> **チーム開発の場合**: 個人サブスクリプションの利用枠を共有することになるため、API キー（`anthropic_api_key` 入力）への切替を検討する。Anthropic Console で組織のキーを発行し、`CLAUDE_CODE_OAUTH_TOKEN` の代わりに `ANTHROPIC_API_KEY` を Secrets に登録するだけで切り替え可能。

### 3. GitHub Secrets に登録

```bash
gh secret set CLAUDE_CODE_OAUTH_TOKEN --repo <owner>/<repo>
```

`gh` の権限不足エラーが出たら `gh auth refresh -h github.com -s repo,workflow` で `workflow` スコープを追加してから再試行。

## 使い方

### `@claude` メンション

Issue 本文 / タイトル / Issue コメント / PR コメント / PR レビューコメントのいずれかに `@claude` を含めると起動する。

```markdown
@claude README.md の最後に「動作確認済み」を 1 行追加する PR を作ってください
```

→ Claude が `develop` をベースとした PR を自動作成（[`base_branch: develop`](../../.github/workflows/claude.yml) 設定済み）。

**起動可能なユーザー**: `claude-code-action` のデフォルト挙動でリポジトリの **write 権限を持つユーザーのみ**。外部ユーザーは自動で弾かれる。

### PR レビュー

PR 作成・更新時に `claude-code-review.yml` が自動起動し、レビュー結果を投稿する。

- `approve` は人間が GUI から行う運用
- ローカルで人が走らせる場合は `/review-pr` スキル（[`.claude/skills/review-pr/`](../skills/review-pr/SKILL.md)）を使う。CI とローカルでレビュー観点・テンプレートが異なる点に注意

## サブスクリプション利用枠

- 単発の `@claude` 応答 / 小さな PR レビュー: 数メッセージ程度（Pro 枠なら通常問題ない）
- 大きな実装タスク: 数十メッセージ規模に達することがある
- 自動停止・スロットリングは未実装。動作確認は最小限のタスクから始める

## テンプレート複製先での導入手順

1. テンプレートを複製
2. 新リポジトリに **Claude GitHub App** を追加（`Configure` から）
3. **`CLAUDE_CODE_OAUTH_TOKEN`** を Secrets に登録（既存トークンの使い回し可）
4. **`base_branch`** が運用に合っているか確認（本テンプレは `develop`。`main` 運用なら [`claude.yml`](../../.github/workflows/claude.yml) を編集）
5. テスト Issue で `@claude` メンションして動作確認

ワークフローファイル自体は **そのまま流用** で動く設計（リポジトリ固有値はハードコードしていない）。
