import { useState } from 'react'
import './App.css'

function App() {
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([])

  const handleSend = () => {
    if (!message.trim()) return

    const userMsg = { role: 'user', content: message }
    const aiMsg = { role: 'assistant', content: `「${message}」を調査中です...` }

    setMessages((prev) => [...prev, userMsg])
    setMessage('')

    setTimeout(() => {
      setMessages((prev) => [...prev, aiMsg])
    }, 1000)
  }

  return (
    <div className="app">
      <div className="header">
        <div className="header-icon" />
        <span className="header-title">MarketInsight AI</span>
      </div>
      <div className="chat-area">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.role === 'user' ? 'message-user' : 'message-assistant'}`}>
            {msg.content}
          </div>
        ))}
      </div>
      <div className="input-area">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="メッセージを入力..."
        />
        <button onClick={handleSend}>送信</button>
      </div>
    </div>
  )
}

export default App