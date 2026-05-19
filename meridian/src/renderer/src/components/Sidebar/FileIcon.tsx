import { FolderIcon, FileIcon as CustomFileIcon } from '../Icons'

const FILE_COLORS: Record<string, string> = {
  '.md': '#7c6af7',
  '.canvas': '#a78bfa',
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
  '.pdf': '#f44336'
}

interface FileIconProps {
  name: string
  isDirectory: boolean
  isOpen?: boolean
}

export function FileIcon({ name, isDirectory, isOpen = false }: FileIconProps) {
  if (isDirectory) {
    return <FolderIcon open={isOpen} size={14} color="#dcb67a" />
  }

  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')).toLowerCase() : ''
  const color = FILE_COLORS[ext] ?? '#666'

  return <CustomFileIcon size={14} color={color} />
}
