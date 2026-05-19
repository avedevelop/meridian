import React from 'react'

interface LayoutProps {
  activityBar: React.ReactNode
  sidebar: React.ReactNode
  editor: React.ReactNode
  rightPanel: React.ReactNode
}

export function Layout({ activityBar, sidebar, editor, rightPanel }: LayoutProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden', background: '#1a1a1a' }}>
        {/* Activity bar — full height, owns its own drag region at top */}
        {activityBar}
        {/* Sidebar + editor + right panel in a column (title bar + content) */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Title bar drag region */}
          <div style={{
            height: 28, background: '#161616', borderBottom: '1px solid #2a2a2a', flexShrink: 0,
            // @ts-ignore
            WebkitAppRegion: 'drag',
          }} />
          <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
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
        </div>
      </div>
    </div>
  )
}
