import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import './DocumentRag.css'

function DocumentRag() {
  const [files, setFiles] = useState<{ filename: string; uploaded_at: string }[]>([])
  const [query, setQuery] = useState('')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [history, setHistory] = useState<
    {
      id: string
      query: string
      answer: string
      evidence?: { filename: string; section: string; chunk_index: number; similarity: number }[]
      confidence?: {
        score: number
        details: { similarity: number; coverage: number; context_richness: number }
      } | null
      created_at: string
    }[]
  >([])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [evidence, setEvidence] = useState<
    {
      filename: string
      section: string
      chunk_index: number
      similarity: number
    }[]
  >([])
  const [confidence, setConfidence] = useState<{
    score: number
    details: { similarity: number; coverage: number; context_richness: number }
  } | null>(null)

  // ファイル一覧を取得
  useEffect(() => {
    fetch('http://localhost:9000/rag/files')
      .then((res) => res.json())
      // fetchのレスポンスをJSONに変換する処理 = ボディ部分をJSONとしてパースし、JavaScriptオブジェクトとして変換するメソッド
      .then((data) => setFiles(data))
      // 取得したデータをsetFilesでstateの値を更新する
      .catch(() => {})

    // 履歴取得
    const userId = 'test-user'
    fetch(`http://localhost:9000/rag/history/${userId}`)
      .then((res) => res.json())
      .then((data) => setHistory(data))
      .catch(() => {})
  }, [])

  // 履歴クリックで過去の回答を表示する関数
  const handleHistoryClick = (item: (typeof history)[number]) => {
    setQuery(item.query)
    setAnswer(item.answer)
    setEvidence(item.evidence ?? [])
    setConfidence(item.confidence ?? null)
  }

  //履歴の削除関数
  const handleDeleteHistory = async (userId: string, historyId: string) => {
    try {
      const res = await fetch(
        `http://localhost:9000/rag/history/${userId}/${encodeURIComponent(historyId)}`,
        { method: 'DELETE' },
      )
      const data = await res.json()
      if (data.status === 'delete') {
        setHistory((prev) => prev.filter((h) => h.id !== historyId))
      }
    } catch (err) {
      console.error('履歴の削除に失敗しました。', err)
    }
  }

  // PDFアップロード
  // async: 関数内でawait(非同期処理の完了待ち)を使うための宣言
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // e.target.files: ユーザーが選択したファイルの配列
    // ?.[0]: ファイルがあれば、最初の1つを取得
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    // FormData: ファイルをHTTPで送るための入れ物
    const formData = new FormData()
    // fileというキー名でファイルを追加(backendのUploadFileパラメータ名と一致させる)
    formData.append('file', file)
    try {
      // サーバーにPOSTでファイルを送信
      // FormDataを使う場合、Content-Typeは指定不要
      const res = await fetch('http://localhost:9000/upload', {
        method: 'POST',
        body: formData,
      })
      // レスポンスをJSONに変換
      const data = await res.json()
      // バックエンドが"uploaded"を返したら成功
      if (data.status === 'uploaded') {
        // prev: 現在のfiles配列
        // ...prev: 既存のファイルを展開(スプレッド構文)
        // 末尾に新しいファイル情報を追加した新しい配列をセットする
        setFiles((prev) => [
          ...prev,
          { filename: data.filename, uploaded_at: new Date().toISOString() },
        ])
      }
    } catch (err) {
      console.error('アップロードに失敗しました', err)
    } finally {
      // try/catchの結果に関わらず実行される
      // アップロード中のフラグをOFF
      setUploading(false)
      // ファイル選択をリセット
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // 削除ボタンと削除処理
  const handleDelete = async (filename: string) => {
    try {
      const res = await fetch(`http://localhost:9000/rag/files/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (data.status === 'deleted') {
        setFiles((prev) => prev.filter((f) => f.filename !== filename))
      }
    } catch (err) {
      console.log('削除に失敗しました', err)
    }
  }

  // 質問検索(POST, SSEストリーミング)
  const handleSearch = async () => {
    // query.trim(): 前後の空白を誤挙した文字列を返す
    if (!query.trim()) return
    // 検索中フラグをONにする
    setLoading(true)
    // 前回の回答をクリアする
    setAnswer('')
    try {
      // /rag/searchにPOSTで質問を送信
      const res = await fetch('http://localhost:9000/rag/search', {
        method: 'POST',
        // JSON形式で送ることをサーバーに伝える
        headers: { 'Content-Type': 'application/json' },
        // {query: "AIの市場規模は？"}のようなJSONを送る
        body: JSON.stringify({ query, user_id: 'test-user' }),
      })
      // res.body: レスポンスのストリーム(データが少しずつ届く)
      // getRender(): ストリームを1チャンクずつ読むためのリーダーを取得
      const render = res.body?.getReader()
      // TextDecoder: バイナリデータを文字列に変換するもの
      const decoder = new TextDecoder()
      // 回答文を蓄積する変数
      let fullAnswer = ''
      // readerが存在する限りループ
      while (render) {
        // read(): ストリームから次のチャンクを読む
        // done; 全データを読み終えたらtrue
        // value: 読み取ったデータ(バイナリ)
        const { done, value } = await render.read()
        // 全部読み終えたら、ループを抜ける
        if (done) break
        // バイナリ(コンピュータが理解できる「0」と「1」の2進数だけで表現されたデータ)を文字列に変換
        const text = decoder.decode(value)
        // SSE形式は改行区切りなので、行ごとに分割
        // 例: "data: {\"type\":\"answer\",\"content\":\"AI市場は...\"}\n\n"
        const lines = text.split('\n')
        for (const line of lines) {
          // SSE形式の行は、"data: "で始まる
          if (line.startsWith('data: ')) {
            try {
              // "data: "(6文字)を除いてJSON部分だけを取り出す
              // JSON.parse: JSON文字列をJSオブジェクトに変換
              const data = JSON.parse(line.slice(6))
              if (data.type === 'evidence') {
                setEvidence(data.content)
                setConfidence(data.confidence)
              }
              // typeが"answer"のデータだけを回答として扱う
              if (data.type === 'answer') {
                fullAnswer += data.content
                setAnswer(fullAnswer)
              }
            } catch {
              // チャンク境界で途切れた不完全なJSONは読み飛ばす
            }
          }
        }
      }
    } catch {
      // ネッt~ワークエラー
      setAnswer('エラーが発生しました')
    } finally {
      // 失敗成功に関わらず検索中フラグをOFFにする
      setLoading(false)
      // 履歴の再取得
      fetch(`http://localhost:9000/rag/history/test-user`)
        .then((res) => res.json())
        .then((data) => setHistory(data))
        .catch(() => {})
    }
  }

  return (
    <div className="document-rag-container">
      {/* サイドバー */}
      <div className={`rag-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="rag-sidebar-header">
          <h3>検索履歴</h3>
          <button onClick={() => setSidebarOpen(!sidebarOpen)}>{sidebarOpen ? '◀' : '▶'}</button>
        </div>
        <ul className="rag-history-list">
          {history.map((h) => (
            <li key={h.id} onClick={() => handleHistoryClick(h)}>
              <span className="history-query">{h.query}</span>
              {/* <span className="history-date">{new Date(h.created_at).toLocaleDateString()}</span> */}
              <div className="history-bottom">
                <span className="history-date">{new Date(h.created_at).toLocaleDateString()}</span>
                <button
                  className="history-delete"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteHistory('test-user', h.id)
                  }}
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
      {/* ↑ サイドバーここまで ↑ */}

      {/* ↓ メインエリアここから ↓ */}
      <div className="document-rag">
        {/* ヘッダー */}
        <div className="document-rag-header">
          <h2>ドキュメント検索RAG</h2>
          <p>PDFをアップロードして、内容について質問できます</p>
        </div>
        {/* アップロードボタン */}
        <div className="document-rag-upload">
          <label className="upload-button">
            {uploading ? 'アップロード中...' : 'PDFをアップロード'}
            <input type="file" accept=".pdf" onChange={handleUpload} ref={fileInputRef} hidden />
          </label>
        </div>
        {/* ファイル一覧 */}
        {files.length > 0 && (
          <div className="document-rag-files">
            <h3>アップロード済みファイル</h3>
            <ul>
              {files.map((f, i) => (
                <li key={i}>
                  {f.filename}（{f.uploaded_at}）
                  <button onClick={() => handleDelete(f.filename)} className="delete-button">
                    削除
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {/* 質問入力 */}
        <div className="document-rag-search">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ドキュメントについて質問して"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSearch()
              }
            }}
          />
          <button onClick={handleSearch} disabled={loading}>
            {loading ? '検索中...' : '検索'}
          </button>
        </div>
        {/* 回答表示 */}
        {answer && (
          <div className="document-rag-answer">
            {/* 信頼度表示 */}
            {confidence && (
              <div className="rag-confidence">
                <div className="confidence-header">
                  <span>信頼度</span>
                  <span className="confidence-score">{confidence.score} %</span>
                </div>
                <div className="confidence-bar">
                  <div
                    className="confidence-fill"
                    style={{
                      width: `${confidence.score}%`,
                      backgroundColor:
                        confidence.score >= 70
                          ? '#22c55e'
                          : confidence.score >= 40
                            ? '#f59e0b'
                            : '#ef4444',
                    }}
                  />
                </div>
                <div className="confidence-details">
                  <span>類似度 {confidence.details.similarity}%</span>
                  <span>カバレッジ {confidence.details.coverage}%</span>
                  <span>情報量 {confidence.details.context_richness}%</span>{' '}
                </div>
              </div>
            )}
            <h3>回答</h3>
            <div className="markdown-body">
              <ReactMarkdown>{answer}</ReactMarkdown>
            </div>
            {/* エビデンス表示 */}
            <div className="rag-evidence">
              <h4>参照元</h4>
              <ul>
                {evidence.map((e, i) => (
                  <li key={i}>
                    <span className="evidence-file">{e.filename}</span>
                    <span className="evidence-section">{e.section}</span>
                    <span className="evidence-similarity">類似度: {e.similarity}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
      {/* ↑ メインエリアここまで ↑ */}
    </div>
  )
}

export default DocumentRag

/*
実装方針
    Phase1: 画面に何が必要かを整理する
        この画面はユーザーが何をするかを考える
        1. PDFをアップロードする
        2. アップロード済みのファイルを確認する
        3. 質問を入力し、送信する
        4. AIの回答を読む

    Phase2: stateを決める
        データ       型               理由
        files       string[]         アップロード済みファイル一覧
        query       string           質問の入力内容。ユーザーが変える
        answer      string           AUの回答
        loading     boolean          検索中かどうか、ボタンの無効化に使う
        uploading   boolean          アップロード中かどうか

    Phase3: JSXの骨組みだけを作る

    Phase4: 簡単なAPIから接続する
        1. ファイル一覧を取得(GET)
        2. PDFファイルアップロード(POST, FrmData)
        3. 質問検索(POST, SSEストリーミング)

    Phase5: 細部を詰める
        ・loadingやuploadingの状態管理を追加
        ・エラーハンドリング
        ・Shift + Enter対応
        ・ボタン無効化
*/
