const INBOX_FILE = 'Inbox.md'

function pad(value) {
  return String(value).padStart(2, '0')
}

function formatTimestamp(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`
}

async function readOrCreate(api, path, initialContent) {
  try {
    return await api.vault.readFile(path)
  } catch {
    await api.vault.writeFile(path, initialContent)
    return initialContent
  }
}

export default class QuickCapturePlugin {
  onLoad(api) {
    this.api = api

    api.registerCommand({
      id: 'quick-capture-add-inbox',
      title: 'Quick Capture: Add to Inbox',
      run: async (api) => {
        const text = window.prompt('Capture to Inbox.md')
        const trimmed = text?.trim()
        if (!trimmed) return

        const current = await readOrCreate(api, INBOX_FILE, '# Inbox\n\n')
        const separator = current.endsWith('\n') ? '' : '\n'
        const entry = `- ${formatTimestamp(new Date())} - ${trimmed}\n`

        await api.vault.writeFile(INBOX_FILE, `${current}${separator}${entry}`)
        api.ui.toast('Captured to Inbox.md')
      }
    })
  }

  onUnload() {
    this.api = null
  }
}
