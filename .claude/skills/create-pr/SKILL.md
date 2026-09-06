---
name: create-pr
description: ドラフト PR を ready に昇格させる（既存 draft あり）、または新規 PR を作成する（既存 draft なし）。事前品質チェック・構造化 PR 本文付き。
disable-model-invocation: true
argument-hint: '[--base <ブランチ>] [--draft]'
---

# PR 作成スキル

ブランチに対応する既存 draft PR があれば **ready に昇格**（本文を実装サマリで全置換）、なければ **新規 PR を作成** する。事前品質チェック・構造化された PR 本文を生成する。

`/create-steering` で steering ファイル承認時に draft PR が作成される運用と組み合わせて使う想定。

**重要**: まず以下 4 ファイルをすべて読み込むこと。
- `.claude/skills/workflow-config.md`（ブランチ戦略・PR 設定）
- `.claude/skills/workflow-conventions.md`（コミットメッセージ・PR タイトル規約）
- `.claude/skills/workflow-issues.md`（完了条件の更新手順）
- `.claude/skills/workflow-playbooks.md`（解決記録の振り返り・PR 本文の推奨セクション）

## 引数の解析

`$ARGUMENTS` からオプションを取得する。

- `--base <ブランチ>`: ベースブランチ（未指定の場合は `workflow-config.md` のデフォルトベースブランチを使用）
- `--draft`: ドラフト PR として作成

## 現在の状態

- 現在のブランチ: !`git branch --show-current`
- Git ステータス: !`git status --short`
- 既存の .steering: !`ls docs/.steering/ 2>/dev/null || echo "なし"`

## ワークフロー

### ステップ 1: 安全性チェック & 既存 PR の検出

1. 現在のブランチが保護ブランチ（`workflow-config.md` の「ブランチ戦略」に記載）でないことを確認する
   - 保護ブランチ上の場合はエラーを報告して停止する
2. ベースブランチに対してコミットが存在することを確認する
3. 未コミットの変更がないことを確認する
   - ある場合はユーザーに警告する
4. **同ブランチからの既存 open PR を検出する**:
   ```bash
   gh pr list --head $(git branch --show-current) --state open --json number,isDraft,title,body
   ```
   結果に応じてモードを決定:
   - **draft あり** → **ready 昇格モード**（本文を実装サマリで全置換し ready に昇格）
   - **ready 既存 PR あり** → 警告のみ・新規作成しない（重複防止）。ユーザーに既存 PR を案内して停止
   - **PR なし** → **新規作成モード**（従来挙動）

### ステップ 2: 事前品質チェック

CLAUDE.md の「ビルド・テスト・デプロイ」セクションに記載されたコマンド（lint・型チェック・テスト等）を実行する。

チェックが失敗した場合はエラー内容を報告し、修正してから PR 作成するか続行するかユーザーに確認する。

### ステップ 3: PR 情報の収集

1. `git diff <base>..HEAD` で変更内容を把握する
2. `git log --oneline <base>..HEAD` でコミット一覧を取得する
3. `docs/.steering/` 配下に関連する steering があれば参照する
4. ブランチ名から Issue 番号を抽出する（例: `feat/9-xxx` → `#9`）
5. diff から docs / CLAUDE.md 更新の要否を点検する。各 docs の役割は [`.claude/rules/docs-content.md`](../../rules/docs-content.md) を参照し、変更領域に対応する doc・`CLAUDE.md`（ディレクトリ構成図 / 進捗表）が更新されているか照合する。未更新の該当箇所があればユーザーに「更新するか / 対象外か」を確認する。

### ステップ 4: PR タイトルと本文の生成

#### タイトル形式（Conventional Commits 準拠）

`<type>: <簡潔な説明>` の形式でタイトルを生成する。type の一覧と用途は
[`workflow-conventions.md`](../workflow-conventions.md) の「Type 規約 / PR タイトル形式」を参照。

**例**:
- `feat: search_opportunities ツールを追加`
- `fix: SSE 切断時のリトライ処理を修正`
- `refactor: orchestrator の履歴管理をヘルパー関数に抽出`
- `docs: agent-design.md にツール追加チェックリストを追加`
- `hotfix: CSV エンコーディング修正`

不明な場合は最初のコミットメッセージを使う。複数の変更が混在する PR は **可能なら分割を推奨**、難しければ最も大きな変更の type を選ぶ。

#### 本文形式

[`references/pull_request_template.md`](references/pull_request_template.md) を使う。playbook ごとの推奨セクションは `workflow-playbooks.md` の各 playbook の「**PR 本文に推奨のセクション**」を参照。現在ブランチが `hotfix/` で始まる場合は代わりに [`references/hotfix_pull_request_template.md`](references/hotfix_pull_request_template.md) を使う。

### ステップ 5: ユーザー確認

生成した PR タイトルと本文をユーザーに提示し、モードに応じた確認を取る:

**ready 昇格モード**:
- タイトル・本文の修正が必要か
- 既存 draft の本文を **全置換** してよいか
- ready 昇格してよいか

**新規作成モード**:
- タイトル・本文の修正が必要か
- ドラフト PR にするか（`--draft` 指定時のみ）
- ベースブランチは正しいか

### ステップ 6: プッシュと PR 作成 / 昇格

#### ready 昇格モード

```bash
git push origin <現在のブランチ>
gh pr edit <PR番号> --title "<タイトル>" --body "<本文>"
gh pr ready <PR番号>
```

`gh pr ready` で draft 状態を解除する。

#### 新規作成モード（従来挙動）

```bash
git push -u origin <現在のブランチ>
gh pr create --title "<タイトル>" --body "<本文>" --base <ベースブランチ> --assignee @me
```

`--draft` 指定時は `gh pr create --draft ...` を実行する。

### ステップ 7: 関連 Issue の完了条件を更新

PR 本文に「Closes #N」がある場合、`workflow-issues.md` の **「完了条件の更新手順」** に従って Issue を更新する。

レビュー対応で達成状況が変わる場合は `/fix-review` で再更新する。

### ステップ 8: 解決記録の振り返り

[`workflow-playbooks.md`](../workflow-playbooks.md) の **「解決記録の振り返り」** セクションに従って実行する。

### ステップ 9: 完了報告

- PR URL・番号
- ベースブランチ
- 含まれるコミット数・変更ファイル数
- 更新した Issue（該当する場合）

## 注意事項

- 既存 draft PR がある場合は **ready 昇格モード** で本文を全置換する（`/create-steering` が作った draft 本文は短命の前提）
- 既存 ready PR がある場合は新規作成せず警告のみで停止する（重複防止）
- フォースプッシュは絶対に行わない
- PR 本文にセキュリティ上の機密情報が含まれないよう注意する
