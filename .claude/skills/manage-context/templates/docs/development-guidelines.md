# 開発ガイドライン

コーディング規約・命名規則・環境変数管理・セキュリティ。Git / コミット / PR の規約は [`.claude/skills/workflow-conventions.md`](../.claude/skills/workflow-conventions.md) を参照。

> **本テンプレの想定**: AI エージェント Web アプリ。コーディング規約は採用言語・フレームワークで内容が大きく変わる。本ファイル中の `{...}` プレースホルダと「例（{言語/FW}）」コード例は移植先で実体に合わせて置換する。

---

## 1. コーディング規約

> **未確定**: フロントエンド/バックエンドがない場合は該当セクションを削除する。

### 1.1 バックエンド

#### レイヤー間の依存方向

レイヤ構造の図は [`architecture.md` §4.1](architecture.md#41-バックエンドのレイヤ構造) を参照。コーディング上のルール：

- **`api → agent → repositories`** は単方向。逆方向の import は禁止
- **`core` は全レイヤーから参照可能**（横断的関心事のため）
- **`llm` は `agent` から呼ばれる**。`api` から直接呼ばない

#### 設定取得

- **DI 経由のみ使う**（モジュール変数で設定値を直接 import するのは禁止）
- リクエストコンテキスト外（起動時ログ等）でのみ設定取得関数を直接呼んでよい
- 環境変数の直読み（`os.getenv()` / `process.env` 等）は **禁止**。新しい環境変数は必ず設定スキーマ（`{設定管理ライブラリ}` 例: Pydantic Settings / Zod / Viper）に型注釈付きで追加する

#### ロギング

- ロガー取得は **共通ユーティリティ経由のみ**（標準ライブラリの直接利用は禁止）
- ログ呼び出しは **キーバリュー（構造化）** で書く
- 文字列フォーマット（f-string / template literals）は使わない（構造化が崩れる）
- リクエスト単位のフィールド（`request_id` 等）は **ミドルウェアでコンテキスト束縛**

```python
# 例（Python + structlog の場合）
logger.info("tool_called", tool="search_items", user_id=123)
```

```typescript
// 例（Node.js + pino の場合）
logger.info({ tool: "search_items", user_id: 123 }, "tool_called");
```

#### エラーハンドリング・例外階層

- カスタム例外階層を定義し、API 層でフレームワーク固有の HTTP エラー型に変換する（[`architecture.md` §4.4](architecture.md#44-例外階層) 参照）
- ユーザー入力の検証は `{検証ライブラリ}`（例: Pydantic / Zod / class-validator）で行う（フレームワークが自動的に 422 を返す機構と組み合わせる）

#### 観測性

- OpenTelemetry の初期化は `{backend ルート}/{core ルート}/observability.{言語拡張子}` に集約。**エントリポイントの最上部で初期化関数を呼ぶ**
- 自動計測は最小限。HTTP クライアント / DB 等の追加計測は必要になった時点で対応
- 詳細は [`architecture.md` §7](architecture.md#7-観測性) 参照

### 1.2 フロントエンド

#### コンポーネント規約

- **`features/<name>/` 間の相互 import を禁止**: 共有が必要なら `src/lib/` か `src/components/` に切り出す
- **import alias を必ず使う**: 相対パス `../../` は禁止（例: `@/*` エイリアス）
- **barrel `index.ts` を作らない**: 各ファイルから直接 import する
- **UI コンポーネントライブラリ専用領域を分ける**: コピペ型ライブラリ（例: shadcn/ui）採用時は専用ディレクトリ（例: `src/components/ui/`）を確保し、手書きコンポーネントとは分ける

#### 状態管理

| 状態の種類 | 採用ツール（例） | 配置 |
|---|---|---|
| 1 ターンの状態 | `{ローカル状態管理}`（例: useReducer + reducer 分離 / Pinia ストア） | `features/<name>/reducer.{言語拡張子}` |
| 横断状態 | `{グローバル状態管理}`（例: Zustand / Redux / Recoil） | `src/stores/` |
| サーバー状態 | `{サーバー状態管理}`（例: TanStack Query / SWR / RTK Query） | `features/<name>/api/` |

#### スタイリング

- `{スタイリング}`（例: Tailwind CSS / CSS Modules）を採用
- `{UI コンポーネントライブラリ}`（例: shadcn/ui / MUI）を専用ディレクトリにコピー or import して使用

#### テスト

- **co-located**: ソースと同じディレクトリに `*.test.{言語拡張子}` を置く
- `{テストランナー + コンポーネントテストライブラリ}`（例: Vitest + React Testing Library / Jest + Enzyme）を採用
- **reducer は pure 関数として網羅テスト**: 1 アクション = 1〜複数ケース

#### 防御・エラーハンドリング

- アプリのルート直下を `{ErrorBoundary 相当}` で包む
- 非同期エラーは Toast 等で通知し、状態管理に `STREAM_ERROR` 等を dispatch する
- BE から不正な JSON / スキーマ違反のイベントが届いた場合は `{ランタイム検証}`（例: Zod の `safeParse`）で握りつぶしてストリームを継続する

### 1.3 リンター・フォーマッター

| 対象 | ツール（例） | 設定ファイル |
|---|---|---|
| `{言語1}`（例: Python） | `{Lint/Format}`（例: Ruff / Black + flake8） | `{backend ルート}/pyproject.toml` 等 |
| `{言語2}`（例: TypeScript / JavaScript） | `{Lint/Format}`（例: Biome / ESLint + Prettier） | `{frontend ルート}/biome.json` 等 |
| シークレット検出 | gitleaks | `.pre-commit-config.yaml` |
| 共通衛生 | pre-commit hooks | `.pre-commit-config.yaml` |

すべて `.pre-commit-config.yaml` で実行する。コミット前に自動的に走る。CI でも `pre-commit run --all-files` を実行する。

---

## 2. 命名規則

言語標準と異なる規約は本プロジェクトでは設けない。**採用する各言語の標準規約に従う**（例: Python なら PEP 8、TypeScript なら camelCase / PascalCase、Go なら gofmt 標準等）。

### 例外（プロジェクト固有）

| 対象 | 規則 | 例 |
|---|---|---|
| 環境変数 | `UPPER_SNAKE_CASE` | `LOG_LEVEL`, `LLM_MODEL` |
| ログイベント名 | `snake_case`、動詞または名詞 | `tool_called`, `app_started`, `llm_request_failed` |
| Span 名 | OTel 慣習に従う（HTTP は `METHOD /path`） | `GET /healthz` |

---

## 3. Git 規約

コミットメッセージ規約・PR タイトル規約は [`.claude/skills/workflow-conventions.md`](../.claude/skills/workflow-conventions.md) で、プロジェクト固有のブランチ戦略・PR 設定は [`.claude/skills/workflow-config.md`](../.claude/skills/workflow-config.md) で管理する。スキル（`/create-branch`, `/create-pr` 等）がこれらの設定を参照して自動化する。

---

## 4. 環境変数管理

- **`.env` は git 管理外**（`.gitignore` に追加）
- **`.env.example` をリポジトリルートに含める**（必要な変数名とコメントを記載、本番値は書かない）
- **本番値はクラウドのシークレット管理サービス**（例: Key Vault / Secrets Manager / Secret Manager）に格納し、クラウドネイティブ ID（例: Managed Identity / IAM Role / Workload Identity）経由で取得する
- **新しい環境変数は必ず `{設定スキーマ}` に型注釈付きで追加**（環境変数直読み禁止）
- 起動時の不正値はバリデーションで **即エラーで落とす**

---

## 5. セキュリティ

- **API キー・接続文字列のハードコード禁止**。すべて環境変数またはシークレット管理サービス経由
- **CORS は許可オリジンを明示的に指定**（`"*"` 禁止）
- **ユーザー入力のバリデーション必須**（`{検証ライブラリ}` 経由）
- **SSE レスポンスにユーザー入力をそのまま含めない**（XSS 対策、HTML エスケープを徹底）
- **ログにシークレット・PII を出さない**。トークン・パスワード・メール本文等は構造化ログのフィールドに含めない
- **依存パッケージはサプライチェーン防御標準に従う**: cooldown 期間・lock 固定・hashes 検証
