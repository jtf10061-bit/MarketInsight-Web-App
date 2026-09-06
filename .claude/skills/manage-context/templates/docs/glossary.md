# ユビキタス言語定義

このプロジェクトで使う日本語・英語・コード命名の対応表。新規メンバーが用語の認識を揃えるために参照する。プロジェクトで使わないカテゴリは行ごと（または章ごと）削除する。AI エージェント機能を使わないプロジェクトは §2 を章ごと削除する。

> **本テンプレの想定**: AI エージェント Web アプリ。クラウド・データ・認証の固有用語は採用するスタックで変わる。本ファイル中の「例: {Azure / AWS / GCP}」併記から該当するものを残し、それ以外は削除する。

---

## 1. プロジェクト・利用者用語

| 用語（日本語） | 英語 | コード上の命名 | 定義 |
|---|---|---|---|
| 一次利用者 | Primary user | - | テンプレートを clone して案件を立ち上げる自社 PM・エンジニア |
| 二次利用者 | Secondary user / End user | `current_user` | 案件リリース後にプロダクトを使うエンドユーザー |
| 案件 | Project / Engagement | - | 個別の顧客向け納品物 |

---

## 2. AI エージェント用語

> **未確定**: AI エージェント機能を使わないプロジェクトは本章ごと削除する。

### 2.1 基本概念

| 用語（日本語） | 英語 | コード上の命名 | 定義 |
|---|---|---|---|
| エージェント | Agent | `agent` | LLM を中核に、ツール呼び出しと推論を反復してタスクを遂行するソフトウェア |
| 会話 | Conversation | `conversation` | ユーザーとエージェントの一連のやり取り |
| メッセージ | Message | `message` | 会話を構成する 1 単位（user / assistant / tool） |
| ターン | Turn | `turn` | ユーザー入力 1 回に対する応答完了までの単位 |
| ツール呼び出し | Tool Use / Tool Call | `tool_call` | エージェントが外部機能を呼ぶ動作 |
| ツール結果 | Tool Result | `tool_result` | ツール実行の戻り値 |
| Function Calling | Function Calling | - | LLM がツールを構造化された JSON で呼び出す機構 |
| ReAct パターン | ReAct Pattern | - | Reason → Act → Observe を繰り返すエージェント実装パターン |
| オーケストレーション | Orchestration | `orchestrator` | LLM 呼び出し・ツール実行・状態管理を統括する処理ループ |

### 2.2 メモリ・コンテキスト

| 用語（日本語） | 英語 | コード上の命名 | 定義 |
|---|---|---|---|
| コンテキストウィンドウ | Context Window | `context_window` | LLM に渡せるトークン数の上限 |
| 履歴の截断 | Truncation | `truncate_history` | 古いメッセージをコンテキストから削除する処理 |
| プロンプトキャッシュ | Prompt Cache | - | 共通プロンプトの再利用によるコスト削減機構 |
| 短期メモリ | Short-term memory | - | 現在の会話に閉じたメモリ |
| 長期メモリ | Long-term memory | - | 会話を跨ぐユーザー固有のメモリ |

### 2.3 ストリーミング・進捗

| 用語（日本語） | 英語 | コード上の命名 | 定義 |
|---|---|---|---|
| ストリーミング | Streaming | `stream` | 応答を部分的に順次送信する方式 |
| SSE | Server-Sent Events | - | HTTP 上の単方向ストリーミング規格 |
| 進捗イベント | Progress Event | `ProgressEvent` | エージェントの状態変化を伝えるイベント |
| 思考イベント | Thinking event | `THINKING` | エージェントが中間思考を出力したことを示す |
| 最終応答 | Final response | `FINAL_RESPONSE` | エージェントの最終回答テキスト |
| ハートビート | Heartbeat | - | SSE 接続維持のための定期的な ping |

### 2.4 制約・予算

| 用語（日本語） | 英語 | コード上の命名 | 定義 |
|---|---|---|---|
| ツール呼び出し上限 | Max tool turns | `MAX_TOOL_TURNS` | 1 ターン内のツール呼び出し回数の上限 |
| メッセージ上限 | Max messages | `MAX_MESSAGES` | コンテキストに含める直近メッセージ数の上限 |
| TTFT | Time To First Token | - | ユーザー送信から最初のトークン受信までの時間 |
| コールドスタート | Cold start | - | スケールトゥーゼロ後の初回起動 |
| ガードレール | Guardrail | `guardrail` | 入出力の安全性チェック |

### 2.5 ツール・データツール

| 用語（日本語） | 英語 | コード上の命名 | 定義 |
|---|---|---|---|
| ハードコード型ツール | Hard-coded tool | - | クエリ内容をツール内に固定し、LLM はパラメータのみ渡すツール実装パターン |
| text-to-SQL | Text-to-SQL | - | 自然言語から SQL を生成する技術（拡張ポイント） |
| サンプルツール | Sample tool | - | 案件側で差替え前提のリファレンス実装 |

### 2.6 評価・観測性

| 用語（日本語） | 英語 | コード上の命名 | 定義 |
|---|---|---|---|
| 評価 | Evaluation / Eval | `eval` | データセットに対する自動採点 |
| 評価データセット | Evaluation Dataset | - | 質問と期待される回答・ツール呼び出しパターンのセット |
| LLM-as-Judge | LLM-as-Judge | - | LLM 自体に出力品質を判定させる手法 |
| トレース | Trace | `trace` / `run_trace` | 1 リクエストの全 LLM 呼び出し・ツール呼び出し履歴 |
| ハルシネーション | Hallucination | - | LLM が事実と異なる内容を生成する現象 |

---

## 3. データ・ストレージ用語

> **未確定**: DB を使わないプロジェクトは本章ごと削除する。使う DB の固有用語に書き換える。

| 用語（日本語） | 英語 | コード上の命名 | 定義 |
|---|---|---|---|
| {コンテナ / テーブル} | {Container / Table} | `container_name` | データベース内のドキュメント集合 / 行集合 |
| {ドキュメント / レコード} | {Document / Record} | - | コンテナ内の 1 件のデータ |
| {パーティションキー / 主キー} | {Partition Key / Primary Key} | - | データを物理的に分散するキー、または一意キー |
| {RU / コネクション数 等} | {Request Unit / Connection 等} | - | スループット単位 |

---

## 4. インフラ用語

| 用語（日本語） | 英語 | コード上の命名 | 定義 |
|---|---|---|---|
| サブスクリプション / アカウント | Subscription / Account | - | クラウドの課金単位 |
| リソースグループ / プロジェクト | Resource Group / Project | - | リソースを論理的にまとめる単位 |
| クラウドネイティブ ID | Cloud-native identity | - | クラウドリソースに付与される ID。シークレットなしで他リソースを認証可能（例: Azure Managed Identity / AWS IAM Role / GCP Workload Identity） |
| シークレット管理 | Secret management | - | API キー・接続文字列の保管所（例: Key Vault / Secrets Manager / Secret Manager） |
| 観測性基盤 | Observability platform | - | アプリケーション監視サービス（例: Application Insights / CloudWatch / Cloud Trace / Datadog） |

---

## 5. 開発・運用用語

| 用語（日本語） | 英語 | コード上の命名 | 定義 |
|---|---|---|---|
| 設定管理 | Settings | `Settings` クラス | 環境変数を型安全に扱う仕組み |
| 構造化ログ | Structured logging | `logger` | JSON 出力等の構造化された形式のログ |
| Pre-commit | Pre-commit | - | コミット前にリント・型チェック等を自動実行する仕組み |
| Lint / Format | Lint / Format | - | コードスタイルチェッカー |
| 静的型チェック | Type check | - | 実行前に型不整合を検出するツール |
| OpenTelemetry | OpenTelemetry / OTel | - | ベンダーニュートラルな観測性データ収集の業界標準 |
| IaC | Infrastructure as Code | - | クラウドインフラをコードで定義する手法 |
| デバッグモード | Debug mode | `DEBUG_MODE` | 認証スキップ等のローカル開発用フラグ |

---

## 6. 認証・ロール用語

> **未確定**: 認証を使わないプロジェクトは本章ごと削除する。

| 用語（日本語） | 英語 | コード上の命名 | 定義 |
|---|---|---|---|
| プロバイダ | Provider | `provider` | 認証の発行元 |
| Subject | Subject | `sub` / `subject` | JWT 内のユーザー識別子 |
| OIDC | OpenID Connect | - | OAuth 2.0 を拡張した認証プロトコル |
| PKCE | Proof Key for Code Exchange | - | OAuth 2.0 認可コードフローの拡張 |
| JWT | JSON Web Token | - | 認証情報を含む署名付きトークン |
| JWKS | JSON Web Key Set | - | JWT 検証用の公開鍵セット |
| 管理者ロール | Admin role | `admin` | 全データへのアクセス・他ユーザーの権限変更が可能 |
| 一般ロール | User role | `user` | 自分の所属組織のデータのみ参照可能 |

---

## 7. ドメイン用語（案件で追加）

各案件で固有のドメイン用語をここに追加する。テンプレート初期では空。`§1`〜`§6` と同じ表形式（用語（日本語）/ 英語 / コード上の命名 / 定義）で追記する。
