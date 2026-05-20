import React, { useMemo, useEffect, useRef } from 'react'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import remarkRehype from 'remark-rehype'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'
import { useSettingsStore } from '../../store/useSettingsStore'
import { useVaultStore } from '../../store/useVaultStore'
import { flattenVaultFiles, postprocessWikiLinks, CALLOUT_TYPES } from './markdownUtils'

// Allow custom elements (div, mark, span) and style/class attrs for callouts + highlights
const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), 'mark', 'div', 'span'],
  attributes: {
    ...defaultSchema.attributes,
    mark: ['style', 'class'],
    div: ['style', 'class', 'data-*'],
    span: [...(defaultSchema.attributes?.span ?? []), 'style', 'class'],
    '*': [...(defaultSchema.attributes?.['*'] ?? []), 'style', 'class']
  },
  protocols: {
    ...defaultSchema.protocols,
    src: [...(defaultSchema.protocols?.src ?? []), '']
  }
}

// Pre-process callout syntax before remark so it passes through as HTML
function preProcessCallouts(md: string): string {
  return md.replace(
    /^(> \[!([\w]+)\][^\n]*(?:\n> [^\n]*)*)/gm,
    (block) => {
      const lines = block.split('\n')
      const firstLine = lines[0]
      const m = firstLine.match(/^> \[!([\w]+)\](.*)/)
      if (!m) return block
      const typeKey = m[1].toLowerCase()
      const info = CALLOUT_TYPES[typeKey] ?? { icon: '📝', color: '#6b7280' }
      const displayTitle = m[2].trim() || (typeKey.charAt(0).toUpperCase() + typeKey.slice(1))
      const body = lines.slice(1).map(l => l.replace(/^> ?/, '')).join('\n').trim()
      return `<div class="callout callout-${typeKey}" style="border-left:4px solid ${info.color};background:${info.color}22;border-radius:6px;padding:12px 16px;margin:12px 0"><div class="callout-title" style="display:flex;align-items:center;gap:6px;font-weight:600;margin-bottom:${body ? '8px' : '0'};color:${info.color}"><span>${info.icon}</span><span>${displayTitle}</span></div>${body ? `<div class="callout-content">${body}</div>` : ''}</div>`
    }
  )
}

// Pre-process ==highlight== before remark (skip inside backtick code)
function preProcessHighlights(md: string): string {
  return md.replace(/(`+[\s\S]*?`+)|==([^=\n]{1,300})==/g, (m, code, hl) => {
    if (code !== undefined) return m
    return `<mark style="background:rgba(255,220,0,0.3);border-radius:2px;padding:0 2px">${hl}</mark>`
  })
}

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkBreaks)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeSanitize, sanitizeSchema)
  .use(rehypeStringify)

function addHeadingIds(html: string): string {
  let counter = 0
  return html.replace(
    /<(h[1-6])(\s|>)/g,
    (_m, tag, after) => `<${tag} id="toc-${counter++}"${after}`
  )
}


function escapeHtml(str: string): string {
  if (typeof str !== 'string') return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
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
        return `<path d="${d}" stroke="${escapeHtml(el.stroke)}" stroke-width="${el.strokeWidth}" fill="none" stroke-linecap="round" stroke-linejoin="round" />`
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
        return `<rect x="${x}" y="${y}" width="${Math.abs(el.w)}" height="${Math.abs(el.h)}" stroke="${escapeHtml(el.stroke)}" stroke-width="${el.strokeWidth}" fill="${escapeHtml(el.fill)}" />`
      }
      if (
        el.type === 'circle' &&
        el.x !== undefined &&
        el.y !== undefined &&
        el.w !== undefined
      ) {
        return `<circle cx="${el.x}" cy="${el.y}" r="${el.w}" stroke="${escapeHtml(el.stroke)}" stroke-width="${el.strokeWidth}" fill="${escapeHtml(el.fill)}" />`
      }
      if (
        el.type === 'line' &&
        el.x !== undefined &&
        el.y !== undefined &&
        el.w !== undefined &&
        el.h !== undefined
      ) {
        return `<line x1="${el.x}" y1="${el.y}" x2="${el.w}" y2="${el.h}" stroke="${escapeHtml(el.stroke)}" stroke-width="${el.strokeWidth}" />`
      }
      if (el.type === 'text' && el.x !== undefined && el.y !== undefined && el.text) {
        return `<text x="${el.x}" y="${el.y}" fill="${escapeHtml(el.stroke)}" font-size="${el.strokeWidth}" font-family="sans-serif">${escapeHtml(el.text)}</text>`
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
      // Strip YAML frontmatter before rendering so it doesn't appear as text
      const stripped = content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '')
      const preprocessed = preProcessHighlights(preProcessCallouts(stripped))
      const sanitized = String(processor.processSync(preprocessed))
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

  // Load and render note embeddings
  useEffect(() => {
    if (!containerRef.current) return
    const embeds = containerRef.current.querySelectorAll('.note-embed')
    if (embeds.length === 0) return

    embeds.forEach(async (el) => {
      const htmlEl = el as HTMLElement
      const dataPath = htmlEl.dataset.path
      if (!dataPath) return
      const contentEl = htmlEl.querySelector('.note-embed-content') as HTMLElement | null
      if (!contentEl) return

      try {
        const raw = await window.vault.readFile(dataPath)
        // Strip frontmatter before rendering
        const withoutFm = raw.replace(/^---[\s\S]*?---\n*/, '')
        const renderedHtml = String(processor.processSync(withoutFm))
        contentEl.innerHTML = renderedHtml
      } catch {
        contentEl.innerHTML = `<span style="color:var(--text-secondary);font-size:12px;font-style:italic">Could not load note</span>`
      }
    })
  }, [html])

  // Render Mermaid diagrams
  useEffect(() => {
    if (!containerRef.current) return
    const codeEls = Array.from(
      containerRef.current.querySelectorAll('code.language-mermaid')
    ) as HTMLElement[]
    if (codeEls.length === 0) return

    let cancelled = false

    ;(async () => {
      try {
        const mermaid = (await import('mermaid')).default
        mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'loose' })

        for (const codeEl of codeEls) {
          if (cancelled) break
          const code = codeEl.textContent ?? ''
          const pre = codeEl.parentElement
          if (!pre || pre.dataset.mermaidDone) continue

          const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
          try {
            const { svg } = await mermaid.render(id, code)
            const wrapper = document.createElement('div')
            wrapper.style.cssText =
              'overflow-x:auto;margin:12px 0;background:var(--bg-secondary);border-radius:6px;padding:16px;text-align:center'
            wrapper.innerHTML = svg
            pre.replaceWith(wrapper)
          } catch {
            // Leave as code block on render error — don't crash the preview
            pre.dataset.mermaidDone = 'error'
          }
        }
      } catch {
        // mermaid import failed — leave code blocks unchanged
      }
    })()

    return () => {
      cancelled = true
    }
  }, [html])

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
