import { useState, useEffect, useRef } from 'react'
import './App.css'

function TypingText({ text, speed = 30, onDone}: { text: string; speed?: number; onDone?: () => void}) {
  const [displayed, setDisplayed] = useState("")
  const doneRef = useRef(false)

  useEffect(() => {
    setDisplayed("")
    doneRef.current = false
    let i = 0
    const timer = setInterval(() => {
      i++
      setDisplayed(text.slice(0, i))
      if (i >= text.length) {
        clearInterval(timer)
        if(!doneRef.current) {
          doneRef.current = true
          onDone?.()
        }
      }
    }, speed)
    return () => clearInterval(timer)
  }, [text])

  return <span className={displayed.length < text.length ? 'typing-cursor': " "} >{displayed}</span>
}

function App() {
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([])
  const [currentStep, setCurrentStep] = useState<{ type: string; content: string} | null >(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const chatAreaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if(chatAreaRef.current) {
      chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight
    }
  }, [messages, currentStep])

  const handleSend = async () => {
    if (!message.trim() || isStreaming) return

    const userMsg = { role: 'user', content: message }
    setMessages((prev) => [...prev, userMsg])
    setMessage('')
    setIsStreaming(true)

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

          if(step.type === "answer") {
            setCurrentStep(null)
            setMessages((prev) => [...prev, { role: 'assistant', content: `[${step.type}] ${step.content}` }])
          } else {
            setCurrentStep(step)
          }
        }
      }
    } catch {
      setCurrentStep(null)
      setMessages((prev) => [...prev, { role: 'assistant', content: 'エラー: サーバーに接続できません' }])
    }
    setIsStreaming(false)
  }

  return (
    <div className="app">
      <div className="header">
        <div className="header-icon" />
        <span className="header-title">MarketInsight AI</span>
      </div>
      <div className="chat-area" ref={chatAreaRef}>
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.role === 'user' ? 'message-user' : 'message-assistant'}`}>
            {msg.role === "assistant" && index === messages.length -1 && isStreaming === false ? (
              <TypingText text={msg.content} speed={20} />
            ):(
              msg.content
            )}
          </div>
        ))}
        {currentStep && (
          <div className='message message-step'>
            <TypingText key={currentStep.type} text={`[${currentStep.type}] ${currentStep.content}`} speed={15} />
          </div>
        )}
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