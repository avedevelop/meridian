import React from 'react'

interface QuickActionButtonProps {
  icon: React.ReactNode
  title: string
  onClick: () => void
}

export function QuickActionButton({ icon, title, onClick }: QuickActionButtonProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: 'transparent',
        border: 'none',
        color: 'var(--text-secondary)',
        cursor: 'pointer',
        width: 24,
        height: 24,
        borderRadius: 4,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.15s',
        // @ts-ignore
        WebkitAppRegion: 'no-drag'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--bg-surface)'
        e.currentTarget.style.color = 'var(--accent-color)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent'
        e.currentTarget.style.color = 'var(--text-secondary)'
      }}
    >
      {icon}
    </button>
  )
}
export default QuickActionButton
