import { useEffect, useState } from 'react'
import './MeetingMinutes.css'
import SidebarLayout from './SidebarLayout'
import ReactMarkdown from 'react-markdown'

type History = {
  id: string
  filename: string
  created_at: string
}

function MeetingMinutes() {
  //   const [files, setFiles] = useState<File | null>(null)
  const [history, setHistory] = useState<History[]>([])
  const [uploading, setUploading] = useState(false)
  const [minutes, setMinutes] = useState('')
  const [transcript, setTranscript] = useState('')

  const [sidebarOpen, setSidebarOpen] = useState(true)

  // アップロード+議事録生成
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return
    setUploading(true)
    setMinutes('')
    setTranscript('')

    const formData = new FormData()
    formData.append('file', selected)
    formData.append('user_id', 'test-user')

    try {
      const res = await fetch('http://localhost:9000/minutes/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      setMinutes(data.minutes)
      setTranscript(data.transcript)
    } catch {
      setMinutes('エラーが発生しました')
    } finally {
      setUploading(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(minutes)
  }

  const fetchHistory = () => {
    fetch('http://localhost:9000/minutes/history/test-user')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setHistory(data)
      })
      .catch(() => {})
  }

  const handleHistoryClick = async (id: string) => {
    const res = await fetch(`http://localhost:9000/minutes/${id}`)
    const data = await res.json()
    setMinutes(data.minutes)
    setTranscript(data.transcript)
  }

  useEffect(() => {
    fetchHistory()
  }, [])

  return (
    <>
      <SidebarLayout
        sidebarTitle="議事録履歴"
        sidebarOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        sidebar={
          <>
            {/* サイドバー履歴 */}
            <ul className="minutes-history-list">
              {history.map((h) => (
                <li key={h.id} onClick={() => handleHistoryClick(h.id)}>
                  <span className="minutes-filename">{h.filename}</span>
                  <span className="minutes-date">
                    {new Date(h.created_at).toLocaleString('ja-JP')}
                  </span>
                </li>
              ))}
            </ul>
          </>
        }
      >
        <div className="meeting-minutes">
          <h2>議事録作成</h2>
          <p>会議の音声ファイルをアップロードすると、自動で議事録を作成します</p>

          {/* アップロード */}
          <div className="minutes-upload">
            <label className="upload-button">
              {uploading ? '処理中...' : '音声ファイルをアップロード'}
              {/* <input
                type="file"
                accept=".mp4, .m4a, .wav, .webm, .mp3"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) console.log(file.name)
                }}
                hidden
              /> */}
              <input
                type="file"
                accept=".mp4,.m4a,.wav,.webm,.mp3"
                onChange={handleUpload}
                hidden
              />
            </label>
          </div>

          {/* 議事録表示 */}
          {minutes && (
            <div className="minutes-result">
              <div className="minutes-header">
                <h3>議事録</h3>
                <button className="copy-button" onClick={handleCopy}>
                  コピー
                </button>
              </div>
              <div className="minutes-body">
                <ReactMarkdown>{minutes}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>

        {/* 文字起こし表示 */}
        {transcript && (
          <details className="minutes-transcript">
            <summary>文字起こし全文表示</summary>
            <p>{transcript}</p>
          </details>
        )}
      </SidebarLayout>
    </>
  )
}

export default MeetingMinutes
