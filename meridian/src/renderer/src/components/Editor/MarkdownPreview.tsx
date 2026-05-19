import React, { useMemo } from 'react'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import remarkRehype from 'remark-rehype'
import rehypeSanitize from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'

// Run markdown through sanitized pipeline first, then replace [[links]] in the output HTML.
// Doing it after sanitization means rehype-sanitize never strips our spans.
const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkBreaks)
  .use(remarkRehype)
  .use(rehypeSanitize)
  .use(rehypeStringify)

function postprocessWikiLinks(html: string): string {
  return html.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_match, link, alias) => {
    const label = (alias?.trim() ?? link.trim()).replace(/"/g, '&quot;')
    const linkAttr = link.trim().replace(/"/g, '&quot;')
    return `<span class="wiki-link" data-link="${linkAttr}" style="color:#7c6af7;text-decoration:underline;cursor:pointer">${label}</span>`
  })
}

interface MarkdownPreviewProps {
  content: string
  onLinkClick?: (linkText: string) => void
  fontSize?: number
  lineWidth?: number
}

export function MarkdownPreview({ content, onLinkClick, fontSize = 15, lineWidth = 720 }: MarkdownPreviewProps) {
  const html = useMemo(() => {
    try {
      const sanitized = String(processor.processSync(content))
      return postprocessWikiLinks(sanitized)
    } catch {
      return '<p>Preview error</p>'
    }
  }, [content])

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = (e.target as HTMLElement).closest('.wiki-link') as HTMLElement | null
    if (target && onLinkClick) {
      onLinkClick(target.dataset.link ?? '')
    }
  }

  return (
    <div
      className="markdown-preview"
      dangerouslySetInnerHTML={{ __html: html }}
      onClick={handleClick}
      style={{
        flex: 1,
        padding: '24px 32px',
        overflowY: 'auto',
        color: '#ccc',
        fontSize,
        lineHeight: 1.8,
        fontFamily: 'Georgia, serif',
        background: '#1e1e1e',
        maxWidth: lineWidth,
      }}
    />
  )
}
