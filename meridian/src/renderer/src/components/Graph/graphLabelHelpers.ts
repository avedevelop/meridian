export function shouldShowLabel(
  mode: 'auto' | 'hover' | 'all',
  zoomK: number,
  degree: number,
  isHovered: boolean
): boolean {
  if (mode === 'all') return true
  if (mode === 'hover') return isHovered
  // mode === 'auto'
  return zoomK >= 1.2 || degree >= 2 || isHovered
}

export function truncateLabel(name: string, maxLen: number = 24): string {
  if (name.length > maxLen) {
    return name.slice(0, maxLen - 2) + '…'
  }
  return name
}
