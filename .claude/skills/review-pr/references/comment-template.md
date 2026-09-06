# レビューコメントテンプレート

`/review-pr` スキルが PR に投稿するレビューコメントの構造を定義する。SKILL.md のステップ 7・8 から参照される。

## 重大度ラベル

- 🔴 **Critical**: セキュリティ脆弱性 / データ破損 / 本番障害につながる
- 🟡 **High**: 機能バグ / 設計違反 / CLAUDE.md ルール違反
- 🔵 **Medium**: 可読性 / テスト不足 / パフォーマンス改善余地
- 🟢 **Low**: nit / 命名 / 提案

各指摘には **1 つだけ** ラベルを付ける。判断に迷ったら一段上のラベルに倒す。

## 指摘テンプレート

各指摘（インラインコメント・全体コメント問わず）は以下の構造で記述する。要約・省略・言い換えはしない。

````markdown
### [問題のタイトル]
**重大度**: <Critical / High / Medium / Low のいずれか 1 つ>
**場所**: `path/to/file.ext:line` または `path/to/file.ext:start_line-end_line`
**カテゴリ**: <セキュリティ / 正確性 / テスト / 設計整合 / 可読性 / パフォーマンス / 後方互換性 / その他>

**問題**: 何が問題なのかの説明

**影響**: 修正しない場合に起こりうること

**修正提案**:
```<lang>
// Before
[問題のあるコード]

// After
[修正されたコード]
```

**理由**: なぜこの修正が有効か（仕様・規約・参考リンク等の根拠）
````

### 例

````markdown
### [1] 入力バリデーションが空文字を通す
**重大度**: 🔴 Critical
**場所**: `src/auth/login.ts:42-45`
**カテゴリ**: セキュリティ

**問題**: 入力バリデーションが不足しており、空文字でログインが通る可能性がある。

**影響**: 不正ログイン / 認証バイパスにつながる恐れ。

**修正提案**:
```ts
// Before
if (loginUser(username, password)) { ... }

// After
if (!username || !password) {
  throw new ValidationError("...");
}
if (loginUser(username, password)) { ... }
```

**理由**: 認証の入力検証は前段で実施することで、後段のログイン処理に空文字や undefined が渡るのを防ぐ。
````

## 全体コメントテンプレートの選択

PR レビュー本体に投稿する全体コメントは、Critical / High の検出有無で 2 つのテンプレートから選ぶ:

| 条件 | 使用テンプレート |
|---|---|
| Critical / High が 0 件（指摘なし、または 🔵 Medium / 🟢 Low のみ） | [`pass-template.md`](pass-template.md) |
| Critical または High が 1 件以上 | [`fail-template.md`](fail-template.md) |

## プレースホルダ置換ルール

| プレースホルダ | 値 | 取得方法 |
|---|---|---|
| `{{pr_author}}` | PR 作成者の GitHub ユーザー名 | `gh pr view <番号> --json author --jq '.author.login'` |
| `{{reviewer_name}}` | gh 認証中の GitHub ユーザー名 | `gh api user --jq '.login'` |
| `{{commit_sha}}` | PR ヘッドコミットの SHA（先頭 7 桁） | `gh pr view <番号> --json headRefOid --jq '.headRefOid[0:7]'` |

## 投稿前チェックリスト

レビューコメント投稿前に以下をすべて確認する:

- [ ] 各指摘に **重大度ラベル**（Critical / High / Medium / Low）が 1 つだけ付いている
- [ ] **場所** が `path:line` または `path:start-end` 形式
- [ ] **カテゴリ** が記入されている
- [ ] **問題** **影響** **理由** がすべて記述されている（空欄や省略なし）
- [ ] **Before / After** のコードブロックが言語指定付きで開閉している（` ``` ` のペアが揃っている）
- [ ] ヘッダーの `{{pr_author}}` `{{reviewer_name}}` `{{commit_sha}}` がすべて置換済み（`@` プレフィックス付き）
- [ ] フッターの「AI 補助レビュー」明示文が含まれている
- [ ] Critical / High が 0 件の場合は「GUI から approve」案内文が追加されている
- [ ] シークレット・社内固有情報を含んでいない
- [ ] 既に他のレビュアーが指摘済みの内容と重複していない
