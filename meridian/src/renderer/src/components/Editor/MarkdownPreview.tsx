import React, { useMemo } from 'react'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import remarkRehype from 'remark-rehype'
import rehypeSanitize from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkBreaks)
  .use(remarkRehype)
  .use(rehypeSanitize)
  .use(rehypeStringify)

interface MarkdownPreviewProps {
  content: string
}

export function MarkdownPreview({ content }: MarkdownPreviewProps) {
  const html = useMemo(() => {
    try {
      return String(processor.processSync(content))
    } catch {
      return '<p>Preview error</p>'
    }
  }, [content])

  return (
    <div
      className="markdown-preview"
      dangerouslySetInnerHTML={{ __html: html }}
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
