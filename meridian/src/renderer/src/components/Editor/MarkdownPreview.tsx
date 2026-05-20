import React, { useMemo, useEffect, useRef } from 'react'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import remarkRehype from 'remark-rehype'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'
import { useSettingsStore } from '../../store/useSettingsStore'
import { useVaultStore } from '../../store/useVaultStore'
import { flattenVaultFiles, postprocessWikiLinks } from './markdownUtils'

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


function renderDrawingToSVG(elements: any[]): string {
  return elements
    .map((el) => {
      if (el.type === 'pencil' && el.points && el.points.length > 0) {
        const d =
          `M ${el.points[0][0]} ${el.points[0][1]} ` +
          el.points
            .slice(1)
            .map((p) => `L ${p[0]} ${p[1]}`)
            .join(' ')
        return `<path d="${d}" stroke="${el.stroke}" stroke-width="${el.strokeWidth}" fill="none" stroke-linecap="round" stroke-linejoin="round" />`
      }
      if (
        el.type === 'rectangle' &&
        el.x !== undefined &&
        el.y !== undefined &&
        el.w !== undefined &&
        el.h !== undefined
      ) {
        const x = el.w < 0 ? el.x + el.w : el.x
        const y = el.h < 0 ? el.y + el.h : el.y
        return `<rect x="${x}" y="${y}" width="${Math.abs(el.w)}" height="${Math.abs(el.h)}" stroke="${el.stroke}" stroke-width="${el.strokeWidth}" fill="${el.fill}" />`
      }
      if (
        el.type === 'circle' &&
        el.x !== undefined &&
        el.y !== undefined &&
        el.w !== undefined
      ) {
        return `<circle cx="${el.x}" cy="${el.y}" r="${el.w}" stroke="${el.stroke}" stroke-width="${el.strokeWidth}" fill="${el.fill}" />`
      }
      if (
        el.type === 'line' &&
        el.x !== undefined &&
        el.y !== undefined &&
        el.w !== undefined &&
        el.h !== undefined
      ) {
        return `<line x1="${el.x}" y1="${el.y}" x2="${el.w}" y2="${el.h}" stroke="${el.stroke}" stroke-width="${el.strokeWidth}" />`
      }
      if (el.type === 'text' && el.x !== undefined && el.y !== undefined && el.text) {
        return `<text x="${el.x}" y="${el.y}" fill="${el.stroke}" font-size="${el.strokeWidth}" font-family="sans-serif">${el.text}</text>`
      }
      return ''
    })
    .join('\n')
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
  const { files } = useVaultStore()
  const containerRef = useRef<HTMLDivElement>(null)

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
      const withLinks = postprocessWikiLinks(sanitized, files)
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
  }, [content, vaultPath, files])

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = (e.target as HTMLElement).closest('.wiki-link') as HTMLElement | null
    if (target && onLinkClick) {
      onLinkClick(target.dataset.link ?? '')
    }
  }

  // Load and render drawing embeddings
  useEffect(() => {
    if (!containerRef.current) return
    const embeds = containerRef.current.querySelectorAll('.excalidraw-embed')
    const flatFiles = flattenVaultFiles(files)

    embeds.forEach(async (el) => {
      const htmlEl = el as HTMLElement
      const dataLink = htmlEl.dataset.link
      if (!dataLink) return

      const match = flatFiles.find(
        (f) =>
          f.name.toLowerCase() === dataLink.toLowerCase() ||
          f.relativePath.toLowerCase() === dataLink.toLowerCase() ||
          f.name.toLowerCase() === `${dataLink.toLowerCase()}.excalidraw`
      )

      if (!match) {
        htmlEl.innerHTML = `<span style="color:var(--text-secondary);font-size:12px">Drawing not found: ${dataLink}</span>`
        return
      }

      try {
        const raw = await window.vault.readFile(match.path)
        const parsed = JSON.parse(raw)
        if (parsed.type === 'meridian-drawing' && Array.isArray(parsed.elements)) {
          if (parsed.elements.length === 0) {
            htmlEl.innerHTML = `<span style="color:var(--text-secondary);font-size:12px;font-style:italic">Empty drawing</span>`
            return
          }
          const svgHtml = renderDrawingToSVG(parsed.elements)
          // Dynamically compute viewBox bounding box or use default 800x600
          htmlEl.innerHTML = `<svg viewBox="0 0 800 600" style="width:100%;height:100%;display:block">${svgHtml}</svg>`
        } else {
          htmlEl.innerHTML = `<span style="color:var(--text-secondary);font-size:12px">Invalid drawing format</span>`
        }
      } catch (err) {
        htmlEl.innerHTML = `<span style="color:var(--text-secondary);font-size:12px">Failed to load drawing</span>`
      }
    })
  }, [html, files])

  return (
    <div
      ref={containerRef}
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
