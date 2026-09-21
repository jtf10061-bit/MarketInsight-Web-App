import { useEffect, useState } from 'react'
import './MeetingMinutes.css'
import SidebarLayout from './SidebarLayout'
import ReactMarkdown from 'react-markdown'
// import { groupHistoryByDate } from '../utils/utils'

type History = {
  id: string
  filename: string
  created_at: string
}

function MeetingMinutes() {
  const [history, setHistory] = useState<History[]>([])
  const [uploading, setUploading] = useState(false)
  const [minutes, setMinutes] = useState('')
  const [transcript, setTranscript] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [recording, setRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [selectedIds, setSelecteIds] = useState<string[]>([])

  // 共通のポーリング関数(非同期処理の進捗状態を定期的に問い合わせる)
  const pollJob = (jobId: string) => {
    // setInterval を使って、指定した時間間隔で繰り返し実行されるタイマー処理を開始する
    const interval = setInterval(async () => {
      try {
        // await res.json(): レスポンスをJSONオブジェクトとして解析・取得する
        const res = await fetch(`http://localhost:9000/minutes/status/${jobId}`)
        const data = await res.json()

        if (data.status === 'completed') {
          // 処理が完了したため、setInterval による定期実行（タイマー）を停止する
          clearInterval(interval)
          // 完了したジョブの最終成果物（議事録や文字起こしデータ）を取得するため、結果取得用APIにリクエストを送り、JSONデータを取得する
          const resultRes = await fetch(`http://localhost:9000/minutes/result/${jobId}`)
          const result = await resultRes.json()
          // 取得した議事録テキストと文字起こしテキストをReactのState（画面の状態）にセットする
          setMinutes(result.minutes)
          setTranscript(result.transcript)
          // ローディング表示やアップロード中フラグをオフ
          setUploading(false)
          // 履歴一覧を再取得して画面を更新する
          fetchHistory()
        } else if (data.status === 'failed') {
          // 失敗確定のため、ポーリング（タイマー）を停止
          clearInterval(interval)
          setMinutes('エラーが発生しました: ' + data.error)
          setUploading(false)
        }
      } catch {
        // ネットワークエラーは無視してポーリング継続
      }
    }, 3000)
  }

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
      pollJob(data.job_id)
    } catch {
      setMinutes('エラーが発生しました')
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

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const recorder = new MediaRecorder(stream)
    const chunks: Blob[] = []

    recorder.ondataavailable = (e) => chunks.push(e.data)

    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop())
      const blob = new Blob(chunks, { type: 'audio/webm' })
      const file = new File([blob], 'recording.webm', { type: 'audio/webm' })

      setUploading(true)
      setMinutes('')
      setTranscript('')

      const formData = new FormData()
      formData.append('file', file)
      formData.append('user_id', 'test-user')

      try {
        const res = await fetch('http://localhost:9000/minutes/upload', {
          method: 'POST',
          body: formData,
        })
        const data = await res.json()
        pollJob(data.job_id)
      } catch {
        setMinutes('エラーが発生しました')
        setUploading(false)
      }
    }

    recorder.start()
    setMediaRecorder(recorder)
    setRecording(true)
  }

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop()
      setRecording(false)
    }
  }

  // 削除
  const handleDeleteMinutes = async () => {
    for (const id of selectedIds) {
      await fetch(`http://localhost:9000/minutes/${id}`, { method: 'DELETE' })
    }
    setSelecteIds([])
    fetchHistory()
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
            {selectedIds.length > 0 && (
              <button className="bulk-delete-button" onClick={handleDeleteMinutes}>
                {selectedIds.length} 件削除
              </button>
            )}
            <ul className="minutes-history-list">
              {history.map((h) => (
                <li key={h.id} onClick={() => handleHistoryClick(h.id)}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(h.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelecteIds([...selectedIds, h.id])
                      } else {
                        setSelecteIds(selectedIds.filter((id) => id !== h.id))
                      }
                    }}
                  />
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
              <input
                type="file"
                accept=".mp4,.m4a,.wav,.webm,.mp3"
                onChange={handleUpload}
                hidden
              />
            </label>
            <button
              className="record-button"
              onClick={recording ? stopRecording : startRecording}
              disabled={uploading}
            >
              {recording ? '⏹ 録音停止' : '🎙 録音開始'}
            </button>
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

          {/* 文字起こし表示 */}
          {transcript && (
            <details className="minutes-transcript">
              <summary>文字起こし全文表示</summary>
              <p>{transcript}</p>
            </details>
          )}
        </div>
      </SidebarLayout>
    </>
  )
}

export default MeetingMinutes
