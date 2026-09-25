import { useState, useEffect } from 'react'
import './DocumentQA.css'
import SidebarLayout from './SidebarLayout'
import ReactMarkdown from 'react-markdown'

type QAMessage = {
  role: 'user' | 'assistant'
  content: string
  sources?: string[]
}

function DocumentQA() {
  const [messages, setMessages] = useState<QAMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [documents, setDocuments] = useState<{ filename: string; uploaded_at: string }[]>([])

  const askQuestion = async () => {
    if (!input.trim() || loading) return

    const question = input
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: question }])
    setLoading(true)

    try {
      const res = await fetch('http://localhost:9000/document-qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, user_id: 'test-user' }),
      })
      const data = await res.json()
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.answer, sources: data.sources },
      ])
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'エラーが発生しました。' }])
    }
    setLoading(false)
  }

  const fetchDocuments = () => {
    fetch('http://localhost:9000/rag/files')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setDocuments(data.filter((d) => !d.filename.startsWith('minutes__')))
        }
      })
      .catch(() => {})
  }

  useEffect(() => {
    fetchDocuments()
  }, [])

  return (
    <SidebarLayout
      sidebarTitle="ドキュメントQA"
      sidebarOpen={sidebarOpen}
      onToggle={() => setSidebarOpen(!sidebarOpen)}
      sidebar={
        <>
          <p className="qa-sidebar-desc">登録済みのドキュメントに対して自然言語で質問できます。</p>
          <button className="qa-clear-button" onClick={() => setMessages([])}>
            会話をクリア
          </button>
          <div className="qa-doc-list">
            <h4>登録済みドキュメント</h4>
            {documents.length === 0 && <p className="qa-no-docs">なし</p>}
            {documents.map((doc) => (
              <div key={doc.filename} className="qa-doc-item">
                {doc.filename}
              </div>
            ))}
          </div>
        </>
      }
    >
      <div className="qa-container">
        {/* ヘッダー */}
        <div className="document-rag-header">
          <h2>ドキュメント検索RAG</h2>
          <p>ドキュメントの内容について質問できます</p>
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
