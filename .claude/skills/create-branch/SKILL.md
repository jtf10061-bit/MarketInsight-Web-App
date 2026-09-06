---
name: create-branch
description: |
  Issue を選択して作業用ブランチを新規作成するスキル。ブランチ名に Issue 番号を含めて紐付けを確実にする。

  起動する: 「ブランチ作って」「作業ブランチ切って」「Issue #N に着手したい」「新しいブランチで作業を始める」等、ユーザーが新規ブランチ作成の意図を明示した時のみ。
  起動しない: 既存ブランチへの切替、命名規則の質問、ブランチ一覧表示、`git` コマンドの使い方の質問。
argument-hint: '[--issue <Issue番号>] [説明]'
---

# ブランチ作成スキル

Issue を選択し、規約に沿った命名で作業用ブランチを作成する。

**重要**: まず `.claude/skills/workflow-config.md` と `.claude/skills/workflow-conventions.md` を読み込み、ブランチ戦略および命名プレフィックス（Type 規約）を取得すること。

## 引数の解析

`$ARGUMENTS` からオプションを取得する。

- `--issue <番号>`: 関連する Issue 番号（指定時は Issue 選択をスキップ）
- 説明テキスト: ブランチ名のヒントとして使用

## 現在の状態

- 現在のブランチ: !`git branch --show-current`
- Git ステータス: !`git status --short`

## ワークフロー

### ステップ 1: 事前チェック

1. 未コミットの変更がないことを確認する
   - ある場合はユーザーに警告し、stash するか先にコミットするか確認する
2. リモートの最新を取得する:
   ```bash
   git fetch origin
   ```

### ステップ 2: Issue の選択

`--issue` が指定されている場合はこのステップをスキップする。

1. オープンな Issue 一覧を表示する:
   ```bash
   gh issue list --state open --json number,title --limit 20
   ```
2. 一覧をユーザーに提示し、どの Issue に着手するか確認する
3. Issue が不要な場合（Issue なしで作業する場合）はその旨を確認してステップ 3 に進む

### ステップ 3: ブランチ名の決定

1. Issue のタイトルと説明から適切なプレフィックスを判定する（`workflow-conventions.md` の Type 規約表に従う）
2. ブランチ名を生成する:
   - Issue ありの場合: `<プレフィックス>/<Issue番号>-<説明>`（例: `feat/9-nextjs-project-init`）
   - Issue なしの場合: `<プレフィックス>/<説明>`（例: `docs/update-readme`）
3. 命名ルール:
   - 英小文字・ハイフン区切り
   - 簡潔で内容が分かる名前
4. ユーザーに提示して承認を得る:
   - **ブランチ名**: `feat/9-nextjs-project-init`
   - **ベースブランチ**: `workflow-config.md` のデフォルトベースブランチ
   - **関連 Issue**: #9

### ステップ 4: ブランチ作成

```bash
git switch -c <ブランチ名>
```

### ステップ 5: 完了報告

作成したブランチ名とベースブランチを報告する。

Issue が紐づいている場合は、Issue の完了条件（チェックボックス）があれば表示する:
```bash
gh issue view <Issue番号> --json body
```

### ステップ 6: 次のスキルを必ず提案（省略禁止）

完了報告に続けて、**必ず**次の文言を出力する：

> 次は `/create-steering` で作業計画（steering）を作成しますか？（yes でこのまま実行します）

ユーザーが yes / はい / OK 等の肯定を返したら、`/create-steering` を Skill ツールで即座に起動する。
ユーザーが「steering 不要」「直接実装に進む」と明言した場合のみスキップ可。スキップする際は理由を明示する。

## 注意事項

- 同名のブランチが既に存在する場合はエラーを報告して停止する
- ベースブランチは `workflow-config.md` のデフォルトベースブランチを使用する
