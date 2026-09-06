---
name: review-pr
description: PR の差分を取得してコードレビューを行い、確認の上で PR にレビューコメント（インライン・全体）を投稿する。
disable-model-invocation: true
argument-hint: '[PR番号]'
---

# PR レビュースキル

`gh` CLI で PR の差分・コミット・既存コメントを取得し、レビュー観点でコードを精査した上で、ユーザー承認のもと PR にレビューコメントを投稿する。

**重要**: まず `.claude/skills/workflow-config.md` を読み込み、ブランチ戦略・レビュアー設定を取得すること。規約・playbook の参照が必要になった場合は、同ディレクトリ内の `workflow-conventions.md` / `workflow-issues.md` / `workflow-playbooks.md` を必要に応じて参照する。

## 引数の解析

`$ARGUMENTS` から PR 番号（数値）を取得する。未指定の場合は現在のブランチに紐づく PR を自動検出する。

## 現在の状態

スキル実行開始時に以下を取得する:

- 現在のブランチ: `git branch --show-current`
- リポジトリ: `gh repo view --json nameWithOwner --jq '.nameWithOwner'`

## ワークフロー

### ステップ 1: PR の特定

1. `$ARGUMENTS` に PR 番号がある場合はそれを使用する
2. 未指定の場合:
   ```bash
   gh pr view --json number --jq '.number'
   ```
3. PR が見つからない場合はエラーを報告して停止する

### ステップ 2: PR メタ情報の取得とセルフレビュー判定

```bash
gh pr view <PR番号> --json number,title,body,state,author,headRefName,baseRefName,url,additions,deletions,changedFiles,isDraft
gh api user --jq '.login'
```

- `state` が `open` でない場合は警告し、続行するか確認する
- ドラフト PR の場合は確認する
- PR タイトル・本文・作成者・変更規模をユーザーに提示する
- **セルフレビュー判定**: PR の `author.login` と現在のユーザー（`gh api user --jq '.login'`）を比較し、一致する場合は「セルフレビュー」として扱う
  - セルフレビュー時は後段の総合判定で `event` を `COMMENT` に **強制**する（`APPROVE` / `REQUEST_CHANGES` は GitHub 仕様で投げられないため）
  - その旨をユーザーに通知する

### ステップ 3: 変更ファイル一覧と差分の取得

```bash
gh pr diff <PR番号>
gh pr view <PR番号> --json files --jq '.files[] | {path,additions,deletions}'
```

変更ファイル数が多い場合（例: 20 ファイル超）はユーザーに以下を確認する:
- 全ファイルレビューするか
- 特定ディレクトリ・ファイルに絞るか

### ステップ 4: 既存レビューコメントの確認

過去のレビューと重複指摘を避けるため、既存のコメントを取得する:

```bash
gh pr view <PR番号> --json reviews,comments
gh api repos/{owner}/{repo}/pulls/<PR番号>/comments
```

既に指摘済みの内容は再指摘しない。

### ステップ 5: 関連設計ドキュメント・規約の参照

レビュー基準を揃えるため、以下を確認する:

- `CLAUDE.md`（編集ルール・原則）
- `docs/` 配下の関連設計ドキュメント
- `docs/.steering/` の関連 steering（PR の変更領域に対応するもの）
- `.claude/rules/` 配下のルール

### ステップ 6: レビューの実施

以下の観点で各変更を精査する:

#### 必須観点

- **正確性**: ロジック誤り・例外処理漏れ・off-by-one・null/undefined ハンドリング
- **セキュリティ**: SQL インジェクション・XSS・認証/認可漏れ・シークレットの混入・入力検証
- **テスト**: 重要な変更にテストがあるか・テストが意味のある検証か
- **設計整合**: 設計ドキュメント・既存パターン・CLAUDE.md ルールとの整合性
- **可読性**: 命名・関数の責務・複雑度
- **パフォーマンス**: N+1・不要なループ・大きなオブジェクトのコピー
- **後方互換性**: 破壊的変更の有無と妥当性
- **docs / CLAUDE.md 整合**: 実装変更に対応する `docs/` の各ファイル（役割対応表は [`.claude/rules/docs-content.md`](../../rules/docs-content.md) を参照）と `CLAUDE.md` のディレクトリ構成図 / 進捗表が更新されているか（記述と実装の食い違い・古いコード例の残存等）

#### 任意観点

- ドキュメント更新の有無
- 命名規則の一貫性
- 不要なコメント・デッドコード
- 依存ライブラリの追加が妥当か

### ステップ 7: 指摘案の整理とユーザー確認

各指摘を [`references/comment-template.md`](references/comment-template.md) の **指摘テンプレート** に従って整理する。重大度ラベル（🔴 Critical / 🟡 High / 🔵 Medium / 🟢 Low）の定義も同テンプレートを参照。

整理した指摘群を以下の形でユーザーに提示する:

```
=== レビュー指摘案 ===

<指摘テンプレートで指摘 N 件>

総合判定案: comment / request-changes
全体コメント案: <要約>
```

ユーザーに以下を確認する:
- 各指摘を投稿するか / 却下するか / 修正するか
- 総合判定（request-changes / comment）
- 全体コメントの内容

### ステップ 8: レビューコメントの投稿

ユーザー承認後、`gh api` で PR レビューを作成する。

#### コメント本文の組み立て

全体コメント（`body`）は [`references/comment-template.md`](references/comment-template.md) の **全体コメントテンプレートの選択** 表に従って `pass-template.md` または `fail-template.md` を選び、プレースホルダ（`{{pr_author}}` `{{reviewer_name}}` `{{commit_sha}}`）を置換する。

#### 投稿前チェック

[`references/comment-template.md`](references/comment-template.md) の **投稿前チェックリスト** をすべて満たすことを確認する。1 つでも満たさない場合は投稿せず、組み立てに戻る。

#### 一括投稿（推奨）

`POST /repos/{owner}/{repo}/pulls/{pr}/reviews` でインラインコメントと全体コメントを一括投稿する:

```bash
gh api repos/{owner}/{repo}/pulls/<PR番号>/reviews \
  --method POST \
  --input - <<'EOF'
{
  "event": "COMMENT",
  "body": "<全体コメント>",
  "comments": [
    {
      "path": "src/auth/login.ts",
      "line": 42,
      "side": "RIGHT",
      "body": "<インラインコメント>"
    }
  ]
}
EOF
```

- `event`: `REQUEST_CHANGES` / `COMMENT`
- 範囲指定の場合は `start_line` / `start_side` も付ける
- `commit_id` は省略可（最新コミットに紐づく）

`heredoc` の JSON は `jq` で組み立てるか、一時ファイル経由で渡すと安全。

#### 投稿失敗時

`POST /reviews` は **1 レビューにつき 1 回だけ** 呼ぶ。422 が返ったら失敗した inline を `body` に移して 1 回だけ再 POST する。**コメント単位での再 POST はしない**（成功分が submitted review として確定し、削除できない）。

`Path could not be resolved` は path に非 ASCII / スペースが含まれる、もしくは差分外のとき出やすい。該当する指摘は最初から `body` に書く。

### ステップ 9: 完了報告

- PR 番号・タイトル（URL）
- 投稿した指摘: インライン N 件 / 全体 1 件
- 総合判定: request-changes / comment
- レビュー URL（`gh pr view <PR番号> --json reviews` から最新を取得）

PR 作成者向けに「`/fix-review <PR番号>` で対応できる」ことを案内する。

`pass-template` を使った場合は、完了報告でも「approve は GUI から」を改めて案内する（テンプレートのフッターと整合）。

## 注意事項

- 指摘は **断定ではなく根拠を添える**（仕様・規約・参考リンクを示す）
- 細かすぎる Low は数を絞る（多すぎるとレビューの主旨がぼやける）
- セキュリティ上の重大な懸念は最優先で報告する
- レビューコメントにシークレット・社内固有情報を書かない
- 既に他のレビュアーが指摘済みの内容は重複投稿しない
- フォースプッシュや作成者ブランチへの直接コミットは絶対に行わない
- approve / merge は人間が GitHub Web UI から行う運用とする
