import { useState } from 'react'
import './App.css'

function App() {
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([])

  const handleSend = async () => {
    if (!message.trim()) return

    const userMsg = { role: 'user', content: message }
    setMessages((prev) => [...prev, userMsg])
    setMessage('')

    try {
      const res = await fetch('http://127.0.0.1:9000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      })
      // const data = await res.json()
      // setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }])
      // const data = await res.json()
      // const stepMessages = data.steps.map((step: { type: string; content: string }) => ({
      //   role: 'assistant',
      //   content: `[${step.type}] ${step.content}`,
      // }))
      // setMessages((prev) => [...prev, ...stepMessages])

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value)
        const lines = text.split('\n').filter((line) => line.startsWith('data: '))

        for (const line of lines) {
          const step = JSON.parse(line.replace('data: ', ''))
          setMessages((prev) => [...prev, { role: 'assistant', content: `[${step.type}] ${step.content}` }])
        }
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'エラー: サーバーに接続できません' }])
    }
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
          onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && handleSend()}
          placeholder="メッセージを入力..."
        />
        {/*
        * !e.nativeEvent.isComposing: 押されたのが「Enter」キーで、かつ「変換中でない」
        */}
        <button onClick={handleSend}>送信</button>
      </div>
    </div>
  )
}

export default App