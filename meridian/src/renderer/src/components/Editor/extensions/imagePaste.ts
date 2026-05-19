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
            changes: { from: cursor, to: cursor, insert: `![](${relativePath})` },
          })
        }
        reader.readAsDataURL(blob)
        return true
      }
      return false
    },
  })
}
