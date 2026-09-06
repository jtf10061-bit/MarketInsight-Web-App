# pass テンプレート（Critical / High が 0 件）

Critical / High が 0 件（指摘なし、または 🔵 Medium / 🟢 Low のみ）の場合に使う全体コメント本文テンプレート。

## テンプレート

````markdown
> **Claude Code 補助レビュー結果**
> 宛先: @{{pr_author}}
> レビュアー: @{{reviewer_name}}
> 対象コミット: `{{commit_sha}}`

---

Critical / High 相当の指摘は検出されませんでした。

<Medium / Low の指摘群（あれば指摘テンプレートに従って記載。なければ「_（該当なし）_」）>

---

_approve は承認権限を持つメンバーが GitHub Web UI から実施してください。_
_これは AI 補助レビュー結果です。ご不明点があれば、レビュアーにお気軽にご相談くださいませ。_
````

## 留意点

- 重大度ラベル / 指摘テンプレート / プレースホルダ取得方法 / 投稿前チェックリストは [`comment-template.md`](comment-template.md) を参照
- Medium / Low が 0 件のときも、approve 案内のフッターは省略しない
