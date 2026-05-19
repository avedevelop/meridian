const FILE_COLORS: Record<string, string> = {
  '.md': '#7c6af7',
  '.txt': '#9e9e9e',
  '.json': '#e8a44d',
  '.js': '#cbcb41',
  '.ts': '#519aba',
  '.tsx': '#519aba',
  '.jsx': '#89d957',
  '.css': '#42a5f5',
  '.html': '#e44d26',
  '.png': '#8bc34a',
  '.jpg': '#8bc34a',
  '.jpeg': '#8bc34a',
  '.gif': '#8bc34a',
  '.webp': '#8bc34a',
  '.svg': '#ff9800',
  '.pdf': '#f44336',
}

interface FileIconProps {
  name: string
  isDirectory: boolean
  isOpen?: boolean
}

export function FileIcon({ name, isDirectory, isOpen = false }: FileIconProps) {
  if (isDirectory) {
    return (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
        {isOpen ? (
          <>
            <path d="M1 4a1 1 0 011-1h4l1.5 2H14a1 1 0 011 1v7a1 1 0 01-1 1H2a1 1 0 01-1-1V4z" fill="#dcb67a"/>
            <path d="M1 7h14" stroke="#c9a15a" strokeWidth="0.6"/>
          </>
        ) : (
          <path d="M1 4a1 1 0 011-1h4l1.5 2H14a1 1 0 011 1v6a1 1 0 01-1 1H2a1 1 0 01-1-1V4z" fill="#dcb67a"/>
        )}
      </svg>
    )
  }

  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')).toLowerCase() : ''
  const color = FILE_COLORS[ext] ?? '#666'

  return (
    <svg width="13" height="15" viewBox="0 0 13 15" fill="none" style={{ flexShrink: 0 }}>
      <path d="M1 0h7l4 4v10a1 1 0 01-1 1H1a1 1 0 01-1-1V1a1 1 0 011-1z" fill={color} opacity="0.85"/>
      <path d="M8 0v3.5a.5.5 0 00.5.5H12" stroke={color} strokeWidth="0.8"/>
    </svg>
  )
}
