import { useCallback } from 'react'
import type { EditorView } from '@codemirror/view'

export function useEditorDnd(
  viewRef: React.RefObject<EditorView | null>,
  vault: { path: string } | null,
  saveImage: (base64: string, ext: string) => Promise<string | null>
) {
  const handleImagePaste = useCallback(
    async (base64: string, ext: string) => {
      return saveImage(base64, ext)
    },
    [saveImage]
  )

  const handleEditorDragOver = useCallback((e: React.DragEvent) => {
    const types = e.dataTransfer.types
    if (
      types.includes('application/meridian-file') ||
      types.includes('text/plain') ||
      types.includes('Files')
    ) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
    }
  }, [])

  const handleEditorDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()

      // Handle image files dragged from Finder
      const imageExts = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp'])
      const droppedFiles = Array.from(e.dataTransfer.files)
      const imageFile = droppedFiles.find((f) => {
        const ext = f.name.split('.').pop()?.toLowerCase() ?? ''
        return imageExts.has(ext)
      })

      if (imageFile) {
        const ext = imageFile.name.split('.').pop()?.toLowerCase() ?? 'png'
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => {
            const result = reader.result as string
            resolve(result.split(',')[1] ?? '')
          }
          reader.onerror = reject
          reader.readAsDataURL(imageFile)
        })
        const savedPath = await saveImage(base64, ext)
        if (savedPath) {
          const view = viewRef.current
          if (view) {
            const sel = view.state.selection.main
            const insertText = `![image](${savedPath})`
            view.dispatch({
              changes: { from: sel.from, to: sel.to, insert: insertText },
              selection: { anchor: sel.from + insertText.length }
            })
            view.focus()
          }
        }
        return
      }

      const raw = e.dataTransfer.getData('application/meridian-file')
      const plainText = e.dataTransfer.getData('text/plain')

      let path = ''
      let relativePath = ''

      if (raw) {
        try {
          const fileInfo = JSON.parse(raw) as { path: string; name: string; relativePath: string }
          path = fileInfo.path
          relativePath = fileInfo.relativePath
        } catch {
          /* ignore */
        }
      }

      if (!relativePath && plainText) {
        path = plainText
        if (vault) {
          if (path.startsWith(vault.path)) {
            relativePath = path.slice(vault.path.length).replace(/^\/+/, '')
          } else {
            relativePath = path.split('/').pop() ?? ''
          }
        } else {
          relativePath = path.split('/').pop() ?? ''
        }
      }

      if (!relativePath) return

      const wikiLink = `[[${relativePath.replace(/\.md$/i, '')}]]`
      const view = viewRef.current
      if (view) {
        const state = view.state
        if (view.hasFocus) {
          const selection = state.selection.main
          view.dispatch({
            changes: { from: selection.from, to: selection.to, insert: wikiLink },
            selection: { anchor: selection.from + wikiLink.length }
          })
        } else {
          const docLength = state.doc.length
          const insertText =
            docLength === 0 || state.doc.toString().endsWith('\n') ? wikiLink : `\n${wikiLink}`
          view.dispatch({
            changes: { from: docLength, to: docLength, insert: insertText },
            selection: { anchor: docLength + insertText.length }
          })
        }
        view.focus()
      }
    },
    [vault, saveImage, viewRef]
  )

  return { handleImagePaste, handleEditorDragOver, handleEditorDrop }
}
