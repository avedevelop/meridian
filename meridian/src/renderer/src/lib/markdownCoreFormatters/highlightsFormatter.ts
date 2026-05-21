import type { MarkdownFormatter } from '../markdownCore'

function preprocessMd(md: string): string {
  return md.replace(/(`+[\s\S]*?`+)|==([^=\n]{1,300})==/g, (m, code, hl) => {
    if (code !== undefined) return m
    return `<mark style="background:rgba(255,220,0,0.3);border-radius:2px;padding:0 2px">${hl}</mark>`
  })
}

export const highlightsFormatter: MarkdownFormatter = {
  name: 'highlights',
  preprocessMd,
}
