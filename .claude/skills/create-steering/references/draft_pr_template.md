# Draft PR 本文テンプレート

`/create-steering` が steering ファイル承認後に作成する **draft PR** の本文テンプレ。
ready 化（`/create-pr` 実行時）には [`create-pr/references/pull_request_template.md`](../../create-pr/references/pull_request_template.md) で全置換される。それまでの間、レビュアー・関係者が「これから何をやろうとしているか」を把握するためのスナップショット。

通常 steering（requirements / design / tasks）と軽量 steering（index.md のみ）の両方に対応する。

---

## 通常 steering 用テンプレ

```markdown
> 📌 **このPRは作業中（draft）です。**
> 最新の作業計画は [docs/.steering/{ディレクトリ名}/](../tree/{ブランチ名}/docs/.steering/{ディレクトリ名}) を参照してください（steering ファイル本体が真実の情報源）。
> 実装完了後、`/create-pr` で本文が実装サマリに書き換えられ ready に昇格します。

## 概要

{requirements.md の「概要」から 1〜2 行}

## 関連 Issue

{Closes #番号（ブランチ名から検出）/ なし}

## 作業計画

### Steering ディレクトリ

[`docs/.steering/{ディレクトリ名}/`](../tree/{ブランチ名}/docs/.steering/{ディレクトリ名})

- [requirements.md](../tree/{ブランチ名}/docs/.steering/{ディレクトリ名}/requirements.md) — 要求・受け入れ条件
- [design.md](../tree/{ブランチ名}/docs/.steering/{ディレクトリ名}/design.md) — 設計判断・採用しなかった選択肢
- [tasks.md](../tree/{ブランチ名}/docs/.steering/{ディレクトリ名}/tasks.md) — 作業タスク一覧

### 受け入れ条件（requirements.md より抜粋）

- [ ] {requirements.md の受け入れ条件1}
- [ ] {受け入れ条件2}
- [ ] {受け入れ条件3}

### 主要タスク（tasks.md より抜粋）

- [ ] {tasks.md の主タスク1}
- [ ] {主タスク2}
- [ ] {主タスク3}

## 注意事項

- 本文の更新責務は持たない: steering ファイルを実装中に書き換えてもこの本文は同期されない。最新は上記リンク先を参照。
- ready 化時に `/create-pr` が本文を実装結果テンプレで全置換する。
```

---

## 軽量 steering 用テンプレ

```markdown
> 📌 **このPRは作業中（draft）です。**
> 最新の作業計画は [docs/.steering/{ディレクトリ名}/index.md](../tree/{ブランチ名}/docs/.steering/{ディレクトリ名}/index.md) を参照してください。
> 実装完了後、`/create-pr` で本文が実装サマリに書き換えられ ready に昇格します。

## 概要

{index.md の「何を」「なぜ」「どう」を 1〜3 行で要約}

## 関連 Issue

{Closes #番号（ブランチ名から検出）/ なし}

## 作業計画

[`docs/.steering/{ディレクトリ名}/index.md`](../tree/{ブランチ名}/docs/.steering/{ディレクトリ名}/index.md)

## 注意事項

- 本文の更新責務は持たない: steering ファイルを実装中に書き換えてもこの本文は同期されない。
- ready 化時に `/create-pr` が本文を実装結果テンプレで全置換する。
```

---

## プレースホルダ埋めの指針

| 置換対象 | 取得元 |
|---|---|
| `{ディレクトリ名}` | `docs/.steering/` 配下の今回作成したディレクトリ名（例: `20260524-add-draft-pr-flow`） |
| `{ブランチ名}` | `git branch --show-current` |
| 「概要」（通常） | `requirements.md` の「概要」セクション本文 |
| 「概要」（軽量） | `index.md` の「何を」「なぜ」「どう」を 1〜3 行に要約 |
| 受け入れ条件（通常のみ） | `requirements.md` の「受け入れ条件」セクションのチェックボックス（最大 5 件目安） |
| 主要タスク（通常のみ） | `tasks.md` の見出しレベル `##`〜`###` のタスク（最大 5 件目安） |
| `Closes #番号` | ブランチ名から数字 prefix を抽出（例: `feat/9-xxx` → `Closes #9`）。検出できなければ「なし」 |
