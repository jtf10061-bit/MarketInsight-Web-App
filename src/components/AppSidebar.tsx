import React from "react"
import './AppSidebar.css'

type AppItem = {
    id: string,
    name: string,
    icon: string
}

const APPS: AppItem[] = [
    {id: "ai-chat", name:"AIチャット", icon: "💬"},
    {id: "document-rag", name:"ドキュメント検索RAG", icon: "📄"},
    {id: "pdf-rag", name:"PDF書き起こしRAG", icon: "💬"},
]

type Props = {
    activeApp: string,
    onSelectApp: (id: string) => void
}

function AppSidebar({ activeApp, onSelectApp}: Props) {
    return (
        <div className="app-sidebar">
            <div className="app-sidebar-logo">MI</div>
            <div className="app-sidebar-list">
                {APPS.map((app) => (
                    <div
                        key={app.id}
                        className={`app-sidebar-item ${app.id === activeApp ? 'active': ''}`}
                        onClick={() => onSelectApp(app.id)}
                        title={app.name}
                    >
                        <span className="app-sidebar-icon">{app.icon}</span>
                        <span className="app-sidebar-label">{app.name}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default AppSidebar