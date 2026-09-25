import { useState, useEffect } from 'react'
import './DocumentQA.css'
import SidebarLayout from './SidebarLayout'
import ReactMarkdown from 'react-markdown'

type QAMessage = {
  role: 'user' | 'assistant'
  content: string
  sources?: string[]
  timestamp: string
}

type QASession = {
  id: string
  messages: QAMessage[]
  createdAt: string
}

function DocumentQA() {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [documents, setDocuments] = useState<{ filename: string; uploaded_at: string }[]>([])

  const [sessions, setSessions] = useState<QASession[]>(() => [
    { id: '1', messages: [], createdAt: new Date().toLocaleString() },
  ])
  const [currentSessionId, setCurrentSessionId] = useState('1')
  const [messages, setMessages] = useState<QAMessage[]>([])

  const askQuestion = async () => {
    if (!input.trim() || loading) return

    const question = input
    setInput('')
    const userMsg: QAMessage = {
      role: 'user',
      content: question,
      timestamp: new Date().toLocaleTimeString(),
    }
    const withUser = [...messages, userMsg]
    updateMessages(withUser)
    setLoading(true)

    try {
      const res = await fetch('http://localhost:9000/document-qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, user_id: 'test-user' }),
      })
      const data = await res.json()
      const assistantMsg: QAMessage = {
        role: 'assistant',
        content: data.answer,
        sources: data.sources,
        timestamp: new Date().toLocaleTimeString(),
      }
      updateMessages([...withUser, assistantMsg])
    } catch {
      const errorMsg: QAMessage = {
        role: 'assistant',
        content: 'エラーが発生しました。',
        timestamp: new Date().toLocaleTimeString(),
      }
      updateMessages([...withUser, errorMsg])
    }

    setLoading(false)
  }

  const updateMessages = (newMessages: QAMessage[]) => {
    setMessages(newMessages)
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === currentSessionId) {
          saveSession(currentSessionId, newMessages, s.createdAt)
          return { ...s, messages: newMessages }
        }
        return s
      }),
    )
  }

  const fetchDocuments = () => {
    fetch('http://localhost:9000/rag/files')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setDocuments(data)
      })
      .catch(() => {})
  }

  // 新規チャット開始
  const startNewChat = () => {
    if (messages.length > 0 && currentSessionId) {
      setSessions((prev) => prev.map((s) => (s.id === currentSessionId ? { ...s, messages } : s)))
    }
    const newId = crypto.randomUUID()
    const createdAt = new Date().toLocaleString() // ← この行を追加
    const newSession: QASession = {
      id: newId,
      messages: [],
      createdAt,
    }
    setSessions((prev) => [newSession, ...prev])
    setCurrentSessionId(newId)
    setMessages([])
    saveSession(newId, [], createdAt)
  }

  // 履歴を選択して過去のやり取りを表示
  const selectSession = (sessionId: string) => {
    if (currentSessionId && messages.length > 0) {
      setSessions((prev) => prev.map((s) => (s.id === currentSessionId ? { ...s, messages } : s)))
    }
    const session = sessions.find((s) => s.id === sessionId)
    if (session) {
      setCurrentSessionId(session.id)
      setMessages(session.messages)
    }
  }

  // セッションの取得・保存をAPIで行
  const fetchSessions = () => {
    fetch('http://localhost:9000/qa-sessions/test-user')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const loaded = data.map((d) => ({
            id: d.id,
            messages: d.messages || [],
            createdAt: d.created_at || '',
          }))
          setSessions(loaded)
          setCurrentSessionId(loaded[0].id)
          setMessages(loaded[0].messages)
        }
      })
      .catch(() => {})
  }

  // セッションをサーバーに保存する
  const saveSession = (sessionId: string, msgs: QAMessage[], createdAt: string) => {
    fetch('http://localhost:9000/qa-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: sessionId,
        user_id: 'test-user',
        messages: msgs,
        created_at: createdAt,
      }),
    }).catch(() => {})
  }

  useEffect(() => {
    fetchDocuments()
    fetchSessions()
  }, [])

  return (
    <SidebarLayout
      sidebarTitle="ドキュメントQA"
      sidebarOpen={sidebarOpen}
      onToggle={() => setSidebarOpen(!sidebarOpen)}
      sidebar={
        <>
          <p className="qa-sidebar-desc">登録済みのドキュメントに対して自然言語で質問できます。</p>
          <button className="qa-clear-button" onClick={startNewChat}>
            + 新規チャット
          </button>
          <button className="qa-clear-button" onClick={() => setMessages([])}>
            会話をクリア
          </button>
          <div className="qa-doc-list">
            <h4>チャット履歴</h4>
            {sessions.length === 0 && <p className="qa-no-docs">なし</p>}
            {sessions.map((s) => (
              <div
                key={s.id}
                className={`qa-history-item ${s.id === currentSessionId ? 'active' : ''}`}
                onClick={() => selectSession(s.id)}
              >
                <span className="qa-history-question">
                  {s.messages.length > 0 ? s.messages[0].content : '新規チャット'}
                </span>
                <span className="qa-history-time">{s.createdAt}</span>
              </div>
            ))}
          </div>
          <hr />
          <h3 className="qa-section-title">参照</h3>
          <div className="qa-doc-list">
            <h4>ドキュメント</h4>
            {documents.filter((d) => !d.filename.startsWith('minutes__')).length === 0 && (
              <p className="qa-no-docs">なし</p>
            )}
            {documents
              .filter((d) => !d.filename.startsWith('minutes__'))
              .map((doc) => (
                <div key={doc.filename} className="qa-doc-item">
                  {doc.filename}
                </div>
              ))}
          </div>
          <div className="qa-doc-list">
            <h4>音声議事録</h4>
            {documents.filter((d) => d.filename.startsWith('minutes__')).length === 0 && (
              <p className="qa-no-docs">なし</p>
            )}
            {documents
              .filter((d) => d.filename.startsWith('minutes__'))
              .map((doc) => (
                <div key={doc.filename} className="qa-doc-item qa-doc-minutes">
                  {doc.uploaded_at ? doc.uploaded_at.slice(0, 10) : '日付不明'}
                </div>
              ))}
          </div>
        </>
      }
    >
      <div className="qa-container">
        {/* ヘッダー */}
        <div className="document-rag-header">
          <h2>ドキュメントQA RAG</h2>
          <p>登録済みの文書に対してAIが該当箇所を検索し、質問に回答します</p>
        </div>
        <div className="qa-messages">
          {messages.length === 0 && <div className="qa-empty">質問を入力してください</div>}
          {messages.map((msg, i) => (
            <div key={i} className={`qa-message ${msg.role}`}>
              <div className="qa-bubble">
                {msg.role === 'assistant' ? (
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                ) : (
                  msg.content
                )}
              </div>
              {msg.sources && msg.sources.length > 0 && (
                <div className="qa-sources">
                  {msg.sources.map((s, j) => (
                    <span key={j} className="qa-source-tag">
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="qa-message assistant">
              <div className="qa-bubble qa-loading">検索中...</div>
            </div>
          )}
        </div>
        <div className="qa-input-area">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') askQuestion()
            }}
            placeholder="ドキュメントについて質問する..."
          />
          <button onClick={askQuestion} disabled={loading || !input.trim()}>
            送信
          </button>
        </div>
      </div>
    </SidebarLayout>
  )
}

export default DocumentQA
