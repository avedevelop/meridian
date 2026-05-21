import { describe, it, expect } from 'vitest'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { buildLivePreviewDecorations } from '../../src/renderer/src/components/Editor/extensions/livePreview'
import { markdown, markdownLanguage } from '@codemirror/lang-markdown'
import { languages } from '@codemirror/language-data'

describe('livePreviewExtension', () => {
  it('does not throw when calling buildLivePreviewDecorations on markdown with a table', () => {
    const text = `
# Header

| Col 1 | Col 2 |
|---|---|
| Cell 1 | Cell 2 |
| \`![[image.png]]\` | Embed |
`
    const state = EditorState.create({
      doc: text,
      extensions: [
        markdown({ base: markdownLanguage, codeLanguages: languages })
      ]
    })

    const parent = document.createElement('div')
    document.body.appendChild(parent)

    const view = new EditorView({ state, parent })

    let error: any = null
    try {
      const decos = buildLivePreviewDecorations(view)
      console.log("DECOS count:", decos.size)
      const cursor = decos.iter()
      while (cursor.value) {
        console.log("DECO:", cursor.from, cursor.to, cursor.value)
        cursor.next()
      }
    } catch (e) {
      error = e
      console.error("CAUGHT ERROR:", e)
    } finally {
      view.destroy()
      parent.remove()
    }

    expect(error).toBeNull()
  })

  it('correctly sorts generated decorations by from, then startSide, then to descending', () => {
    const text = `
# Header

| Col 1 | Col 2 |
|---|---|
| Cell 1 | Cell 2 |
| \`![[image.png]]\` | Embed |
`
    const state = EditorState.create({
      doc: text,
      extensions: [
        markdown({ base: markdownLanguage, codeLanguages: languages })
      ]
    })

    const parent = document.createElement('div')
    document.body.appendChild(parent)
    const view = new EditorView({ state, parent })

    try {
      const decos = buildLivePreviewDecorations(view)
      const list: Array<{ from: number; to: number; startSide: number }> = []
      const cursor = decos.iter()
      while (cursor.value) {
        list.push({
          from: cursor.from,
          to: cursor.to,
          startSide: cursor.value.startSide
        })
        cursor.next()
      }

      // Assert that they are correctly sorted:
      // 1. from ascending
      // 2. if from is equal, startSide ascending
      // 3. if from and startSide are equal, to descending
      for (let i = 0; i < list.length - 1; i++) {
        const cur = list[i]
        const next = list[i + 1]

        if (cur.from !== next.from) {
          expect(cur.from).toBeLessThan(next.from)
        } else {
          // from is equal, check startSide
          if (cur.startSide !== next.startSide) {
            expect(cur.startSide).toBeLessThan(next.startSide)
          } else {
            // startSide is also equal, check to descending
            expect(cur.to).toBeGreaterThanOrEqual(next.to)
          }
        }
      }
    } finally {
      view.destroy()
      parent.remove()
    }
  })
})

