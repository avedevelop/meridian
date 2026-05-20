import React, { useMemo } from 'react'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import remarkRehype from 'remark-rehype'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'
import { useSettingsStore } from '../../store/useSettingsStore'

// Run markdown through sanitized pipeline first, then replace [[links]] in the output HTML.
// Doing it after sanitization means rehype-sanitize never strips our spans.
const sanitizeSchema = {
  ...defaultSchema,
  protocols: {
    ...defaultSchema.protocols,
    src: [...(defaultSchema.protocols?.src ?? []), ''] // '' allows relative URLs
  }
}

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkBreaks)
  .use(remarkRehype)
  .use(rehypeSanitize, sanitizeSchema)
  .use(rehypeStringify)

function addHeadingIds(html: string): string {
  let counter = 0
  return html.replace(
    /<(h[1-6])(\s|>)/g,
    (_m, tag, after) => `<${tag} id="toc-${counter++}"${after}`
  )
}

function postprocessWikiLinks(html: string): string {
  return html.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_match, link, alias) => {
    const label = (alias?.trim() ?? link.trim()).replace(/"/g, '&quot;')
    const linkAttr = link.trim().replace(/"/g, '&quot;')
    return `<span class="wiki-link" data-link="${linkAttr}" style="color:var(--accent-color);text-decoration:underline;cursor:pointer">${label}</span>`
  })
}

interface MarkdownPreviewProps {
  content: string
  onLinkClick?: (linkText: string) => void
  fontSize?: number
  lineWidth?: number
  readableLineLength?: boolean
  vaultPath?: string
}

export function MarkdownPreview({
  content,
  onLinkClick,
  fontSize = 15,
  lineWidth = 720,
  readableLineLength = true,
  vaultPath
}: MarkdownPreviewProps) {
  const { fontFamily, fontWeight, lineHeight } = useSettingsStore()

  const fontFamilyValue = useMemo(() => {
    switch (fontFamily) {
      case 'Georgia':
        return 'Georgia, serif'
      case 'Inter':
        return 'Inter, sans-serif'
      case 'Fira Code':
        return '"Fira Code", monospace'
      case 'JetBrains Mono':
        return '"JetBrains Mono", monospace'
      case 'system-ui':
        return 'system-ui, -apple-system, sans-serif'
      default:
        return 'Georgia, serif'
    }
  }, [fontFamily])

  const html = useMemo(() => {
    try {
      const sanitized = String(processor.processSync(content))
      const withLinks = postprocessWikiLinks(sanitized)
      const withIds = addHeadingIds(withLinks)
      if (!vaultPath) return withIds
      return withIds.replace(
        /(<img)([^>]*src=")(?!https?:\/\/)(?!data:)(?!vault:\/\/\/)([^"]+)(")/g,
        (_m, imgTag, pre, src, post) =>
          `${imgTag} style="max-width:100%;height:auto;border-radius:4px"${pre}vault:///${src}${post}`
      )
    } catch {
      return '<p>Preview error</p>'
    }
  }, [content, vaultPath])

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
        color: 'var(--text-primary)',
        fontSize,
        lineHeight: String(lineHeight),
        fontWeight: fontWeight,
        fontFamily: fontFamilyValue,
        background: 'var(--bg-primary)',
        maxWidth: readableLineLength ? lineWidth : 'none',
        margin: '0 auto'
      }}
    />
  )
}
