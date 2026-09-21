import { useEffect, useState, useRef } from 'react'
import './DocumentSummary.css'
import SidebarLayout from './SidebarLayout'
import { groupHistoryByDate } from '../utils/utils'
import ReactMarkdown from 'react-markdown'

type History = {
  id: string
  filename: string
  created_at: string
}

function DocumentSummary() {
  const [files, setFiles] = useState<{ filename: string; uploaded_at: string }[]>([])
  const [selectedFile, setSelectedFile] = useState('')
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState('')
  const [history, setHistory] = useState<History[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const handleHistoryClick = async (id: string) => {
    const res = await fetch(`http://localhost:9000/rag/summary/${id}`)
    const data = await res.json()
    setSummary(data.summary)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(summary)
  }

  const handleSummarize = async () => {
    if (!selectedFile) return
    setLoading(true)
    try {
      const res = await fetch('http://localhost:9000/rag/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: selectedFile, user_id: 'test-user' }),
      })
      const data = await res.json()
      setSummary(data.summary)
    } catch {
      setSummary('エラーが発生しました')
    } finally {
      setLoading(false)
      fetchHistory()
    }
  }

  const fetchFiles = () => {
    fetch('http://localhost:9000/rag/files')
      .then((res) => res.json())
      .then((data) => setFiles(data))
      .catch(() => {})
  }

  const fetchHistory = () => {
    fetch('http://localhost:9000/rag/summary/history/test-user')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setHistory(data)
      })
      .catch(() => {})
  }

  // PDFアップロード
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // e.target.files: ユーザーが選択したファイルの配列
    // ?.[0]: ファイルがあれば、最初の1つを取得
    const file = e.target.files?.[0]
    if (!file) return

    // 同名のファイルが存在するかチェック
    const exists = files.some((f) => f.filename === file.name)
    if (exists) {
      const ok = window.confirm(`「${file.name}」はすでにアップロード済みです。上書きしますか？`)
      if (!ok) {
        // キャンセル → ファイル入力をリセットし終了
        if (fileInputRef.current) fileInputRef.current.value = ''
        return
      }
    }

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

  useEffect(() => {
    fetchFiles()
    fetchHistory()
  }, [])

  return (
    <>
      <SidebarLayout
        sidebarTitle="要約履歴"
        sidebarOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        sidebar={
          <>
            {groupHistoryByDate(history).map((group) => (
              <li key={group.label} className="history-group">
                <div className="history-group-label">{group.label}</div>
                <ul>
                  {group.items.map((h) => (
                    <li key={h.id} onClick={() => handleHistoryClick(h.id)}>
                      ...
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </>
        }
      >
        {/* メインエリア */}
        <div className="document-summary">
          <div className="document-summary-header">
            <h3>要約生成</h3>
            <p>ファイルを選択またはアップロードして、内容を要約できます</p>
          </div>

          {/* アップロードボタン */}
          <div className="document-summary-upload">
            <label className="upload-button">
              {uploading ? 'アップロード中...' : 'ファイルをアップロード'}
              <input type="file" accept="..." onChange={handleUpload} hidden />
            </label>
          </div>

          {/* ファイル一覧 + 要約ボタン */}
          {files.length > 0 && (
            <div className="document-summary-files">
              <h3>アップロード済みファイル</h3>
              <ul>
                {files.map((f, i) => (
                  <li key={i}>
                    <input
                      type="radio"
                      checked={selectedFile === f.filename}
                      onChange={() => setSelectedFile(f.filename)}
                    />
                    {f.filename}（{f.uploaded_at}）
                  </li>
                ))}
              </ul>
              <button
                onClick={handleSummarize}
                disabled={!selectedFile || loading}
                className="summarize-button"
              >
                {loading ? '要約生成中...' : '要約を生成'}
              </button>
            </div>
          )}

          {/* 要約結果 */}
          {summary && (
            <div className="document-summary-result">
              <h3>要約結果</h3>
              <ReactMarkdown>{summary}</ReactMarkdown>
              <button onClick={handleCopy} className="copy-button">
                コピー
              </button>
            </div>
          )}
        </div>
      </SidebarLayout>
    </>
  )
}

export default DocumentSummary
