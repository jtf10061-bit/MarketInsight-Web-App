# モード 3: 更新

既存の CLAUDE.md / docs/ を保持しつつ、現在のソースコードを正として既存 doc を最新化する。

## 前提

- `docs/` 配下に主要ファイルが一部 or 全部存在する状態を想定
- 既存ファイルは **承認なしに自動上書きしない**（差分提案 → 承認 → 反映の順を厳守）

## ステップ 1: リポジトリスキャン + 既存 doc 状態確認

サブエージェント（Read / Glob / Grep / Bash 可）に以下を実施させる:

- [`mode-scan.md` のステップ 1](mode-scan.md) と同じ項目を抽出（技術スタック / コマンド / ディレクトリ / lint / ブランチ / LLM 関連）
- `docs/` 配下の必須 doc（[`docs-content.md`](../../../rules/docs-content.md) の表を参照）の存在状況を確認
- 各 doc の冒頭 callout に `> **status: not-applicable**` が含まれる場合は「未使用 doc」として記録

検出結果をユーザーに提示:

```
[manage-context モード 3]
必須 doc の状態:
  ✅ docs/product-requirements.md
  ✅ docs/functional-design.md
  ✅ docs/architecture.md
  ⏭ docs/agent-design.md（未使用マーカー）
  ❌ docs/repository-structure.md（不足）
  ✅ docs/development-guidelines.md
  ✅ docs/testing-guidelines.md
  ✅ docs/glossary.md
```

## ステップ 2: 更新候補リスト提示 + ユーザー選択

`status: not-applicable` マーカー検出 doc は候補リストから自動除外する（再有効化する場合は当該 callout を手動で消してから本モードを再実行）。

```
更新したい対象を選択してください（複数選択可。例: "1,3" / "all" / 数字単独）:
  1. product-requirements.md
  2. functional-design.md
  3. architecture.md
  4. repository-structure.md
  5. development-guidelines.md
  6. testing-guidelines.md
  7. glossary.md
  8. all（候補すべてを実装と突き合わせ / 不足は新規作成 / 既存は差分提案）

→
```

## ステップ 3: ユーザー選択 → 自動分岐

選択された対象の種別（不足 / 既存）に応じて自動分岐する。複数選択時は **順次処理**（並列にはしない）。各 doc 完了後にユーザー承認を挟む（一括承認は禁止）。

### 3-A: 不足ファイル → 新規作成フロー

[`mode-scan.md` のステップ 4](mode-scan.md) と同じ流れで新規作成する。

### 3-B: 既存ファイル → 差分提案フロー

1. 現状の `docs/<ファイル名>` を Read
2. 対象 doc 担当サブエージェントを起動。入力: 現状の doc 全文 + ステップ 1 のスキャン結果 + 処理済みの前 doc 群
3. サブエージェントへの指示:
   - 現状の doc を **尊重** しつつ、現在のソースコードと乖離している箇所を検出して **差分案だけ** 提示
   - **全文書き換え禁止**。追記・修正・削除する箇所だけを示す
   - 既存の章構成・用語・記述スタイルを変えない
   - [`.claude/rules/docs-style.md`](../../../rules/docs-style.md) / [`.claude/rules/diagrams.md`](../../../rules/diagrams.md) 準拠
   - 差分が 0 件なら **「乖離なし」** とだけ返す
4. ユーザーに差分案を提示 → 承認 → Edit でピンポイント反映

### 3-C: `all` 選択時

ステップ 1 の検出結果に従い、全 doc を mode-scan と同じ順序で順次処理する。不足は 3-A、既存は 3-B のフローで処理。

## ステップ 4: 担当サブエージェント

担当範囲・分析対象（実装側）の表はいずれも [`mode-scan.md` の「担当範囲の境界」「分析対象（実装側）の対応表」](mode-scan.md) を一次ソースとする。

## ステップ 5: 完了報告

更新したファイルの一覧を報告する:

```
更新完了:
  ✅ docs/architecture.md（差分反映: テクノロジースタック表に 2 行追加 / 環境変数表に 1 行追加）
  ✅ docs/repository-structure.md（新規作成）
  ⏭  docs/glossary.md（乖離なし）
```
