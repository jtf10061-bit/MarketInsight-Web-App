# コミット・PR 規約

各スキル（create-branch, create-pr, fix-review 等）が参照する Conventional Commits 準拠の規約。

## Type 規約（Conventional Commits）

Conventional Commits の type をプロジェクト全体で統一して使う。コミットメッセージ・PR タイトル・ブランチプレフィックスはすべて下の表を参照する。

| type | 用途 | ブランチプレフィックス |
|------|------|---------------------|
| `feat` | 新機能 | `feat/` |
| `fix` | バグ修正 | `fix/` |
| `refactor` | リファクタリング（機能変更なし） | `refactor/` |
| `docs` | ドキュメントのみ | `docs/` |
| `chore` | ビルド・ツール設定・メンテナンス・依存更新 | `chore/` |
| `test` | テスト追加・修正 | （`chore/` に含める） |
| `style` | フォーマット変更（機能変更なし） | （`chore/` に含める） |
| `perf` | パフォーマンス改善 | （`feat/` または `fix/` に含める） |
| `ci` | CI/CD 設定 | （`chore/` に含める） |
| `hotfix` | 緊急対応（本番障害レベル） | `hotfix/`（main 起点） |

ブランチを切るのは主に上の 5 種（feat / fix / refactor / docs / chore）。`test` / `style` / `perf` / `ci` は単独でブランチを切らず、内容に近い親プレフィックスのブランチに含める。

## コミットメッセージ形式

```
<type>(<scope>): <subject>

<body>
```

- **scope**: 任意。変更対象のモジュールやコンポーネント名（例: `auth`, `api`, `ui`）
- **subject**: 変更内容の要約。日本語可。末尾にピリオドを付けない
- **body**: 任意。変更の背景や理由を記載

## PR タイトル形式

`<type>: <簡潔な説明>` の形式（scope 省略可）。type は上記表から選ぶ。
