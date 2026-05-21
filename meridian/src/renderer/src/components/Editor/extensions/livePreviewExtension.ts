import { StateField, Transaction, Range } from '@codemirror/state'
import { Decoration, DecorationSet, EditorView, WidgetType } from '@codemirror/view'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import remarkRehype from 'remark-rehype'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import rehypeStringify from 'rehype-stringify'
import { applyPreprocessors, applyPostprocessors } from '../../../lib/markdownCore'
import { useVaultStore } from '../../../store/useVaultStore'
import '../../../lib/markdownCore'

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
  protocols: { ...defaultSchema.protocols, src: [...(defaultSchema.protocols?.src ?? []), ''] }
}

const processor = unified()
  .use(remarkParse).use(remarkGfm).use(remarkBreaks)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw).use(rehypeSanitize, sanitizeSchema).use(rehypeStringify)

const renderCache = new Map<string, string>()

function renderBlock(text: string): string {
  if (renderCache.has(text)) return renderCache.get(text)!
  try {
    const { files, vault } = useVaultStore.getState()
    const preprocessed = applyPreprocessors(text)
    let html = String(processor.processSync(preprocessed))
    html = applyPostprocessors(html, files)
    if (vault?.path) {
      html = html.replace(
        /(<img)([^>]*src=")(?!https?:\/\/)(?!data:)(?!vault:\/\/\/)([^"]+)(")/g,
        (_m, tag, pre, src, post) =>
          `${tag} style="max-width:100%;height:auto;border-radius:4px"${pre}vault:///${src}${post}`
      )
    }
    if (renderCache.size > 300) renderCache.delete(renderCache.keys().next().value!)
    renderCache.set(text, html)
    return html
  } catch {
    return `<p>${text.replace(/</g, '&lt;')}</p>`
  }
}

class BlockWidget extends WidgetType {
  constructor(private html: string, private anchor: number) { super() }

  toDOM(view: EditorView) {
    const div = document.createElement('div')
    div.className = 'cm-live-block'
    div.innerHTML = this.html

    // Click → move cursor into block → block becomes editable raw markdown
    div.addEventListener('click', () => {
      if (window.getSelection()?.toString()) return
      view.dispatch({ selection: { anchor: this.anchor } })
      view.focus()
    })

    requestAnimationFrame(() => {
      this._mermaid(div)
      this._embeds(div)
    })
    return div
  }

  private _mermaid(div: HTMLElement) {
    const els = Array.from(div.querySelectorAll('code.language-mermaid')) as HTMLElement[]
    if (!els.length) return
    import('mermaid').then(m => {
      const mermaid = m.default
      mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'loose' })
      els.forEach(async (codeEl) => {
        const pre = codeEl.parentElement
        if (!pre || pre.dataset.mermaidDone) return
        const id = `mm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
        try {
          const { svg } = await mermaid.render(id, codeEl.textContent ?? '')
          const w = document.createElement('div')
          w.style.cssText = 'overflow-x:auto;margin:4px 0;background:var(--bg-secondary);border-radius:6px;padding:16px;text-align:center'
          w.innerHTML = svg
          pre.replaceWith(w)
        } catch { pre.dataset.mermaidDone = 'error' }
      })
    }).catch(() => {})
  }

  private _embeds(div: HTMLElement) {
    const els = Array.from(div.querySelectorAll('.note-embed')) as HTMLElement[]
    els.forEach(async (el) => {
      const path = el.dataset.path
      const contentEl = el.querySelector('.note-embed-content') as HTMLElement | null
      if (!path || !contentEl) return
      try {
        const raw = await (window as any).vault.readFile(path)
        contentEl.innerHTML = String(processor.processSync(raw.replace(/^---[\s\S]*?---\n*/, '')))
      } catch {
        contentEl.innerHTML = '<span style="color:var(--text-secondary);font-size:12px">Could not load note</span>'
      }
    })
  }

  eq(other: BlockWidget) { return other.html === this.html }
  ignoreEvent() { return true }
}

class FrontmatterWidget extends WidgetType {
  toDOM(view: EditorView) {
    const div = document.createElement('div')
    div.style.display = 'none'
    div.addEventListener('mousedown', (e) => {
      e.preventDefault()
      view.dispatch({ selection: { anchor: 0 } })
      view.focus()
    })
    return div
  }
  eq() { return true }
  ignoreEvent() { return true }
}

function nextNonBlankFrom(doc: import('@codemirror/state').Text, afterLine: number): number {
  let k = afterLine + 1
  while (k <= doc.lines && doc.line(k).text.trim() === '') k++
  return k <= doc.lines ? doc.line(k).from : doc.length
}

function buildDecos(state: import('@codemirror/state').EditorState): DecorationSet {
  const doc = state.doc
  const cursorLine = doc.lineAt(state.selection.main.head).number
  const decos: Range<Decoration>[] = []

  // ── Frontmatter ──────────────────────────────────────────────────────────
  let contentStart = 1
  let fmEndLine = 0
  if (doc.lines >= 1 && doc.line(1).text.trim() === '---') {
    for (let k = 2; k <= doc.lines; k++) {
      const t = doc.line(k).text.trim()
      if (t === '---' || t === '...') { fmEndLine = k; contentStart = k + 1; break }
    }
  }

  // ── Scan content blocks ───────────────────────────────────────────────────
  type Block = { startLine: number; endLine: number; from: number; contentTo: number }
  const blocks: Block[] = []
  let i = contentStart
  while (i <= doc.lines) {
    if (doc.line(i).text.trim() === '') { i++; continue }
    const startLine = i
    const from = doc.line(i).from
    const fence = doc.line(i).text.trim().match(/^(`{3,}|~{3,})/)
    if (fence) {
      const fc = fence[1][0]; i++
      while (i <= doc.lines) { const t = doc.line(i).text.trim(); i++; if (t.startsWith(fc.repeat(3))) break }
    } else {
      i++
      while (i <= doc.lines && doc.line(i).text.trim() !== '') i++
    }
    const endLine = i - 1
    blocks.push({ startLine, endLine, from, contentTo: doc.line(endLine).to })
  }

  // ── Build decorations ─────────────────────────────────────────────────────

  // Hide frontmatter (extend range to swallow blank lines after it)
  if (fmEndLine > 0 && (cursorLine < 1 || cursorLine > fmEndLine)) {
    const fmExtTo = blocks.length > 0 ? blocks[0].from : doc.length
    decos.push(
      Decoration.replace({ widget: new FrontmatterWidget(), block: true })
        .range(doc.line(1).from, fmExtTo)
    )
  }

  // Render each block; extend range to absorb trailing blank lines
  for (let b = 0; b < blocks.length; b++) {
    const { startLine, endLine, from, contentTo } = blocks[b]
    if (cursorLine >= startLine && cursorLine <= endLine) continue

    // extTo = start of next block (absorbs blank lines between blocks)
    const extTo = b + 1 < blocks.length ? blocks[b + 1].from : nextNonBlankFrom(doc, endLine)

    const html = renderBlock(doc.sliceString(from, contentTo))
    decos.push(
      Decoration.replace({ widget: new BlockWidget(html, from), block: true })
        .range(from, extTo)
    )
  }

  return Decoration.set(decos, true)
}

export const livePreviewExtension = StateField.define<DecorationSet>({
  create: (state) => buildDecos(state),
  update(_, tr: Transaction) {
    if (tr.docChanged) renderCache.clear()
    if (tr.docChanged || tr.selection) return buildDecos(tr.state)
    return _
  },
  provide: (f) => EditorView.decorations.from(f)
})
