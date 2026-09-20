import { type ReactNode } from 'react'
import './SidebarLayout.css'

type SidebarLayoutProps = {
  sidebar: React.ReactNode
  children: ReactNode
  sidebarOpen: boolean
  onToggle: () => void
  sidebarTitle: string
}

function SidebarLayout({
  sidebar,
  children,
  sidebarOpen,
  onToggle,
  sidebarTitle,
}: SidebarLayoutProps) {
  return (
    <div className="sidebar-layout-container">
      <div className={`sidebar-layout-side ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-layout-header">
          <h3>{sidebarTitle}</h3>
          <button className="sidebar-toggle-button" onClick={onToggle}>
            {sidebarOpen ? '‹' : '›'}
          </button>
        </div>
        {sidebarOpen && sidebar}
      </div>
      <div className="sidebar-layout-main">{children}</div>
    </div>
  )
}

export default SidebarLayout
