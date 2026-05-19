import React, { useMemo } from 'react'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import remarkRehype from 'remark-rehype'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'

const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    span: [...(defaultSchema.attributes?.span ?? []), 'className', 'style', 'dataLink', 'data-link'],
  },
}

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkBreaks)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeSanitize, sanitizeSchema)
  .use(rehypeStringify, { allowDangerousHtml: true })

// Pre-process wiki-links before remark: [[Note]] → styled span
function preprocessWikiLinks(content: string): string {
  return content.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_match, link, alias) => {
    const label = alias?.trim() ?? link.trim()
    return `<span class="wiki-link" data-link="${link.trim()}" style="color:#7c6af7;text-decoration:underline;cursor:pointer">${label}</span>`
  })
}

interface MarkdownPreviewProps {
  content: string
  onLinkClick?: (linkText: string) => void
}

export function MarkdownPreview({ content, onLinkClick }: MarkdownPreviewProps) {
  const html = useMemo(() => {
    try {
      const processed = preprocessWikiLinks(content)
      return String(processor.processSync(processed))
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
        fontSize: 15,
        lineHeight: 1.8,
        fontFamily: 'Georgia, serif',
        background: '#1e1e1e',
        maxWidth: 720,
      }}
    />
  )
}
