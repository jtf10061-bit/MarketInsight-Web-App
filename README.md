# MarketInsight Web App

MarketInsightAI のフロントエンド（React + TypeScript + Vite）です。

Microsoft Entra ID（MSAL）でログインし、バックエンド（FastAPI）の `/chat` エンドポイントに
接続して、ReAct エージェントの思考ステップをストリーミング表示します。

## 技術構成

| 項目 | 内容 |
| --- | --- |
| フレームワーク | React 19 + TypeScript |
| ビルドツール | Vite 8（`@vitejs/plugin-react`） |
| 認証 | `@azure/msal-browser` / `@azure/msal-react` |
| Markdown 表示 | `react-markdown` + `remark-gfm` |
| Lint | ESLint（`typescript-eslint`, `react-hooks`, `react-refresh`） |

## ディレクトリ構成

```
MarketInsight-Web-App/
├── index.html
├── vite.config.ts
├── src/
│   ├── main.tsx                 # エントリポイント（MsalProvider の設定）
│   ├── App.tsx                  # チャット画面本体（API 呼び出し・SSE 受信）
│   ├── components/
│   │   └── TypingText.tsx       # タイピングアニメーション表示
│   ├── config/
│   │   └── msalConfig.ts        # Entra ID の clientId / authority / redirectUri
│   ├── types/
│   │   └── chat.ts              # チャット関連の型定義
│   └── *.css
└── package.json
```

## 前提

- Node.js 20 以上（Vite 8 の要件）
- npm
- Python 3.10 以上（バックエンドを動かす場合）

## ローカルでの起動手順

このアプリは単体では動作しません。`src/App.tsx` の `API` 定数が
`http://127.0.0.1:9000` を指しているため、**バックエンドを先に起動**してください。

### 1. バックエンド（FastAPI / ポート 9000）

バックエンドは 3 つのローカルパッケージ（`MCP-Agent`, `History`, `Backend`）に
依存しているので、まとめて editable インストールします。

```bash
cd /Users/estyle-180/Documents/study/MarketInsightAI

# 仮想環境の作成・有効化
python3 -m venv .venv
source .venv/bin/activate

# ローカルパッケージをインストール
pip install -e MarketInsight-Lib
pip install -e MarketInsight-MCP-Agent
pip install -e MarketInsight-History
pip install -e MarketInsight-Backend
```

環境変数は各パッケージ直下の `.env` に置きます（`python-dotenv` で読み込まれます）。

`MarketInsight-MCP-Agent/.env`

```env
AZURE_OPENAI_ENDPOINT=https://<リソース名>.openai.azure.com/
AZURE_OPENAI_API_KEY=<APIキー>
AZURE_OPENAI_DEPLOYMENT=<デプロイ名>

GEMINI_API_KEY=<APIキー>
GEMINI_MODEL=<モデル名>
```

`MarketInsight-History/.env`

```env
COSMOS_ENDPOINT=https://<アカウント名>.documents.azure.com:443/
COSMOS_KEY=<プライマリキー>
COSMOS_DATABASE=<データベース名>
COSMOS_CONTAINER=<コンテナ名>
```

起動：

```bash
uvicorn marketinsight_backend.main:app --reload --port 9000
```

`http://127.0.0.1:9000/health` が応答すれば OK です。

> ポート 9000 は `src/App.tsx` の `API` 定数とバックエンドの CORS 設定
> （`allow_origins = ["http://localhost:5173"]`）が対になっています。
> 変更する場合は両方を合わせて直してください。

### 2. フロントエンド（Vite / ポート 5173）

別のターミナルで：

```bash
cd /Users/estyle-180/Documents/study/MarketInsightAI/MarketInsight-Web-App

npm install
npm run dev
```

ブラウザで `http://localhost:5173` を開きます。
Entra ID のサインイン画面が出るので、テナントのアカウントでログインしてください。

`redirectUri` は `src/config/msalConfig.ts` で `http://localhost:5173` に固定されています。
Vite が別ポート（5174 など）で起動すると認証がリダイレクトエラーになるため、
5173 が空いていることを確認してください。

## npm スクリプト

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | 開発サーバーを起動（HMR 有効、`http://localhost:5173`） |
| `npm run build` | 型チェック（`tsc -b`）＋本番ビルド（`dist/` に出力） |
| `npm run preview` | ビルド結果をローカルで確認 |
| `npm run lint` | ESLint を実行 |

## バックエンド API

`src/App.tsx` から呼んでいるエンドポイントです。

| メソッド | パス | 用途 |
| --- | --- | --- |
| GET | `/health` | ヘルスチェック |
| GET | `/models` | 選択可能なモデル一覧 |
| GET | `/chats/{user_id}` | チャット一覧の取得 |
| POST | `/chats` | チャットの新規作成 |
| DELETE | `/chats/{user_id}/{chat_id}` | チャットの削除 |
| PATCH | `/chats/{user_id}/{chat_id}/favorite` | お気に入りの切り替え |
| PATCH | `/chats/{user_id}/{chat_id}/title` | タイトルの更新 |
| POST | `/chats/{user_id}/{chat_id}/messages` | メッセージの保存 |
| POST | `/chat` | エージェント実行（SSE でステップを逐次返す） |

`/chat` は `text/event-stream` を返し、フロント側では `data: {...}` 行を
1 件ずつパースして思考ステップを表示しています。

## トラブルシューティング

| 症状 | 原因と対処 |
| --- | --- |
| 「エラー: サーバーに接続できません」 | バックエンドが起動していない、またはポートが 9000 でない |
| CORS エラーがコンソールに出る | フロントが 5173 以外で動いている。`allow_origins` を合わせるか 5173 で起動する |
| ログイン後にリダイレクトエラー | `msalConfig.ts` の `redirectUri` と Entra ID アプリ登録側の設定が不一致 |
| `import marketinsight_agent` が見つからない | `pip install -e` を各パッケージに対して実行済みか確認する |
| Cosmos DB 関連のエラーで起動失敗 | `MarketInsight-History/.env` の 4 つの変数が設定されているか確認する |
