# fail テンプレート（Critical / High が 1 件以上）

Critical または High が 1 件以上ある場合に使う全体コメント本文テンプレート。

## テンプレート

````markdown
> **Claude Code 補助レビュー結果**
> 宛先: @{{pr_author}}
> レビュアー: @{{reviewer_name}}
> 対象コミット: `{{commit_sha}}`

---

<指摘群（指摘テンプレートに従って Critical → High → Medium → Low の順に記載）>

---

_これは AI 補助レビュー結果です。ご不明点があれば、レビュアーにお気軽にご相談くださいませ。_
````

## 留意点

- 重大度ラベル / 指摘テンプレート / プレースホルダ取得方法 / 投稿前チェックリストは [`comment-template.md`](comment-template.md) を参照
- 指摘は重大度順（Critical → High → Medium → Low）で並べる
- Critical / High が 1 件でもあるときは、PR 作成者の対応を待つため approve は案内しない
