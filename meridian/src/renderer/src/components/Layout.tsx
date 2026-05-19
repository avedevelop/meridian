import React from 'react'

interface LayoutProps {
  sidebar: React.ReactNode
  editor: React.ReactNode
  rightPanel: React.ReactNode
}

export function Layout({ sidebar, editor, rightPanel }: LayoutProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      {/* macOS traffic lights spacer — draggable title bar area */}
      <div style={{
        height: 28,
        background: '#161616',
        borderBottom: '1px solid #2a2a2a',
        flexShrink: 0,
        // @ts-ignore -- Electron drag region style is not part of React CSSProperties.
        WebkitAppRegion: 'drag',
      }} />
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden', background: '#1a1a1a' }}>
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
  )
}
