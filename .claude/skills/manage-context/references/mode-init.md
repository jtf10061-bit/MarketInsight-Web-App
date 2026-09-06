# モード 1: 初期作成

コードがまだない新規プロジェクトを対話で立ち上げる。対話で要件を収集して CLAUDE.md と docs/ を **サブエージェント逐次起動** で順次生成する。

## 前提

- ソースコードがない状態を想定（リポスキャンは行わない）
- ユーザー回答 + 前 doc 群の内容のみが各サブエージェントの入力
- `.claude/`（agents / rules / skills / settings.json）は本テンプレリポから **単純コピー or git submodule** で持ち込まれている前提

## ステップ 1: ユーザー情報の収集

**概要 → 提案ベース → 軽く要約 → 次ステップ** の対話形式で進める。

未確定は「未定」と答えてよく、その項目は doc 側に `> **未確定**: ...` callout として残す。

### 1-1. プロジェクト概要（唯一の起点質問）

最初に **概要のみ** 1 問だけ聞く:

1. **プロジェクト概要**: 「このプロジェクトの目的を 1-3 行で教えてください」

### 1-2. 概要から各項目のデフォルトを推測 → **全項目を一括提示**

概要文をもとに、以下 7 項目を Claude が **まとめて推測・提示** し、1 回の返信でユーザーが差分だけ修正する。個別に 1 問ずつ聞かない。

提示フォーマット（1 メッセージで全項目を列挙する）:

```
概要をもとに各項目を推測しました。変更したい項目だけ教えてください（ok/希望値/未定）。

2. プロジェクト名: {推測値}（kebab-case）
3. コア要件 1 行: {推測値}
4. クラウド: {推測値}
5. LLM プロバイダ: {推測値}
6. Web FW・言語: {推測値}
7. コーディング規約: {推測値}
8. 注意点: {推測値}

全部 ok なら "ok" と返してください。
```

各項目の推測ルール:

2. **プロジェクト名**: 概要から推測した名前案（kebab-case / 英数字）を提示。例: 概要 "AI による議事録要約 Web アプリ" → `prj-meeting-summary` を提案
3. **コア要件 1 行**: 概要から最優先要件を 1 行に圧縮した案を提示
4. **クラウド**: テンプレデフォルト `Azure`（概要に AWS / GCP 言及があればそれを推測）
5. **LLM プロバイダ**: テンプレデフォルト `Azure OpenAI`（概要に「LLM を使わない」「エージェント機能なし」等と読めれば "なし" を推測 → `agent-design.md` は status: not-applicable マーカー扱い）
6. **Web フレームワーク・言語**: テンプレデフォルト `Python + FastAPI / TypeScript + Next.js`（概要に言語指定があればそれを推測）
7. **コーディング規約**: デフォルト「言語標準」。特記事項のみ聞く
8. **注意点**: デフォルト「なし」。落とし穴や例外のみ聞く

> LLM プロバイダで "なし" を選んだ場合、`agent-design.md` は status: not-applicable マーカー扱い（[ステップ 3](#ステップ-3-docs-の生成サブエージェント逐次起動) の注記参照）。

### 1-3. 収集結果のサマリ提示 + 承認

1-1 / 1-2 で集めた回答を以下の形式で **軽く要約してユーザーに提示** し、承認を得てからステップ 2 へ進む:

```
[manage-context モード 1] 収集結果サマリ
  プロジェクト名: {値}
  概要: {1-3 行}
  コア要件: {値}
  クラウド: {値}
  LLM プロバイダ: {値 or "なし"}
  Web FW・言語: {値}
  コーディング規約: {値 or "言語標準"}
  注意点: {値 or "なし"}
  未確定項目: {一覧 or "なし"}

→ これで CLAUDE.md / docs/ を生成して良いですか？（"yes" / 修正したい項目）
```

修正希望があれば該当項目だけ再質問する。承認後にステップ 2 へ進む。

## ステップ 2: CLAUDE.md の生成

`.claude/skills/manage-context/templates/CLAUDE.md` をベースに、以下を埋めた CLAUDE.md を生成する：

| 埋める箇所 | 出典 |
|---|---|
| プロジェクト名 + 1-3 行サマリ | ステップ 1 質問 1・2 |
| **コア要件**（最優先要件 1 行） | ステップ 1 質問 3 |
| 注意点（任意） | ステップ 1 質問 8 |

設計図 / 確定した技術スタック / ディレクトリ構成は `docs/` 配下へのリンクのみ（テンプレ既定）。詳細はそれぞれ `docs-content.md` / `docs/architecture.md` / `docs/repository-structure.md` を参照させる構成。

生成した CLAUDE.md をユーザーに提示し、**承認を得てから** ファイルに書き込む。

## ステップ 3: docs/ 配下のサブエージェント逐次生成

`docs/.steering/` と `docs/solutions/` はテンプレートからそのまま配置する：

```bash
mkdir -p docs/.steering docs/solutions
# .claude/skills/manage-context/templates/docs/.steering/.gitkeep を docs/.steering/.gitkeep に配置
# .claude/skills/manage-context/templates/docs/solutions/_index.md を docs/solutions/_index.md に配置
```

各 docs ファイルは **サブエージェントを 1 ファイルにつき 1 つ、順次起動** して生成する。

### 起動順序

```
1. PRD（product-requirements.md）   ← ユーザー回答を起点
2. functional-design.md             ← PRD を入力
3. architecture.md                  ← PRD + functional-design を入力
4. agent-design.md                  ← PRD + functional-design + architecture を入力
5. repository-structure.md          ← architecture を入力（予定構成として記述）
6. development-guidelines.md        ← architecture + repository-structure を入力
7. testing-guidelines.md            ← architecture + functional-design を入力
8. glossary.md                      ← 全 doc を入力
```

PRD が最初に来るのは、機能要件・受け入れ条件が後続 doc の起点になるため。

> 非エージェント案件では `agent-design.md` の冒頭 callout を `> **status: not-applicable** — 本案件ではエージェント機能を使用しないため未使用` に書き換えてファイル本体は残す。**ファイルごと削除しない**（mode-update / mode-scan の必須 doc 検査に引っかかるため）。詳細は [`docs-content.md`](../../../rules/docs-content.md) を参照。

### 各サブエージェントへの共通指示

- テンプレートファイル（`.claude/skills/manage-context/templates/docs/<ファイル名>`）のセクション構成に従うこと
- プレースホルダ（`{...}` 波括弧形式）と未確定 callout（`> **未確定**: ...`）を **ユーザー回答 + 前 doc 群の内容** で置き換えること
- 回答・前 doc に情報がないセクションは未確定 callout のまま残すこと
- 生成した内容を対象ファイルに直接書き込むこと
- **担当範囲外の情報は記載しない**（後述の境界に従う）
- **[`.claude/rules/docs-style.md`](../../../rules/docs-style.md) の書式統一ルールに準拠**（図記法は Mermaid 原則・内部リンクは `[file.md](file.md)` 形式・章番号は `## N. / ### N.M`・コードブロックは 15 行以内・TODO は引用 callout 形式）
- **[`.claude/rules/diagrams.md`](../../../rules/diagrams.md) の図記法ルールに従う**
- **特定スタック前提を埋め込まない**: ステップ 1 でユーザーが回答した実装スタック以外の固有名を生成しない
- **ユーザー回答にない技術判断は未確定 callout で残す**
- **コード例の冒頭に `# 例（{言語/FW}）` コメントを付ける**
- **コードがない前提のため、サンプル実装は書かない**。「想定」「予定」「方針」のレベルに留める

### 各サブエージェントへの追加コンテキスト

サブエージェントは並列ではなく **逐次起動** する。各エージェントには以下を渡す：

1. **ステップ 1 のユーザー回答全文**
2. **すでに生成済みの前 doc 群の内容**（直前までに承認されたファイルすべて）

これにより、用語・章構成・記述粒度が前 doc と整合する。

### 各 doc 生成後の承認

各サブエージェントが書き込みを完了したら、ユーザーに：

```
docs/<ファイル名> を生成しました。内容を確認してください。
承認いただけたら次のサブエージェント（<次のファイル名>）に進みます。
```

承認後、次のサブエージェントを起動する。修正要望があれば反映してから次へ。

### 担当範囲の境界

各 doc の主な担当章は [`docs-content.md`](../../../rules/docs-content.md) の表（`記載する内容` 列）を一次ソースとする。担当外の情報は記載しない。

> 非エージェント案件では `agent-design.md` の冒頭 callout を `> **status: not-applicable** — 本案件ではエージェント機能を使用しないため未使用` に書き換えて本文は空にする（ファイル自体は残す）。`functional-design.md` の ProgressEvent 言及・`glossary.md` の AI エージェント用語カテゴリ・`architecture.md` の LLM 基盤レイヤ章は案件側で章単位削除する。

## ステップ 4: 完了報告

生成・配置したファイルの一覧を報告する。

**書式準拠の確認を促す**：

- 生成された CLAUDE.md と docs/ が [`.claude/rules/docs-style.md`](../../../rules/docs-style.md) のルールに準拠していることを確認してください

次のステップを提案する：

- 各 docs ファイルのプレースホルダ（`{...}`）と未確定 callout を実装方針が固まり次第埋める
- 実装着手前に `/create-steering` で最初の steering を作成する
- `/create-issue` で最初の Issue を作成する

## 注意事項

- コードがない前提のため、サンプル実装コード・固有値（具体的なエンドポイント名・テーブル名等）は **書かない**。「想定」「予定」レベルに留める
- CLAUDE.md の「重要な原則」セクションはテンプレートの内容をそのまま使う（変更しない）
- ユーザー回答にない技術判断は未確定 callout で残す
- 各 docs ファイルは必ずユーザー承認を挟んでから次のサブエージェントを起動する
- `.claude/skills/workflow-config.md` は触らない（責務外）
