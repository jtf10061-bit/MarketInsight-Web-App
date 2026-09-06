---
name: record-solution
description: 解決済みの問題を docs/solutions/ に記録し、_index.md を更新する。コミット後に知見を残したい時に使う。
disable-model-invocation: true
---

# 解決記録の作成

以下の手順で `docs/solutions/` に記録を作成する。

## 1. 情報の収集

ユーザーに以下を確認する：
- 何が問題だったか
- なぜ起きたか
- どう解決したか

## 2. タグとファイル名の決定

ファイル名は `タグ--問題名.md` の形式にする。

タグの例：
<!-- TODO: プロジェクトに合わせてタグを定義 -->
- `db` — データベース関連
- `ci` — CI/CD関連
- `api` — API関連
- `auth` — 認証関連
- `infra` — インフラ関連
- `ui` — フロントエンド関連

## 3. ファイルの作成

`docs/solutions/タグ--問題名.md` を以下の構成で作成する：

```markdown
# [問題の名前]

## 問題（何が起きたか）

## 原因（なぜ起きたか）

## 解決策（どう直したか）

## 関連ファイル
```

## 4. _index.md の更新

`docs/solutions/_index.md` の一覧にエントリを追加する。

```markdown
- [タグ--問題名](タグ--問題名.md) — 1行の要約
```
