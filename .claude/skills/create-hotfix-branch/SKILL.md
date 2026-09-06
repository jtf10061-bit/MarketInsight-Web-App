---
name: create-hotfix-branch
description: 本番障害レベルの緊急対応で main から hotfix ブランチを作成する。Issue・steering 作成前に呼んでよい例外フロー。
disable-model-invocation: true
argument-hint: '[--issue <Issue番号>] <短い説明>'
---

# hotfix ブランチ作成スキル（緊急対応専用）

本番障害レベルの事象に対する緊急対応で、main から hotfix ブランチを作成する。

通常の `create-branch` と異なり、**main 起点**・**Issue / steering 作成前に着手してよい**・**最小修正のみ**、を前提とした例外フロー。

**重要**: まず `.claude/skills/workflow-config.md` と `.claude/skills/workflow-conventions.md` を読み込む。

## 緊急対応の対象

### 緊急対応にする例

- 本番業務が止まっている
- 本番データ・帳票・CSV・メール送信・外部連携などに重大な誤りがある
- 次回通常リリースを待つと、業務影響や混乱が大きい
- セキュリティ上、即時に塞ぐ必要がある

### 緊急対応にしない例

- 依頼者が急いでいる
- 納期が近い
- 小さい修正だからすぐ出したい
- 通常フローで Issue を作成する余裕がある

→ 上記の「緊急対応にしない例」に該当する場合は本スキルを中断し、通常の `/create-branch` を案内する。

## 引数の解析

`$ARGUMENTS` からオプションを取得する。

- `--issue <番号>`: 関連する Issue 番号（指定なしでも可。緊急時は Issue 作成前に着手してよい）
- 説明テキスト: ブランチ名のヒントとして使用（必須）

## 現在の状態

- 現在のブランチ: !`git branch --show-current`
- Git ステータス: !`git status --short`

## ワークフロー

### ステップ 1: 緊急対応の再確認

ユーザーに以下を確認する:

> 本番障害レベルの事象ですか？通常の急ぎ修正であれば `/create-branch` を使ってください。

- 「はい（緊急対応）」と確認できた場合のみ次へ進む
- それ以外は中断し、通常の `/create-branch` を案内する

### ステップ 2: 事前チェック

1. 未コミットの変更がないことを確認する
   - ある場合はユーザーに警告し、stash するか先にコミットするか確認する
2. リモートの最新を取得する:
   ```bash
   git fetch origin
   ```

### ステップ 3: ブランチ名の決定

`workflow-conventions.md` の Type 規約表の `hotfix/` プレフィックスを使う。

ブランチ名の構造:

- Issue 番号がある場合: `hotfix/<Issue番号>-<説明>`（例: `hotfix/45-csv-encoding-fix`）
- Issue 番号がない場合: `hotfix/<YYYYMMDD>-<説明>`（例: `hotfix/20260607-csv-encoding`）

命名ルール:

- 英小文字・ハイフン区切り
- 説明は 20 文字以内（目安）

ユーザーに提示して承認を得る:

- **ブランチ名**: `hotfix/...`
- **ベースブランチ**: `main`（hotfix は main 起点）
- **関連 Issue**: `--issue` 指定時のみ。なければ「Action による自動作成を待つ」と説明

### ステップ 4: ブランチ作成

```bash
git switch main
git pull --ff-only origin main
git switch -c <ブランチ名>
git push -u origin <ブランチ名>
```

### ステップ 5: 完了報告と次ステップの案内

- 作成したブランチ名・ベースブランチ（main）
- 次にやること:
  1. **復旧に必要な最小修正のみ** コミット
  2. `/create-pr` で main 向けの PR を作成（current branch が `hotfix/*` なので hotfix モードで動く）
  3. 人間のレビュー後にマージ → 本番反映・復旧確認
  4. マージ後は Action が自動で以下を実行:
     - 緊急対応 Issue の作成
     - main → develop の戻し PR の作成
- 事後整理は復旧後、通常運用フローに戻って行うことを伝える

## 注意事項

- **AI に緊急対応の判断をさせない**。ステップ 1 でユーザーに明示的に確認する
- hotfix は **復旧に必要な最小修正に限定**する。リファクタや関連改善は同じブランチに入れない
- 同名のブランチが既に存在する場合は末尾に `-2` を付けて再試行する案を提示する
- main が ff 不可（ローカルで commit 追加等）の場合は中断し、ユーザーに状況を伝える
- Issue・steering の作成は **復旧後**で良い（緊急時に書く余裕がないことを許容する例外フロー）
