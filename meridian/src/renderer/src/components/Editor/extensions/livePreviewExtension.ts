import { ViewPlugin, ViewUpdate, Decoration, DecorationSet, WidgetType, EditorView } from '@codemirror/view'
import { RangeSetBuilder } from '@codemirror/state'
import { syntaxTree } from '@codemirror/language'
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
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkBreaks)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeRaw)
  .use(rehypeSanitize, sanitizeSchema)
  .use(rehypeStringify)

// Cache rendered HTML per block text to avoid re-processing on every cursor move
const renderCache = new Map<string, string>()

function renderBlock(text: string): string {
  if (renderCache.has(text)) return renderCache.get(text)!
  try {
    const files = useVaultStore.getState().files
    const vault = useVaultStore.getState().vault
    const preprocessed = applyPreprocessors(text)
    let html = String(processor.processSync(preprocessed))
    html = applyPostprocessors(html, files)
    // Fix relative image paths to vault:// protocol
    if (vault?.path) {
      html = html.replace(
        /(<img)([^>]*src=")(?!https?:\/\/)(?!data:)(?!vault:\/\/\/)([^"]+)(")/g,
        (_m, tag, pre, src, post) =>
          `${tag} style="max-width:100%;height:auto;border-radius:4px"${pre}vault:///${src}${post}`
      )
    }
    if (renderCache.size > 300) {
      const first = renderCache.keys().next().value
      renderCache.delete(first)
    }
    renderCache.set(text, html)
    return html
  } catch {
    return `<p style="color:var(--text-primary)">${text.replace(/</g, '&lt;')}</p>`
  }
}

class BlockWidget extends WidgetType {
  constructor(private html: string) { super() }

  toDOM() {
    const div = document.createElement('div')
    div.className = 'cm-live-block'
    div.innerHTML = this.html
    return div
  }

  eq(other: BlockWidget) { return other.html === this.html }
  ignoreEvent() { return false }
}

const TOP_LEVEL_BLOCKS = new Set([
  'ATXHeading1', 'ATXHeading2', 'ATXHeading3', 'ATXHeading4', 'ATXHeading5', 'ATXHeading6',
  'SetextHeading1', 'SetextHeading2',
  'Paragraph',
  'BulletList', 'OrderedList',
  'Blockquote',
  'FencedCode', 'IndentedCode',
  'HorizontalRule',
  'HTMLBlock',
  'Table',
])

function buildDecos(view: EditorView): DecorationSet {
  const { state } = view
  const cursorPos = state.selection.main.head
  const cursorLineNum = state.doc.lineAt(cursorPos).number

  const blocks: { from: number; to: number; text: string }[] = []

  syntaxTree(state).iterate({
    enter(node) {
      if (node.parent?.name !== 'Document') return
      if (!TOP_LEVEL_BLOCKS.has(node.name)) return false

      const lineFrom = state.doc.lineAt(node.from).from
      const lineTo = state.doc.lineAt(node.to).to
      const startLine = state.doc.lineAt(lineFrom).number
      const endLine = state.doc.lineAt(lineTo).number

      // Show raw markdown when cursor is in or adjacent to this block
      if (cursorLineNum >= startLine && cursorLineNum <= endLine) return false

      blocks.push({ from: lineFrom, to: lineTo, text: state.doc.sliceString(lineFrom, lineTo) })
      return false
    }
  })

  blocks.sort((a, b) => a.from - b.from)

  const builder = new RangeSetBuilder<Decoration>()
  let lastTo = -1

  for (const { from, to, text } of blocks) {
    if (from < lastTo) continue
    const html = renderBlock(text)
    builder.add(from, to, Decoration.replace({ widget: new BlockWidget(html), block: true }))
    lastTo = to
  }

  return builder.finish()
}

export const livePreviewExtension = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = buildDecos(view)
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet || update.viewportChanged) {
        if (update.docChanged) renderCache.clear()
        this.decorations = buildDecos(update.view)
      }
    }
  },
  { decorations: (v) => v.decorations }
)
