# テストガイドライン

テストコードは動作するドキュメント。読むだけで「何をテストしているか」「なぜそのケースが必要か」がわかることを目指す。

> **本テンプレの想定**: AI エージェント Web アプリ。テスト記述ルール・実行コマンドは採用言語・フレームワークで内容が変わる。本ファイル中の `{...}` プレースホルダと「例（{言語/FW}）」コード例は移植先で実体に合わせて置換する。

---

## 1. 基本方針

- **何をテストしているか** がテスト名・コメントから即座にわかる
- **なぜそのテストケースが必要か** がインラインコメントで説明されている
- **どの条件で何が起きるか** が入力と期待値の対応で明確である

---

## 2. テスト戦略と対象範囲

### 2.1 自動テストの対象

| 種別 | 対象 | 方針 |
|---|---|---|
| 単体テスト | モデル・ロジック・ユーティリティ・processor | 外部依存はすべてモック。`{テストランナー}`（例: pytest / Vitest / JUnit） |
| 結合テスト | API → ハンドラー → ストレージ連携 | DB / 外部 API はモック。`{API テストクライアント}`（例: TestClient / supertest / RestAssured） |
| 評価（Eval） | エージェントの出力品質 | データセットに対するスコアリング。詳細は §3 |

### 2.2 手動テストの対象

| 種別 | 理由 | 手動テストの方法 |
|---|---|---|
| E2E フルフロー | LLM の応答は決定論的でない | 開発者がブラウザでチャット UI を操作 |
| 探索的テスト・レッドチーム | 想定外の入力での挙動を網羅 | プロンプトインジェクション・PII 入力等 |
| 外部 API 実呼び出し | コスト・レート制限・データ汚染リスク | 評価データセットの一部として手動実行 |

### 2.3 自動 / 評価 / 手動の境界線

```
自動テスト（CI で毎回実行）
├── 単体テスト: モデル・ロジック・ユーティリティ
│   └── 外部依存 → すべてモック
├── 結合テスト: API → ハンドラー → ストレージ連携
│   └── DB / 外部 API → すべてモック
│
評価（Eval）（PR トリガー or 日次実行）
├── データセットに対するエージェント実呼び出し
└── スコアリング → しきい値で回帰判定
│
手動テスト（機能変更時・リリース前に実施）
├── E2E フルフロー
├── 探索的テスト・レッドチーム
└── 外部 API の実呼び出しを伴う検証
```

> **原則**: 外部 API の実呼び出しを伴うテストは「評価」または「手動テスト」に分離し、通常の自動テストには含めない。

---

## 3. 評価（Evaluation）

> **未確定**: エージェント機能を使わないプロジェクトは本章を削除する。

エージェントの出力は決定論的でないため、通常のユニットテストでは品質を担保できない。データセットに対するスコアリングで回帰を検出する。

### 3.1 評価データセット

| 項目 | 値 |
|---|---|
| 配置場所 | `{backend/evaluations/datasets/}` |
| フォーマット | {例: JSONL} |
| 更新ルール | {例: PR レビュー必須} |

### 3.2 評価指標

| 指標 | 計測方法 | 目標値 | 回帰判定しきい値 |
|---|---|---|---|
| 正確性 | LLM-as-Judge or 人手 | {N%} | {-N%} |
| ツール選択精度 | ground truth との一致率 | {N%} | {-N%} |
| 応答長 | 平均トークン数 | {N} | {+N} |
| コスト（1 リクエストあたり） | LLM 使用量から計算 | {$N} | {+N%} |
| レイテンシ | OTel スパンの duration | {N 秒} | {+N%} |
| ガードレール違反率 | ガードレール検出ヒット数 | {N%} | {+N%} |

### 3.3 LLM-as-Judge

> **未確定**: 使う場合のみ記載。使わない場合は本サブセクションを削除する。

| 項目 | 値 |
|---|---|
| ジャッジモデル | {例: gpt-4o} |
| ジャッジプロンプト配置 | {`evaluations/judges/`} |
| 人手レビューとの突合頻度 | {月 1 回} |

### 3.4 実行タイミング

- プロンプト・ツール・モデル変更時の PR で必須実行
- 日次バッチでドリフト検出
- 本番デプロイ前の最終ゲート

---

## 4. テストコードの記述ルール

### 4.1 テスト関数の命名

`test_<対象>_<条件>_<期待結果>` を基本とする。docstring / コメントで「何を・なぜ」を補足する。

```python
# 例（pytest Python の場合）
def test_settings_invalid_log_level_raises(monkeypatch):
    """LOG_LEVEL に Literal 外の値で ValidationError。

    起動時に不正値で落とすという受け入れ条件を担保する。
    """
    monkeypatch.setenv("LOG_LEVEL", "INVALID")
    with pytest.raises(ValidationError):
        Settings(_env_file=None)
```

```typescript
// 例（Vitest TypeScript の場合）
import { describe, it, expect } from "vitest";

describe("settings", () => {
  it("throws when LOG_LEVEL is invalid", () => {
    process.env.LOG_LEVEL = "INVALID";
    expect(() => loadSettings()).toThrow(ValidationError);
  });
});
```

### 4.2 Mock の方針

- **何をモックするか**: 外部 API（LLM プロバイダ・DB・観測性基盤）
- **何をモックしないか**: アプリ内部のビジネスロジック・ルーティング・バリデーション
- mock は `{モックライブラリ}`（例: pytest-mock / vi.mock / Mockito）を使う

### 4.3 結合テストの書き方

`{API テストクライアント}`（例: TestClient / supertest / RestAssured）を使う。HTTP クライアントは依存に含めるが直接使わない（テストクライアントの内部で使われる）。

```python
# 例（FastAPI TestClient の場合）
from fastapi.testclient import TestClient
from app.main import app

def test_healthz_returns_200_with_status_ok():
    client = TestClient(app)
    response = client.get("/healthz")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
```

### 4.4 ロガー / OTel のテスト相性

- `{構造化ログライブラリ}` の中にはキャッシュ機構を持つもの（例: structlog の `cache_logger_on_first_use=True`）があり、テストごとに設定を切り替えるなら専用のリセット関数を呼ぶ
- 構造化ログをアサートしたい場合は専用の捕捉機構（例: `LogCapture` / `capsys`）を使う
- OTel スパンをテストする時は、テスト内で `TracerProvider` をセットしてから `tracer.start_as_current_span(...)` でスパンを開く

---

## 5. テスト実行コマンド

> **未確定**: 採用言語・テストランナーに応じて以下のサンプルから該当するものを残す。

### 5.1 バックエンド

```bash
# 例（Python + pytest + uv の場合）
cd {backend ルート}
uv run pytest                       # 単体・結合テスト全部
uv run pytest tests/test_healthz.py # 1 ファイル
uv run pytest -v -k "settings"      # キーワードフィルタ
uv run pytest --cov=app             # カバレッジ表示
```

```bash
# 例（Node.js + Vitest の場合）
cd {backend ルート}
npm test                            # 単体・結合テスト全部
npm test -- src/healthz.test.ts     # 1 ファイル
npm test -- -t "settings"           # キーワードフィルタ
npm test -- --coverage              # カバレッジ表示
```

### 5.2 フロントエンド

```bash
# 例（Vite + Vitest の場合）
cd {frontend ルート}
npm run test                # 単体・コンポーネントテスト
npm run test -- --watch     # watch モード
npm run test -- --coverage  # カバレッジ表示
```

### 5.3 評価（Eval）

> **未確定**: 評価データセットの実装が進んでから具体化する。

```bash
# 例:
# uv run pytest evaluations/
# npm run eval
```
