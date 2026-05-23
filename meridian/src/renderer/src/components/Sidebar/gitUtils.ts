export function timeAgo(dateStr: string, t: any): string {
  const now = new Date()
  const then = new Date(dateStr)
  if (isNaN(then.getTime())) return dateStr
  const diffDays = Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return t('gitPanel.today')
  if (diffDays === 1) return t('gitPanel.yesterday')
  if (diffDays < 7) return t('gitPanel.daysAgo', { count: diffDays })
  if (diffDays < 30) return t('gitPanel.weeksAgo', { count: Math.floor(diffDays / 7) })
  if (diffDays < 365) return t('gitPanel.monthsAgo', { count: Math.floor(diffDays / 30) })
  return t('gitPanel.yearsAgo', { count: Math.floor(diffDays / 365) })
}

export function applyCommitTemplate(
  template: string,
  changes: { path: string; status: string }[]
): string {
  if (changes.length === 0) return ''
  const names = changes.slice(0, 3).map((c) => c.path.split('/').pop() ?? c.path)
  const suffix = changes.length > 3 ? ` +${changes.length - 3} more` : ''
  const files = names.join(', ') + suffix
  return template.replace('{files}', files)
}
