import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import './DocumentRag.css'
import SidebarLayout from './SidebarLayout'

type Evidence = {
  filename: string
  section: string
  chunk_index: number
  similarity: number
  content?: string
  // 以下は再インデックス後のチャンクにしか入っていないため optional
  page?: number | null
  page_end?: number | null
  line_start?: number | null
  line_end?: number | null
}

// 参照箇所を「p.12 · 4〜18行目」のような文字列にする
// 行番号はページ内での位置なので、ページをまたぐ場合は両方のページ番号を出す
function formatLocation(e: Evidence): string {
  if (e.page == null) return ''
  if (e.page_end != null && e.page_end !== e.page) {
    return `p.${e.page} ${e.line_start}行目 〜 p.${e.page_end} ${e.line_end}行目`
  }
  return `p.${e.page} · ${e.line_start}〜${e.line_end}行目`
}

// 日付をグループ化する関数
function groupHistoryByDate<T extends { created_at: string }>(items: T[]) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const weekAgo = new Date(today.getTime() - 7 * 86400000)
  const monthAgo = new Date(today.getTime() - 30 * 86400000)

  const groups: { label: string; items: T[] }[] = [
    { label: '今日', items: [] },
    { label: '昨日', items: [] },
    { label: '1週間以内', items: [] },
    { label: '30日以内', items: [] },
  ]

  for (const item of items) {
    const d = new Date(item.created_at)
    if (d >= today) groups[0].items.push(item)
    else if (d >= yesterday) groups[1].items.push(item)
    else if (d >= weekAgo) groups[2].items.push(item)
    else if (d >= monthAgo) groups[3].items.push(item)
  }
  return groups.filter((g) => g.items.length > 0)
}

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
      evidence?: Evidence[]
      confidence?: {
        score: number
        details: { similarity: number; coverage: number; context_richness: number }
      } | null
      mode?: 'search' | 'reasoning'
      created_at: string
    }[]
  >([])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [evidence, setEvidence] = useState<Evidence[]>([])
  const [confidence, setConfidence] = useState<{
    score: number
    details: { similarity: number; coverage: number; context_richness: number }
  } | null>(null)
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<string[]>([])
  const [selectedFileNames, setSelectedFileNames] = useState<string[]>([])
  const [mode, setMode] = useState<'search' | 'reasoning'>('search')
  const [responseMode, setResponseMode] = useState<'search' | 'reasoning'>('search')
  const [showFilesPages, setShowFilesPages] = useState(false)
  const [historyFilter, setHistoryFilter] = useState<'all' | 'search' | 'reasoning'>('all')

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
    setResponseMode(item.mode ?? 'search')
    setMode(item.mode ?? 'search')
  }

  //履歴の削除関数
  const handleDeleteHistory = async (userId: string, historyId: string) => {
    try {
      const res = await fetch(
        `http://localhost:9000/rag/history/${userId}/${encodeURIComponent(historyId)}`,
        { method: 'DELETE' },
      )
      const data = await res.json()
      if (data.status === 'deleted') {
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
        body: JSON.stringify({ query, user_id: 'test-user', mode }),
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
                setResponseMode(data.mode || 'search')
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

  // クリア
  const handleNew = () => {
    setQuery('')
    setAnswer('')
    setEvidence([])
    setConfidence(null)
    setMode('search')
  }

  // チェック切り替え関数を追加
  const toggleHistorySelect = (id: string) => {
    setSelectedHistoryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }
  const toggleFileSelect = (filename: string) => {
    setSelectedFileNames((prev) =>
      prev.includes(filename) ? prev.filter((x) => x !== filename) : [...prev, filename],
    )
  }

  // 一括削除関数
  const handleBulkDeleteHistory = async () => {
    for (const id of selectedHistoryIds) {
      await handleDeleteHistory('test-user', id)
    }
    setSelectedFileNames([])
  }
  const handleBulkDeleteFiles = async () => {
    for (const filename of selectedFileNames) {
      await handleDelete(filename)
    }
    setSelectedFileNames([])
  }

  return (
    <>
      {/* サイドバー */}
      <SidebarLayout
        sidebarTitle="検索履歴"
        sidebarOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        sidebar={
          <>
            {/* フィルタボタン */}
            <div className="rag-history-filter">
              <button
                className={`filter-button ${historyFilter === 'all' ? 'active' : ''}`}
                onClick={() => setHistoryFilter('all')}
              >
                すべて
              </button>
              <button
                className={`filter-button ${historyFilter === 'search' ? 'active' : ''}`}
                onClick={() => setHistoryFilter('search')}
              >
                検索
              </button>
              <button
                className={`filter-button ${historyFilter === 'reasoning' ? 'active' : ''}`}
                onClick={() => setHistoryFilter('reasoning')}
              >
                推論
              </button>
            </div>
            {/* 一括削除ボタン */}
            {selectedHistoryIds.length > 0 && (
              <button className="bulk-delete-button" onClick={handleBulkDeleteHistory}>
                {selectedHistoryIds.length}件を削除
              </button>
            )}
            {/* 履歴リスト */}
            <ul className="rag-history-list">
              {groupHistoryByDate(
                history.filter((h) => historyFilter === 'all' || h.mode === historyFilter),
              ).map((group) => (
                <li key={group.label} className="history-group">
                  <div className="history-group-label">{group.label}</div>
                  <ul>
                    {group.items.map((h) => (
                      <li key={h.id} onClick={() => handleHistoryClick(h)}>
                        <div className="history-top">
                          <input
                            type="checkbox"
                            checked={selectedHistoryIds.includes(h.id)}
                            onChange={() => toggleHistorySelect(h.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span
                            className={`history-mode-label ${h.mode === 'reasoning' ? 'reasoning' : 'search'}`}
                          >
                            {h.mode === 'reasoning' ? '推論' : '検索'}
                          </span>
                          <span className="history-query">{h.query}</span>
                        </div>
                        <div className="history-bottom">
                          <span className="history-date">
                            {new Date(h.created_at).toLocaleString('ja-JP', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </span>
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
                </li>
              ))}
            </ul>
          </>
        }
      >
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
              {uploading ? 'アップロード中...' : 'ファイルをアップロード'}
              <input
                type="file"
                accept=".pdf,.docx,.txt,.xlsx,.pptx"
                onChange={handleUpload}
                ref={fileInputRef}
                hidden
              />
            </label>
          </div>
          {/* ファイル一覧 */}
          {files.length > 0 && (
            <div className="document-rag-files">
              <div className="files-header">
                <h3>アップロード済みファイル</h3>
                {selectedFileNames.length > 0 && (
                  <button className="bulk-delete-button" onClick={handleBulkDeleteFiles}>
                    {selectedFileNames.length}件を削除
                  </button>
                )}
              </div>
              <ul>
                {files.slice(0, 3).map((f, i) => (
                  <li key={i}>
                    <input
                      type="checkbox"
                      checked={selectedFileNames.includes(f.filename)}
                      onChange={() => toggleFileSelect(f.filename)}
                    />
                    {f.filename}（{f.uploaded_at}）
                    <button onClick={() => handleDelete(f.filename)} className="delete-button">
                      削除
                    </button>
                  </li>
                ))}
              </ul>
              {files.length > 3 && (
                <button className="show-all-files-button" onClick={() => setShowFilesPages(true)}>
                  全てのファイルを表示 ({files.length} 件)
                </button>
              )}
            </div>
          )}
          {/* モード切り替え */}
          <div className="rag-mode-toggle">
            <button className="new-search-button" onClick={handleNew}>
              + 新規チャット
            </button>
            <div className="mode-button-wrapper">
              <button
                className={`mode-button ${mode === 'search' ? 'active' : ''}`}
                onClick={() => setMode('search')}
              >
                検索モード
              </button>
              <span className="mode-tooltip">ドキュメント内から該当する情報を直接検索します</span>
            </div>
            <div className="mode-button-wrapper">
              <button
                className={`mode-button ${mode === 'reasoning' ? 'active' : ''}`}
                onClick={() => setMode('reasoning')}
              >
                推論モード
              </button>
              <span className="mode-tooltip">
                ドキュメントの内容をもとにAIが推論・分析した結果を返します
              </span>
            </div>
          </div>
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
              <h3>{responseMode === 'reasoning' ? '推論結果' : '回答'}</h3>
              {responseMode === 'reasoning' && (
                <div className="reasoning-label">
                  この回答はドキュメント内の情報を元にAIが推論した結果です
                </div>
              )}
              <div className={responseMode === 'reasoning' ? 'reasoning-body' : 'markdown-body'}>
                <ReactMarkdown>{answer}</ReactMarkdown>
              </div>
              {/* エビデンス表示 */}
              <div className="rag-evidence">
                <h4>参照元</h4>
                <ul>
                  {evidence.map((e) => {
                    const location = formatLocation(e)
                    return (
                      <li key={`${e.filename}-${e.chunk_index}`}>
                        <details>
                          <summary>
                            <span className="evidence-file">{e.filename}</span>
                            {e.section && <span className="evidence-section">{e.section}</span>}
                            {location && <span className="evidence-locator">{location}</span>}
                            <span className="evidence-similarity">類似度: {e.similarity}</span>
                          </summary>
                          {e.content && <div className="evidence-content">{e.content}</div>}
                        </details>
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>
          )}
        </div>
      </SidebarLayout>
      {/* ↑ メインエリアここまで ↑ */}
      {/* ファイル一覧モーダル */}
      {showFilesPages && (
        <div className="files-modal-overlay" onClick={() => setShowFilesPages(false)}>
          <div className="file-modal" onClick={(e) => e.stopPropagation()}>
            <div className="files-modal-header">
              <h3>アップロード済みファイル ({files.length} 件)</h3>
              <button onClick={() => setShowFilesPages(false)}>x</button>
            </div>
            <ul className="files-modal-list">
              {files.map((f, i) => (
                <li key={i}>
                  <input
                    type="checkbox"
                    checked={selectedFileNames.includes(f.filename)}
                    onChange={() => toggleFileSelect(f.filename)}
                  />
                  {f.filename} ({f.uploaded_at})
                  <button onClick={() => handleDelete(f.filename)} className="delete-button">
                    削除
                  </button>
                </li>
              ))}
            </ul>
            {selectedFileNames.length > 0 && (
              <button className="bulk-delete-button" onClick={handleBulkDeleteFiles}>
                {selectedFileNames.length}件を削除
              </button>
            )}
          </div>
        </div>
      )}
    </>
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
