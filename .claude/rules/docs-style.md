---
description: docs/ 配下のドキュメント作成・更新時に参照する書式統一ルール
paths:
  - docs/**
---

# ドキュメント書式ルール

`docs/` 配下の永続的設計ドキュメント（`product-requirements.md` / `functional-design.md` / `agent-design.md` / `architecture.md` / `repository-structure.md` / `development-guidelines.md` / `testing-guidelines.md` / `glossary.md` および `solutions/_index.md`）を横断する書式ルール。読み手が複数ファイルを行き来する時の認知負荷を最小化することを目的とする。

関連 rules との棲み分け：

| ファイル | 役割 |
|---|---|
| 本ファイル（[`docs-style.md`](docs-style.md)） | 図以外の書式（リンク・章番号・コード長・用語等） |
| [`docs-content.md`](docs-content.md) | 8 ファイルの役割分担（どのファイルに何を書くか） |
| [`diagrams.md`](diagrams.md) | 図に特化した配置先・記法・OK/NG 例 |

---

## 1. 図記法

→ [`diagrams.md`](diagrams.md) を参照。配置先・Mermaid / ASCII の使い分け・OK/NG 例はそちらに集約している。

---

## 2. 内部リンク表記

### ルール

- ファイル参照は **`[file.md](file.md)` の Markdown リンク形式** に統一
- バッククォート単独（`` `file.md` ``）は禁止（クリックできない）
- フルパス（`docs/architecture.md`）は禁止（相対パスを使う）
- セクションへのアンカーリンクは `[file.md §N.M](file.md#N-M-title)` の形式

### OK 例

```markdown
詳細は [`agent-design.md`](agent-design.md) を参照。
通信方式は [`architecture.md` §5](architecture.md#5-通信方式) を参照。
```

### NG 例

```markdown
詳細は `agent-design.md` を参照。              ← クリックできない
詳細は docs/agent-design.md を参照。           ← フルパス
詳細は ../docs/agent-design.md を参照。        ← 相対パスの ../
```

---

## 3. セクション参照

### ルール

- 本文中でセクションを指す時は **`§N.M` 形式** に統一
- 「セクション N」「Section N」「(N 参照)」等の表記は禁止
- 章番号がない見出しを参照する場合は引用符で見出し名を書く（`「ガードレール」セクション参照`）

### OK 例

```markdown
詳細は §6.4 を参照。
他ファイルなら [`agent-design.md`](agent-design.md) §3.4 を参照。
```

### NG 例

```markdown
詳細はセクション 6.4 を参照。
詳細は (§6.4 参照) を確認。
詳細は agent-design.md の 6.4 節を参照。
```

---

## 4. 章番号と見出し階層

### ルール

- **章番号は `## N. タイトル` / `### N.M サブタイトル` の階層のみ** 使う
- `§` を見出しに使わない（`§` は本文中の参照記号としてのみ使用）
- 章番号外の独立セクション（「コア」「概要」など）を最上位に置かない。`## N.` の階層に統合する
- `# H1` はファイル先頭のタイトル 1 個のみ

### OK 例

```markdown
# プロダクト要件定義書

## 1. 概要

### 1.1 目的

## 2. 機能要件
```

### NG 例

```markdown
# プロダクト要件定義書

## コア          ← 章番号外で浮いている
## 1. 概要
### §1.1 目的    ← 見出しに § を使わない
```

---

## 5. Issue / PR 参照

### ルール

- **`Issue #N` / `PR #N` のフル表記** に統一
- 番号単独（`#N`）は本文中の補足以外では避ける
- 同じ行で同じ Issue を再度書く場合は省略可

### OK 例

```markdown
詳細は Issue #11 で対応する。
PR #66 のレビュー指摘 2 件に対応した。
```

### NG 例

```markdown
詳細は #11 で対応する。              ← 単独
詳細は (Issue 11) で対応する。        ← # がない
```

---

## 6. code block 言語指定

### ルール

- **コメント付き JSON は `jsonc`** を指定（`// ...` を許容するため）
- **コメントなし JSON は `json`**
- **Python / TypeScript / bash / yaml / mermaid 等** は対応する正式な言語名を指定（`py` / `ts` 等の略記は避ける）
- 言語不明なテキストブロックでも空指定は避け、可能な限り言語を指定する

### OK 例

````markdown
```jsonc
{
  "id": "abc",   // ユニーク ID
  "name": "..."
}
```

```python
async def search_items(...) -> dict: ...
```
````

### NG 例

````markdown
```json
{
  "id": "abc",   // ← // コメントを含むのに json
  "name": "..."
}
```

```py             ← 略記
async def search_items(...) -> dict: ...
```
````

---

## 7. TODO・未確定箇所の表記

### ルール

- **未確定箇所は引用 callout 形式** に統一: `> **未確定**: ...`
- HTML コメント（`<!-- TODO: ... -->`）は禁止（読者から見えない）
- 表内の `TBD` は許容するが、その表全体を `> **未確定**: ...` callout で囲って **読者から見える未確定領域** にする
- 「Issue #N で確定予定」のように **解消条件** を明記する

### OK 例

```markdown
> **未確定**: 評価指標の具体値は Issue #12（CI/CD）完了時に確定する。現状は仮置き。

| 指標 | 計測方法 | 目標値 |
|---|---|---|
| 正確性 | LLM-as-Judge | TBD |
```

### NG 例

```markdown
<!-- TODO: Issue #12 で確定 -->     ← HTML コメントは見えない

評価指標は今後決定する。               ← 解消条件が不明
```

---

## 8. 強調・callout

### ルール

- **重要事項は引用 callout 形式**（`> **重要**: ...`）に統一
- 本文中の `**重要**` 単独太字は使わない（前後の区切りが弱く目立たない）
- 警告は `> **注意**: ...` / `> **落とし穴**: ...` を使う
- 通常の太字（`**...**`）は単語・キーワードの強調に使い、文全体の強調には callout を使う

### OK 例

```markdown
> **重要**: distro と `FastAPIInstrumentor.instrument_app()` の併用は禁止。

> **落とし穴**: SSE はリバースプロキシでバッファされると機能しない。
```

### NG 例

```markdown
**重要**: distro と FastAPIInstrumentor の併用は禁止。   ← callout でない
```

---

## 9. コードブロックの長さ

### ルール

- **設計書内のコードブロックは原則 15 行以内**
- 15 行を超える場合は以下のいずれかに置き換える:
  - **型定義・シグネチャ・責務のみ** 残し、実装ロジックは実コード（`backend/app/...`）へのリンクに置換
  - **概念・トリガー条件の表** に置き換え
  - 詳細は `docs/.steering/` 側に逃がす（設計判断の経緯として記録）
- 例外: API レスポンスサンプル・スキーマ定義など、丸ごと引用する価値があるものは超過してよい

### OK 例

````markdown
```python
@dataclass(frozen=True)
class ToolEntry:
    func: Callable[..., Awaitable[dict]]
    input_schema: type[BaseModel]
    description: str
```

実装の詳細は [`backend/app/agent/tools/__init__.py`](../backend/app/agent/tools/__init__.py) を参照。
````

### NG 例

設計書に 30 行超の `execute_tool` 完全実装を貼ること（実コードと二重メンテになる）。

---

## 10. 用語

### ルール

- **`glossary.md` に定義された用語を使う**。略記・揺れを避ける
- 略記の使用例:
  - `FE` / `BE` → `フロントエンド` / `バックエンド` または `frontend` / `backend`（コード文脈ではコード命名に従う）
  - `LLM` `API` `SSE` `OIDC` 等の業界標準略語はそのまま使ってよい
- 同じ概念を複数の表記で書かない（例: 「ストリーム」「ストリーミング」が混在しない）

### OK 例

```markdown
バックエンド（FastAPI）は `backend/app/` 配下に配置する。
SSE で配信される ProgressEvent を受信する。
```

### NG 例

```markdown
BE（FastAPI）は backend/app/ 配下に配置する。  ← 略記
SSE でストリームされる ... ストリーミング処理   ← 表記揺れ
```

---

## 11. 適用範囲と例外

- 本ルールの適用範囲: `docs/` 配下のすべての `.md`（`.steering/` 配下も含む）
- 例外:
  - `docs/.steering/` 配下の **過去の steering** は履歴として残し、書式統一の対象外（書き換えない）
  - `docs/.steering/` 配下の **steering ファイル**（`requirements.md` / `design.md` / `tasks.md` / `index.md`）は [`.steering.md`](.steering.md) のテンプレート構造に従い、`§4`（章番号と見出し階層）の制約は適用しない（`## 概要` / `## 背景` / `## アーキテクチャ概要` などの番号なし見出しを許容）。それ以外のルール（リンク・図・コード長・TODO 表記・用語等）は適用する
  - `solutions/` 配下の **個別ナレッジファイル** は当面対象外（`/record-solution` スキルのフォーマット改修と同時に対応）
- 適用判断に迷ったら本ファイルの該当ルールに従う。本ルールに記載がない場合は、既存の整形済みファイル（`development-guidelines.md` など）を参考にする

---

## 関連ドキュメント

- ファイルの役割分担 → [`docs-content.md`](docs-content.md)
- 図表の配置・記法 → [`diagrams.md`](diagrams.md)
- アクセス制約のあるファイル → [`restricted-files.md`](restricted-files.md)
