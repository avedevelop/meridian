import React from 'react'

interface LayoutProps {
  sidebar: React.ReactNode
  editor: React.ReactNode
  rightPanel: React.ReactNode
}

export function Layout({ sidebar, editor, rightPanel }: LayoutProps) {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#1a1a1a' }}>
      <div style={{
        width: 220, flexShrink: 0, borderRight: '1px solid #2a2a2a',
        background: '#161616', display: 'flex', flexDirection: 'column',
      }}>
        {sidebar}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {editor}
      </div>
      <div style={{
        width: 200, flexShrink: 0, borderLeft: '1px solid #2a2a2a',
        background: '#161616', overflow: 'auto',
      }}>
        {rightPanel}
      </div>
    </div>
  )
}
