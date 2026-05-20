import { EditorView } from '@codemirror/view'
import { Extension } from '@codemirror/state'

export function imagePasteExtension(
  onImagePaste: (base64: string, ext: string) => Promise<string | null>
): Extension {
  return EditorView.domEventHandlers({
    paste(event, view) {
      const items = event.clipboardData?.items
      if (!items) return false

      for (const item of Array.from(items)) {
        if (!item.type.startsWith('image/')) continue
        event.preventDefault()

        const ext = item.type.split('/')[1]?.replace('jpeg', 'jpg') ?? 'png'
        const blob = item.getAsFile()
        if (!blob) continue

        const reader = new FileReader()
        reader.onload = async () => {
          const dataUrl = reader.result as string
          const base64 = dataUrl.split(',')[1]
          if (!base64) return

          const cursor = view.state.selection.main.head
          const relativePath = await onImagePaste(base64, ext)
          if (!relativePath) return

          view.dispatch({
            changes: { from: cursor, to: cursor, insert: `![](${relativePath})` }
          })
        }
        reader.readAsDataURL(blob)
        return true
      }
      return false
    },
    drop(event, view) {
      const files = event.dataTransfer?.files
      if (!files || files.length === 0) return false

      for (const file of Array.from(files)) {
        const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
        const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)
        if (!isImage) continue

        event.preventDefault()

        const reader = new FileReader()
        reader.onload = async () => {
          const dataUrl = reader.result as string
          const base64 = dataUrl.split(',')[1]
          if (!base64) return

          const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
          const insertPos = pos !== null ? pos : view.state.selection.main.head
          
          const relativePath = await onImagePaste(base64, ext)
          if (!relativePath) return

          view.dispatch({
            changes: { from: insertPos, to: insertPos, insert: `![${file.name}](${relativePath})` },
            selection: { anchor: insertPos + `![${file.name}](${relativePath})`.length }
          })
        }
        reader.readAsDataURL(file)
        return true
      }
      return false
    }
  })
}
