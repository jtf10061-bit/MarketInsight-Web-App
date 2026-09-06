---
name: create-issue
description: |
  GitHub Issue を新規作成するスキル。大きなタスクは子 Issue に分割して作成する。

  起動する: 「Issue 立てて」「Issue 作成して」「これを Issue 化したい」「新しい機能 X の Issue を作って」等、ユーザーが新規 Issue 作成の意図を明示した時のみ。
  起動しない: 既存 Issue の検索・閲覧・更新、Issue 規約に関する質問、「Issue とは何か」の説明依頼。
argument-hint: '<タイトルまたは説明> [--parent <Issue番号>]'
---

# Issue 作成スキル

GitHub Issue を作成する。大きなタスクの場合は子 Issue に分割して作成する。

**重要**: まず `.claude/skills/workflow-config.md` と `.claude/skills/workflow-issues.md` を読み込み、共通設定および Issue 規約を取得すること。

## 引数の解析

`$ARGUMENTS` からオプションを取得する。

- タイトルまたは説明テキスト（必須）
- `--parent <Issue番号>`: 親 Issue の番号（子 Issue として作成する場合）

## 現在の状態

- 現在のブランチ: !`git branch --show-current`
- 既存の .steering: !`ls docs/.steering/ 2>/dev/null || echo "なし"`

## ワークフロー

### ステップ 1: 情報収集

1. `$ARGUMENTS` からタイトルとオプションを解析する
   - タイトルが未指定の場合はユーザーに入力を求める
2. 既存の Issue と重複がないか確認する:
   ```bash
   gh issue list --state open --json number,title --limit 50
   ```
   - 類似タイトルの Issue が見つかった場合は警告し、続行するか確認する
3. `--parent` が指定されている場合、親 Issue の存在を確認する
4. `docs/.steering/` 配下に関連する steering があれば参照する

### ステップ 2: Issue 本文の生成

[`references/issue_template.md`](references/issue_template.md) のテンプレートに従って本文を生成する。各セクションはステップ 1 で集めた情報をもとに埋める。

### ステップ 3: 規模評価と分割提案

`workflow-issues.md` の **「子 Issue の運用」** に記載された分割条件に該当する場合、子 Issue への分割を提案する。

分割する場合:
- 推奨する分割案（3〜7 件の子 Issue タイトル）を提示する
- ユーザーの承認を得てから分割モードで作成する

### ステップ 4: ラベル決定

ラベル軸の定義と付与フローは `workflow-issues.md` の **「ラベル体系」** および **「ラベル付与の運用フロー」** を参照する。本ステップで必要な自動化コマンド：

#### 親 Issue（Epic）作成時

`epic` ラベル + `area:` ラベルを 1〜複数付ける（`parent:` は付けない）。新規 Epic の場合は `parent:<新番号>-<短縮名>` ラベルを発行する旨をユーザーに通知。

#### 子 Issue 作成時

`--parent <番号>` 指定時、親 Issue から `area:` と `parent:` ラベルを取得して初期候補とする：

```bash
# 親の area: ラベル一覧を取得（子の初期候補にする）
gh issue view <親番号> --json labels --jq '[.labels[] | select(.name | startswith("area:")) | .name] | join(",")'

# 親に紐付く parent: ラベル名を取得（子に付与する）
gh label list --search "parent:<親番号>-" --json name --jq '.[0].name'
```

ユーザーに「子の作業範囲は親と同じか／異なる／追加領域か」を確認し、最終的な `area:` を決定する。`priority:` は任意（必要なら確認）。

### ステップ 5: ユーザー確認

以下を一覧表示し、ユーザーの承認を得る:
- タイトル
- 本文
- 親 Issue（該当時）
- 付与予定ラベル（`epic` / `area:` / `parent:` / `priority:`）
- 子 Issue 計画（分割時）

### ステップ 6: Issue 作成

```bash
gh issue create --title "タイトル" --body "本文" --label "area:agent,parent:27-claude-tooling"
```

子 Issue として作成する場合は親子関係を設定する。コマンドは `workflow-issues.md` の **「Sub-issues API の使い方」** を参照。

分割モードの場合：
1. 親 Epic を先に作成（`epic` + `area:` を付与、`parent:` は付けない）
2. 親用に `parent:<新番号>-<短縮名>` ラベルを発行（`gh label create`）
3. 各子 Issue を順番に作成・紐付け（`area:` + `parent:<新番号>-<短縮名>` を付与）

### ステップ 7: 完了報告

- 作成した Issue の番号・タイトル・URL
- 親子関係（該当する場合）

### ステップ 8: 次のスキルを必ず提案（省略禁止）

完了報告に続けて、**必ず**次の文言を出力する：

> 次は `/create-branch` でこの Issue 用のブランチを作成しますか？（yes でこのまま実行します）

ユーザーが yes / はい / OK 等の肯定を返したら、`/create-branch --issue <作成した Issue 番号>` を Skill ツールで即座に起動する。
ユーザーが「別作業に切り替える」「不要」と明言した場合のみスキップ可。スキップする際は理由を明示する。

## 注意事項

- Issue 本文にセキュリティ上の機密情報を含めない
- 親 Issue の本文を更新する際は既存の内容を保持する
- 子 Issue 作成中にエラーが発生しても、作成済みの Issue は削除しない
