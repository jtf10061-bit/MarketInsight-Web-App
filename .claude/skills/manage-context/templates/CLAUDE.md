# {プロジェクト名}

{プロダクトの 1-3 行サマリ}

---

## コア要件

**{最優先要件を 1 行で記入}**

これが最優先。他のすべての判断はこれに従属する。

---

## 設計図

実装時は `docs/` 配下の設計図を必要に応じて参照する。各ファイルの役割と記載内容は [`.claude/rules/docs-content.md`](.claude/rules/docs-content.md) を参照。

---

## 確定した技術スタック

詳細は [`docs/architecture.md`](docs/architecture.md) の「テクノロジースタック」を参照。

---

## ディレクトリ構成

詳細は [`docs/repository-structure.md`](docs/repository-structure.md) を参照。

---

## 重要な原則

### .steering 運用

詳細は [`.claude/rules/.steering.md`](.claude/rules/.steering.md) を参照。

### docs 運用

各ファイルの役割と記載内容は [`.claude/rules/docs-content.md`](.claude/rules/docs-content.md) に従う。新しいドキュメントを増やさず、既存ファイルに追記する。

### アクセス制約のあるファイル

`.env` / 秘密鍵 / 認証情報ファイルは Read / Edit / Write / Bash 経由の読み取りが拒否される。詳細・代替フローは [`.claude/rules/restricted-files.md`](.claude/rules/restricted-files.md) を参照。

{注意点があればここに追記。なければセクションごと削除}
