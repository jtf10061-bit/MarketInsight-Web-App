---
name: create-steering
description: |
  作業計画用の steering ディレクトリ（`docs/.steering/[YYYYMMDD]-[タイトル]/`）を対話式で作成するスキル。
  軽量（index.md 1 ファイル）/ 通常（requirements.md + design.md + tasks.md）を判定して作る。

  起動する: 「作業計画立てて」「ステアリング作成」「これから X を作る、計画を立てて」「設計判断ありの作業を始めたい」「次は Y を Z に変更したい」等、ユーザーが新規作業の計画立案を明示した時のみ。
  起動しない: 既存 steering の閲覧・編集、steering 規約に関する質問、「計画とは何か」の説明依頼、すでに着手済みの作業の追跡。
---

# create-steering

作業着手前に **必ず** steering を作るのが本テンプレートの運用ルール。このスキルはその作成を対話的にガイドする。

形式・命名規則・各ファイルに書く項目は [`.claude/rules/.steering.md`](../../rules/.steering.md) を参照すること。このスキルは **作成のワークフロー** を担当する。

---

## 動作原則

1. **1 ファイルごとにユーザー承認を得てから次へ進む**（特に通常 steering の場合）
2. **形式判定で迷ったら通常 steering を選ぶ**（判定基準は `.steering.md` 参照）
3. **タイトルは英数字ハイフン区切り**（例: `add-search-filter`、`fix-auth-bug`）。日本語は避ける（パス操作時のトラブル回避）
4. **承認なく次のファイルに進まない**

---

## ワークフロー

### Step 1: 作業内容のヒアリング

以下を確認する：

- 何をする作業か（1〜3 行で）
- 既存のドキュメントへの影響（永続的 docs の更新が必要か）
- 設計判断の有無

### Step 2: 形式判定

`.steering.md` の判定基準に従って軽量／通常を決める。

### Step 3: ディレクトリ作成

```bash
mkdir -p docs/.steering/[YYYYMMDD]-[英数字ハイフン区切りタイトル]
```

- `YYYYMMDD` は今日の日付（システムから取得）
- 既に同名ディレクトリが存在する場合はユーザーに確認

### Step 4a: 軽量 steering の作成

`.steering.md` の軽量フォーマットに従って `index.md` を作成。書いたら作業開始してよい。承認は最終確認のみ。

承認後、**Step 5（draft PR 作成）に進む**。

### Step 4b: 通常 steering の作成

[`templates/`](templates/) 配下の雛形を起点に、3 ファイルを **1 ファイルずつ** ユーザー承認を取りながら作成する。各ファイルのプレースホルダ `{...}` を作業内容で埋めていく。

1. [`templates/requirements.md`](templates/requirements.md) → `docs/.steering/[ディレクトリ]/requirements.md` を作成 → ユーザー確認 → 承認後に次へ
2. [`templates/design.md`](templates/design.md) → `docs/.steering/[ディレクトリ]/design.md` を作成。複数選択肢を検討し却下理由を必ず書く → ユーザー確認 → 承認後に次へ
3. [`templates/tasks.md`](templates/tasks.md) → `docs/.steering/[ディレクトリ]/tasks.md` を作成 → ユーザー確認 → 承認後に **Step 5（draft PR 作成）に進む**

### Step 5: draft PR 作成

steering ファイル承認後に **必ず draft PR を作成する**（通常 / 軽量で挙動を分けない）。本文は [`references/draft_pr_template.md`](references/draft_pr_template.md) を使う。

#### 5-1: 安全性チェック

1. 現在のブランチが保護ブランチ（`.claude/skills/workflow-config.md` の「ブランチ戦略」に記載）でないことを確認する
   - 保護ブランチ上の場合はエラーを報告し、ユーザーに新ブランチへの切替を促す
2. 既に同ブランチからの open PR が存在しないことを確認する
   ```bash
   gh pr list --head $(git branch --show-current) --state open --json number,isDraft
   ```
   - 既存 PR がある場合は draft PR 作成をスキップし、ユーザーに既存 PR を案内する

#### 5-2: steering ファイルのコミット & push

```bash
git add docs/.steering/<ディレクトリ名>/
git commit -m "docs(steering): <英数字ハイフン区切りタイトル>"
git push -u origin <現在のブランチ>
```

steering 以外に永続 docs（`CLAUDE.md` / `docs/architecture.md` 等）への付随変更がある場合は、別コミットとしてこのステップの前後でコミットしておく。`git status` で取りこぼしがないか確認すること（draft PR の差分に含めないと、レビュアーが見たときに前提情報が欠ける）。

#### 5-3: draft PR 本文の生成

[`references/draft_pr_template.md`](references/draft_pr_template.md) のテンプレを使って本文を生成する：

- **通常 steering** → 「通常 steering 用テンプレ」を使い、requirements.md の概要・受け入れ条件、tasks.md の主要タスクを抜粋
- **軽量 steering** → 「軽量 steering 用テンプレ」を使い、index.md を要約

タイトルは `<type>: <steering タイトル>` 形式（type は [`workflow-conventions.md`](../workflow-conventions.md) を参照）。

関連 Issue は **ブランチ名から数字 prefix を抽出**（例: `feat/9-xxx` → `Closes #9`）。抽出できなければ「なし」。

#### 5-4: ユーザー確認

タイトル・本文をユーザーに提示し、承認を得る。

#### 5-5: draft PR 作成

```bash
gh pr create --draft \
  --title "<タイトル>" \
  --body "<本文>" \
  --base <デフォルトベースブランチ> \
  --assignee @me
```

ベースブランチは `workflow-config.md` のデフォルト（`develop`）を使う。

#### 5-6: 関連 Issue への着手記録

ブランチ名から Issue 番号を抽出できた場合のみ、Issue にコメントで着手記録を残す（完了条件本体は触らない）。詳細は [`workflow-issues.md`](../workflow-issues.md) の **「着手記録（draft PR 作成時）」** を参照。

```bash
gh issue comment <Issue番号> --body "作業着手 (draft PR #<PR番号>)"
```

### Step 6: 完了報告

作成したファイル一覧、draft PR URL、次のアクションを報告。

次のアクション（`workflow-config.md` の「完了時の次ステップ提案」表に従う）:
- 実装を進める
- 実装完了後 `/create-pr` で draft → ready に昇格

### Step 7: 次のアクションを必ず提案（省略禁止）

完了報告に続けて、**必ず**次の文言を出力する：

> steering を作成しました。続けて実装に着手しますか？（yes で tasks.md の最初のタスクから順に進めます。実装完了後は `/create-pr` を提案します）

ユーザーが yes / はい / OK 等の肯定を返したら、tasks.md（通常 steering）または index.md（軽量 steering）の最初のタスクから実装に取り掛かる。
ユーザーが「一旦中断」「別作業に切り替える」と明言した場合のみスキップ可。スキップする際は理由を明示する。

---

## 永続的ドキュメントへの影響判定

ステアリング作成時に確認する：

- 変更が `docs/product-requirements.md` `agent-design.md` `architecture.md` `glossary.md` の内容に影響するか
- 影響する場合は、別途 docs 側の更新が必要 → tasks.md の最後にタスクとして追加
- 環境変数の追加 → `.env.example` 更新タスクを必ず tasks.md に含める（[`restricted-files.md`](../../rules/restricted-files.md)）

---

## エッジケース

| ケース | 対応 |
|------|------|
| 同日に複数の作業を開始 | タイトル末尾に番号を付ける（例: `20260502-fix-auth`, `20260502-fix-auth-2`） |
| ステアリングを作ったが作業内容が大きく変わった | 新しいステアリングを作る（古い方は履歴として残す）。または requirements.md を更新して理由を明記 |
| 軽量で始めたが設計判断が必要になった | `index.md` の内容を `requirements.md` に流用しつつ、`design.md` `tasks.md` を追加して通常 steering に格上げ |
| 既存の作業途中で方針転換した | tasks.md に「方針変更」を明記、design.md にも追記 |

---

## 良いステアリングのチェックリスト

作成後、以下を満たしているか自己確認：

### 通常 steering
- [ ] requirements.md: 受け入れ条件が検証可能（「動く」ではなく「Xが起きたらYになる」のように具体的）
- [ ] design.md: 採用しなかった選択肢とその却下理由が書かれている
- [ ] tasks.md: タスクごとに完了条件が明記されている
- [ ] 並列実行可能なタスクが見分けられる

### 軽量 steering
- [ ] index.md が 3 行以内（長すぎたら通常 steering に格上げ検討）
- [ ] 「なぜ」が読者に伝わる（1 ヶ月後の自分が読んで分かるか）

---

## 関連ドキュメント

- 規約定義 → [`.claude/rules/.steering.md`](../../rules/.steering.md)
- ファイル配置・運用方針 → 永続 `docs/` 群
- 過去の steering 例 → `docs/.steering/` 配下の既存ディレクトリ
