# Issue 規約

各スキル（create-issue, create-pr, fix-review 等）が参照する Issue 関連の規約。

すべての Issue（gh / Web UI / スキル等、作成方法を問わず）は以下のルールに従う。

## Issue 本文テンプレート

[`create-issue/references/issue_template.md`](create-issue/references/issue_template.md) を使う。

## Issue タイトル規約

- **親 Issue（Epic）**: `[Epic] <主題>`（`area:` は付けるが `parent:` は付けない）
- **子 Issue**: `<type>(<scope>): <内容>` の Conventional Commits 形式（type は [`workflow-conventions.md`](workflow-conventions.md) の表に従う）
- **実行順がある Epic の子**（任意）: `[N] <type>(<scope>): <内容>`

## ラベル体系

`area:` / `priority:` / `parent:` の 3 軸 + Epic 識別用の `epic` 単発ラベルで構成する。各 Issue は最低 `area:` 1 つを必ず付ける。

### epic（親 Issue 識別）— 親 Issue は必須・単一ラベル

`[Epic] ...` タイトル prefix を付けた親 Issue には `epic` ラベルも合わせて付ける。一覧画面で色タグによる即時識別を可能にし、`label:epic` で全 Epic を抽出できるようにする。

子 Issue には付けない（親子の役割分離）。Epic がクローズされた後もラベルは外さない（履歴保護）。

### area:（機能領域）— 必須・複数付与可

| ラベル | 用途 |
|---|---|
| `area:app` | `backend/` `frontend/` どちらも含むアプリケーションコード |
| `area:agent` | エージェントロジック（プロンプト・ツール・ReAct ループ） |
| `area:infra` | Terraform / Azure リソース / Docker |
| `area:ci` | GitHub Actions / pre-commit / lint 設定 |
| `area:docs` | `docs/` 配下の永続的ドキュメント |
| `area:meta` | `.claude/` 配下のルール・スキル・テンプレ改善 |

frontend / backend は分けない（境界判断の運用負荷を避ける。チャット機能は両方を同時に触る Issue が多数派という実情に合わせる）。複数領域にまたがる場合は該当 area をすべて付ける（例: ツール追加なら `area:app` + `area:agent`）。**3 個以上**付くようならスコープが大きすぎるサインなので分割を検討する。

将来 `area:app` 内が分厚くなったら `area:auth` `area:db` `area:eval` `area:frontend` `area:backend` 等の派生 area を追加してもよい。

### priority:（優先度）— 任意

- `priority:p0-critical` / `priority:p1-high` / `priority:p2-normal` / `priority:p3-low`

### parent:&lt;番号&gt;-&lt;短縮名&gt;（親 Issue 紐付け）— 子 Issue は必須

例: `parent:2-roadmap`, `parent:27-claude-tooling`

親 Issue 自体には付けない（`[Epic] ...` タイトル prefix で識別する）。

Epic がクローズされた後もラベルは原則残す（履歴保護: 過去の子 Issue を `parent:` で検索可能にするため）。年 1 回程度の棚卸しで明らかに不要なものを整理する。

### GitHub 標準ラベルとの併用

`bug` / `documentation` / `good first issue` / `help wanted` / `blocked` などは併用可。type（`feat` / `fix` / `chore` 等）は **ラベル化しない**（タイトル prefix + branch prefix で表現する）。

## ラベル付与の運用フロー

### 親 Issue（Epic）作成時

1. タイトルを `[Epic] <主題>` 形式にする
2. `epic` ラベル + 該当する `area:` ラベルを 1〜複数付ける（Epic 自体には `parent:` を付けない）
3. 子 Issue 用に `parent:<新 Epic 番号>-<短縮名>` ラベルを発行する:
   ```bash
   gh label create parent:<番号>-<短縮名> --description "Epic #<番号> の子" --color FEF2C0
   ```
   短縮名は Epic 内容を 1〜2 単語で表す英小文字（例: `roadmap`, `claude-tooling`）

### 子 Issue 作成時

1. タイトルを `<type>(<scope>): <内容>` 形式にする（`[Epic]` は付けない）
2. 親 Epic に対応する `parent:<番号>-<短縮名>` ラベルを付ける
3. 親 Epic の `area:` を初期候補として、子の作業範囲に応じて `area:` を選定（複数可、3 個以上は分割サイン）
4. [Sub-issues API](#sub-issues-api-の使い方) で正式な親子関係を設定する

## 子 Issue の運用

- 子 Issue リンク方式: タスクリスト（チェックボックス形式、GitHub Tracked Issues 連携）と [Sub-issues API](#sub-issues-api-の使い方) を併用する
- 大規模 Issue の分割提案: 完了条件が 5 項目以上、または複数ドメインにまたがる場合に提案する

## Sub-issues API の使い方

子 Issue を作成した後、以下の API で親 Issue に紐づける:

```bash
gh api repos/{owner}/{repo}/issues/{親Issue番号}/sub_issues \
  --method POST \
  -F sub_issue_id=$(gh api repos/{owner}/{repo}/issues/{子Issue番号} --jq '.id')
```

- リポジトリ情報は `gh repo view --json nameWithOwner --jq '.nameWithOwner'` で取得する
- `sub_issue_id` には Issue の数値 ID（`node_id` ではない）を指定する

## 完了条件の更新タイミング

Issue 本文の完了条件チェックボックスは以下のタイミングで更新する：

- **`/create-steering` 実行時（draft PR 作成時）**: チェックボックスは触らず、**Issue にコメントで着手記録を残す**（後述）
- **`/create-pr` 実行時**: 達成済みの項目をチェック → PR と一緒に状態を反映
- **`/fix-review` 実行時**: レビュー対応で達成状況が変わった場合に再更新
- **PR マージ時**: GitHub が「Closes #N」で自動クローズ（デフォルトブランチへのマージのみ）

### 着手記録（draft PR 作成時）

`/create-steering` が draft PR を作成したら、ブランチ名から抽出した関連 Issue にコメントを 1 件投稿する。完了条件本体は **編集しない**（編集競合・打ち消し線の運用回避）。

コメント文面の例:

```
作業着手 (draft PR #<番号>)
```

コマンド例:

```bash
gh issue comment <Issue番号> --body "作業着手 (draft PR #<PR番号>)"
```

ブランチ名から Issue 番号が抽出できなかった場合は記録をスキップする（無理に紐付けない）。

## 完了条件の更新手順

PR が「Closes #N」で参照する Issue について、以下の手順で完了条件を更新する：

1. Issue を取得: `gh issue view <番号> --json body`
2. 完了条件のチェックボックスを精査
3. 各項目を以下のいずれかに更新する:
   - **対応済み**: `[x]` に変更。実装が原文と変わった場合は `**【代替実装】** ...` を補足
   - **部分対応**: `[ ]` のまま `**【部分対応】** 実施したこと / 残したこと` を補足（打消しなし）
   - **不採用**: `[ ]` のまま、**項目本文を `~~...~~` で打消し** + `**【不採用】** PR #<番号> の議論で〜と判断` を補足
   - **未対応**: そのまま（次回 PR で対応予定）
4. 更新内容をユーザーに提示し承認を得る
5. `gh issue edit <番号> --body "<新しい本文>"` で更新

## 環境変数の追加が伴う Issue

`.env.example` への追記は Claude が実施し、`.env` への反映はユーザーに依頼する（[`restricted-files.md`](../rules/restricted-files.md) 参照）。Issue の完了条件にこの分担を明示する。
