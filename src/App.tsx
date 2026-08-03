import { useState, useEffect, useRef } from 'react'
import './App.css'

type Chat = {
  id: string
  title: string
  date: string
  messages: {
    role: string
    content: string
  }[]
}

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

function formatDate(dateStr: string): string {
  const today = new Date()
  const date = new Date(dateStr)
  const diffDays = Math.floor((today.getTime() - date.getTime()) / (1000*60*60*24))

  if (diffDays === 0) return "今日"
  if (diffDays === 1) return "昨日"
  if (diffDays <= 7) return "過去7日間"
  return `${date.getMonth() + 1}月`
}

function App() {
  const [message, setMessage] = useState('')
  // const [messages, setMessages] = useState<{ role: string; content: string }[]>([])
  const [currentStep, setCurrentStep] = useState<{ type: string; content: string} | null >(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const chatAreaRef = useRef<HTMLDivElement>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const [chats, setChats] = useState<Chat[]>([])
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const activeChat = chats.find((c) => c.id === activeChatId)
  const messages = activeChat?.messages ?? []

  useEffect(() => {
    if(chatAreaRef.current) {
      chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight
    }
  }, [messages, currentStep])

  const createNewChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: "新しいチャット",
      date: new Date().toISOString().split('T')[0],
      messages: [],
    }
    setChats((prev) => [newChat, ...prev])
    setActiveChatId(newChat.id)
    setCurrentStep(null)
  }

  const handleSend = async () => {
    if (!message.trim() || isStreaming) return

    const chatId = activeChatId ?? Date.now().toString()

    if(!activeChatId) {
      const newChat: Chat = {
        id: chatId,
        title: message.slice(0, 20),
        date: new Date().toISOString().split('T')[0],
        messages: []
      }
      setChats((prev) => [newChat, ...prev])
      setActiveChatId(chatId)
    }

    const userMsg = { role: 'user', content: message }
    setChats((prev) =>
      prev.map((c) =>
        c.id === chatId ? { ...c, title: c.title === "新しいチャット" ? message.slice(0, 20): c.title, messages: [...c.messages, userMsg]}: c
      )
    )
    // setMessages((prev) => [...prev, userMsg])
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
            setChats((prev) =>
              prev.map((c) =>
                c.id === chatId ? { ...c, messages: [...c.messages, { role: "assistant", content: step.content}]}: c
              )
            )
          } else {
            setCurrentStep(step)
          }
        }
      }
    } catch {
      setCurrentStep(null)
      setChats((prev) =>
        prev.map((c) =>
          c.id === chatId ? {
            ...c, messages: [...c.messages, {role: "assistant", content: "エラー: サーバーに接続できません"}]
          }
          : c
        )
      )
      // setMessages((prev) => [...prev, { role: 'assistant', content: 'エラー: サーバーに接続できません' }])
    }
    setIsStreaming(false)
  }

  const groupedChats = chats.reduce<Record<string, Chat[]>>((groups, chat) => {
    const label = formatDate(chat.date)
    if(!groups[label])groups[label] = []
    groups[label].push(chat)
    return groups
  }, {})

  return (
    <div className="app">
      {sidebarOpen && (
        <div className="sidebar">
          <div className="sidebar-header">
            <button className="new-chat-button" onClick={createNewChat}>
              + 新しいチャット
            </button>
            <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>
              ✕
            </button>
          </div>
          <div className="chat-list">
            {Object.entries(groupedChats).map(([dateLabel, chatGroup]) => (
              <div key={dateLabel}>
                <div className="chat-list-date">{dateLabel}</div>
                {chatGroup.map((chat) => (
                  <div
                    key={chat.id}
                    className={`chat-list-item ${chat.id === activeChatId ? 'active' : ''}`}
                    onClick={() => { setActiveChatId(chat.id); setCurrentStep(null); }}
                  >
                    {chat.title}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={`header ${sidebarOpen ? '' : 'full-width'}`}>
        {!sidebarOpen && (
          <button className='sidebar-open' onClick={() => setSidebarOpen(true)}>☰</button>
        )}
        <div className="header-icon" />
        <span className="header-title">MarketInsight AI</span>
      </div>
      <div className={`chat-area ${sidebarOpen ? '' : 'full-width'}`} ref={chatAreaRef}>
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
      <div className={`input-area ${sidebarOpen ? '' : 'full-width'}`}>
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