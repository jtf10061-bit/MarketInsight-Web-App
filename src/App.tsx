import React, { useState, useEffect, useRef } from 'react'
import './App.css'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import TypingText from './components/TypingText'
import { useMsal, useIsAuthenticated } from '@azure/msal-react'
import { loginRequest } from './config/msalConfig'

type Chat = {
  id: string
  title: string
  date: string
  favorite: boolean
  messages: {
    role: string
    content: string
  }[]
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

const API = "http://127.0.0.1:9000"

function App() {
  const [message, setMessage] = useState('')
  // const [messages, setMessages] = useState<{ role: string; content: string }[]>([])
  const [currentStep, setCurrentStep] = useState<{ type: string; content: string} | null >(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const [chats, setChats] = useState<Chat[]>([])
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const activeChat = chats.find((c) => c.id === activeChatId)
  const messages = activeChat?.messages ?? []
  const [lastAnswerId, setLastAnswerId] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null) // useRef: 際レンダリングを起こさず、データを保持しておくための箱
  // サイドバーのサイズ変更
  const [sidebarWidth, setSidebarWidth] = useState(260)
  const isResizing = useRef(false)
  // ログイン関連の変数
  const { instance, accounts } = useMsal()
  const isAuthenticated = useIsAuthenticated()
  /*
   * ?? は「Null合体演算子」
   * 例:
   * const userName = accounts[0]?.name ?? ''
   * accounts[0]?.name が値を持っていれば → その値を使う
   * accounts[0]?.name が null または undefined なら → ''（空文字）を使う
   */
  const userName = accounts[0]?.name ?? ""
  const userEmail = accounts[0]?.username ?? ""
  const USER_ID = userEmail

  const handleLogin = () => {
    instance.loginRedirect(loginRequest)
  }


  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if(!isResizing.current) return
      const newWidth = Math.max(200, Math.min(500, e.clientX))
      setSidebarWidth(newWidth)
    }
    const handleMouseUp = () => {
      isResizing.current = false
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }
    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [])

  const scrollToBottom = () => {
    setTimeout(() => {
      const el = document.querySelector('.chat-area')
      if (el) {
        el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
      }
    }, 100)
  }

  useEffect(() => {
    if (!isAuthenticated) return
    fetch(`${API}/chats/${USER_ID}`)
      .then((res) => res.json())
      .then((data) => setChats(data))
  }, [isAuthenticated])

  if(!isAuthenticated) {
    return (
      <div className="app" style={{justifyContent: "center", alignItems: "center"}}>
        <div style={{ textAlign: "center"}}>
          <h1 style={{ fontSize: "24px", marginBottom: "16px", color: "#1e293b"}}>
            MarketInsight AI
          </h1>
          <p style={{ marginBottom: '24px', color: '#64748b' }}>
            Microsoftアカウントでログインしてください
          </p>
          <button onClick={handleLogin} style={{
            padding: '12px 32px',
            backgroundColor: '#0ea5e9',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '15px',
            cursor: 'pointer'
          }}>
            ログイン
          </button>
        </div>
      </div>
    )
  }

  const createNewChat = () => {
    const emptyChat = chats.find((c) => c.title === "新しいチャット" && c.messages.length === 0)
    if (emptyChat) {
      setActiveChatId(emptyChat.id)
      setCurrentStep(null)
      return
    }

    const newChat: Chat = {
      id: Date.now().toString(),
      title: "新しいチャット",
      date: new Date().toISOString().split('T')[0],
      favorite: false,
      messages: [],
    }
    setChats((prev) => [newChat, ...prev])
    setActiveChatId(newChat.id)
    setCurrentStep(null)
    fetch(`${API}/chats`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ id: newChat.id, title: newChat.title, date: newChat.date, user_id: USER_ID }),
    })
  }

  const deleteChat = (id: string) => {
    setChats((prev) => prev.filter((c) => c.id !== id))
    if(activeChatId === id) {
      setActiveChatId(null)
      setCurrentStep(null)
    }
    fetch(`${API}/chats/${USER_ID}/${id}`, { method: "DELETE"})
  }

  const toggleFavorite = (id: string) => {
    setChats((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, favorite: !c.favorite} : c
      )
    )
    fetch(`${API}/chats/${USER_ID}/${id}/favorite`, {method: "PATCH"})
  }

  const handleSend = async () => {
    if (!message.trim() || isStreaming) return

    const chatId = activeChatId ?? Date.now().toString()

    if(!activeChatId) {
      const newChat: Chat = {
        id: chatId,
        title: message.slice(0, 20),
        date: new Date().toISOString().split('T')[0],
        favorite: false,
        messages: []
      }
      setChats((prev) => [newChat, ...prev])
      setActiveChatId(chatId)
      fetch(`${API}/chats`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ id: newChat.id, title: newChat.title, date: newChat.date, user_id: USER_ID}),
      })
    }

    const userMsg = { role: 'user', content: message }
    setChats((prev) =>
      prev.map((c) =>
        c.id === chatId ? { ...c, title: c.title === "新しいチャット" ? message.slice(0, 20): c.title, messages: [...c.messages, userMsg]}: c
      )
    )
    scrollToBottom()

    const sendMessage = message
    setMessage('')

    await fetch(`${API}/chats/${USER_ID}/${chatId}/messages`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      // body: JSON.stringify({ role: "user", content: message})
      body: JSON.stringify({ role: "user", content: sendMessage }),
    })
    if (sendMessage.slice(0, 20) !== "新しいチャット") {
      fetch(`${API}/chats/${USER_ID}/${chatId}/title`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: message.slice(0, 20) }),
      })
    }
    // setMessages((prev) => [...prev, userMsg])

    setIsStreaming(true)

    try {
      abortRef.current = new AbortController()
      const res = await fetch(`${API}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: sendMessage, chat_id: chatId }),
        signal: abortRef.current.signal
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
            setLastAnswerId(chatId)
            setChats((prev) =>
              prev.map((c) =>
                c.id === chatId ? { ...c, messages: [...c.messages, { role: "assistant", content: step.content}]}: c
              )
            )
            scrollToBottom()
            fetch(`${API}/chats/${USER_ID}/${chatId}/messages`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ role: "assistant", content: step.content }),
            })
          } else {
            setCurrentStep(step)
          }
        }
      }
    } catch(e) {
      setCurrentStep(null)
      if (e instanceof DOMException && e.name === 'AbortError') {
        // 中止時は何もしない
      } else {
        setChats((prev) =>
          prev.map((c) =>
            c.id === chatId ? {
              ...c, messages: [...c.messages, {role: "assistant", content: "エラー: サーバーに接続できません"}]
            }
            : c
          )
        )
      }
      // setMessages((prev) => [...prev, { role: 'assistant', content: 'エラー: サーバーに接続できません' }])
    }
    setIsStreaming(false)
    abortRef.current = null
  }

  const favoriteChats = chats.filter((c) => c.favorite)
  const nonFavoriteChats = chats.filter((c) => !c.favorite)

  const groupedChats = nonFavoriteChats.reduce<Record<string, Chat[]>>((groups, chat) => {
    const label = formatDate(chat.date)
    if(!groups[label])groups[label] = []
    groups[label].push(chat)
    return groups
  }, {})

  return (
    <div className="app">
      {sidebarOpen && (
        <div className="sidebar" style={{ width: sidebarWidth }}>
          <div className="sidebar-header">
            <button className="new-chat-button" onClick={createNewChat}>
              + 新しいチャット
            </button>
            <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>
              ✕
            </button>
          </div>
          <div className="chat-list">
            {favoriteChats.length > 0 && (
              <div>
                <div className="chat-list-date">お気に入り</div>
                {favoriteChats.map((chat) => (
                  <div
                  key={chat.id}
                  className={`chat-list-item ${chat.id === activeChatId ? 'active': ''}`}
                  onClick={() => {setActiveChatId(chat.id); setCurrentStep(null); setLastAnswerId(null)}}
                  >
                    <span className="chat-list-title">{chat.title}</span>
                    <div className='chat-list-actions'>
                      <button className="chat-action-btn" onClick={(e) => {
                        e.stopPropagation(); toggleFavorite(chat.id);
                        }}>⭐︎</button>
                      <button className='chat-action-btn' onClick={(e) => {
                        e.stopPropagation(); deleteChat(chat.id);
                      }}>×</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {Object.entries(groupedChats).map(([dateLabel, chatGroup]) => (
              <div key={dateLabel}>
                <div className="chat-list-date">{dateLabel}</div>
                {chatGroup.map((chat) => (
                  <div
                    key={chat.id}
                    className={`chat-list-item ${chat.id === activeChatId ? 'active' : ''}`}
                    onClick={() => { setActiveChatId(chat.id); setCurrentStep(null); setLastAnswerId(null) }}
                  >
                    {/* {chat.title} */}
                    <span className="chat-list-title">{chat.title}</span>
                    <div className="chat-list-actions">
                      <button className="chat-action-btn" onClick={(e) => { e.stopPropagation(); toggleFavorite(chat.id); }}>☆</button>
                      <button className="chat-action-btn chat-delete-btn" onClick={(e) => { e.stopPropagation(); deleteChat(chat.id); }}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className='sidebar-resize-handle' onMouseDown={() => {
              isResizing.current = true
              document.body.style.cursor = "col-resize"
              document.body.style.userSelect = "none"
            }}
          />
        </div>
      )}

      <div className={`header ${sidebarOpen ? '' : 'full-width'}`} style={sidebarOpen ? { left: sidebarWidth } : {}}>
        {!sidebarOpen && (
          <button className='sidebar-open' onClick={() => setSidebarOpen(true)}>☰</button>
        )}
        <div className="header-icon" />
        <span className="header-title">MarketInsight AI</span>
        <span style={{ marginLeft: 'auto', fontSize: '13px', color: '#64748b' }}>{userName || userEmail}</span>
      </div>
      <div className={`chat-area ${sidebarOpen ? '' : 'full-width'}`} style={sidebarOpen ? { left: sidebarWidth } : {}}>
          {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.role === 'user' ? 'message-user' : 'message-assistant'}`}>
            {msg.role === "assistant" && index === messages.length -1 && lastAnswerId === activeChatId ? (
              <TypingText key={msg.content} text={msg.content} speed={20} onDone={() => { setLastAnswerId(null); scrollToBottom() }}/>
            ):(
              // <ReactMarkdown components={{ a: ({href, children}) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a> }}>{msg.content}</ReactMarkdown>
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: ({href, children}) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a> }}>{msg.content}</ReactMarkdown>
            )}
          </div>
        ))}
        {currentStep && (
          <div className='message message-step'>
            {/*
              * key に content も含める理由:
              * ステップは1箇所を上書きし続ける表示なので、key が変わらないと React が
              * 同じ TypingText を使い回し、前のステップの文字が残ったまま続きが打たれてしまう。
              * 現状のバックエンドは action → observation → action と交互に送るため type だけでも
              * key は毎回変わるが、将来同じ type を連続して送るようになると壊れる。
              * content を含めておけば送信順に依存せず安全。
              */}
            <TypingText key={`${currentStep.type}-${currentStep.content}`} text={`[${currentStep.type}] ${currentStep.content}`} speed={15} />
          </div>
        )}
      </div>
      <div className={`input-area ${sidebarOpen ? '' : 'full-width'}`} style={sidebarOpen ? { left: sidebarWidth } : {}}>
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && handleSend()}
          placeholder="メッセージを入力..."
        />
        {/*
        * !e.nativeEvent.isComposing: 押されたのが「Enter」キーで、かつ「変換中でない」
        */}
        {isStreaming ? (
          <button onClick={() => abortRef.current?.abort()}>中止</button>
        ) : (
          <button onClick={handleSend}>送信</button>
        )}
      </div>
    </div>
  )
}

export default App