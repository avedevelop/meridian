import React, { useMemo, useEffect, useRef, useCallback } from 'react'
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
import { flattenVaultFiles } from './markdownUtils'
import { applyPreprocessors, applyPostprocessors } from '../../lib/markdownCore'
import '../../lib/markdownCore'

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
      if (el.type === 'circle' && el.x !== undefined && el.y !== undefined && el.w !== undefined) {
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

export const MarkdownPreview = React.forwardRef<HTMLDivElement, MarkdownPreviewProps>(
  function MarkdownPreview(
    {
      content,
      onLinkClick,
      fontSize = 15,
      lineWidth = 720,
      readableLineLength = true,
      vaultPath
    }: MarkdownPreviewProps,
    scrollRef
  ) {
    const { fontWeight, lineHeight } = useSettingsStore()
    const codeBlockTheme = useSettingsStore((s) => s.codeBlockTheme)
    const previewFontFamily = useSettingsStore((s) => s.previewFontFamily)
    const { files } = useVaultStore()
    const containerRef = useRef<HTMLDivElement | null>(null)

    const setRef = useCallback(
      (el: HTMLDivElement | null) => {
        containerRef.current = el
        if (typeof scrollRef === 'function') scrollRef(el)
        else if (scrollRef)
          (scrollRef as React.MutableRefObject<HTMLDivElement | null>).current = el
      },
      [scrollRef]
    )

    // Dynamic code block syntax highlight theme
    useEffect(() => {
      const themeUrls: Record<string, string> = {
        'github-dark':
          'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css',
        monokai:
          'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/monokai.min.css',
        'one-dark':
          'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css',
        solarized:
          'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/base16/solarized-dark.min.css'
      }
      let link = document.getElementById('hljs-theme') as HTMLLinkElement | null
      if (!link) {
        link = document.createElement('link')
        link.id = 'hljs-theme'
        link.rel = 'stylesheet'
        document.head.appendChild(link)
      }
      link.href = themeUrls[codeBlockTheme] ?? themeUrls['github-dark']
    }, [codeBlockTheme])

    const previewFontFamilyValue = useMemo(() => {
      switch (previewFontFamily) {
        case 'Georgia':
          return 'Georgia, serif'
        case 'Inter':
          return 'Inter, sans-serif'
        case 'JetBrains Mono':
          return '"JetBrains Mono", monospace'
        case 'system-ui':
          return 'system-ui, -apple-system, sans-serif'
        default:
          return 'Georgia, serif'
      }
    }, [previewFontFamily])

    const html = useMemo(() => {
      try {
        // Strip YAML frontmatter before rendering so it doesn't appear as text
        const stripped = content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '')
        const preprocessed = applyPreprocessors(stripped)
        const sanitized = String(processor.processSync(preprocessed))
        const withLinks = applyPostprocessors(sanitized, files)
        const withIds = addHeadingIds(withLinks)
        if (!vaultPath) return withIds
        return withIds.replace(
          /(<img)([^>]*src=")(?!https?:\/\/)(?!data:)(?!vault:\/\/\/)([^"]+)(")/g,
          (_m, imgTag, pre, src, post) =>
            `${imgTag} style="max-width:100%;height:auto;border-radius:4px"${pre}vault:///${src}${post}`
        )
      } catch {
        return '<div style="padding:16px;color:#f87171;font-size:13px;display:flex;align-items:center;gap:8px">⚠ Preview rendering error — check your markdown syntax</div>'
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
        } catch (_err) {
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
        ref={setRef}
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
          fontFamily: previewFontFamilyValue,
          background: 'var(--bg-primary)',
          maxWidth: readableLineLength ? lineWidth : 'none',
          margin: '0 auto'
        }}
      />
    )
  }
)
