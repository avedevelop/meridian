const INDEX_FILE = 'Vault Index.md'

function flattenFiles(files) {
  return files.flatMap((file) => (file.isDirectory ? flattenFiles(file.children || []) : [file]))
}

function formatDate(timestamp) {
  return new Date(timestamp).toISOString().slice(0, 10)
}

function wikiTarget(file) {
  return file.relativePath.replace(/\\/g, '/').replace(/\.md$/i, '')
}

export default class VaultIndexPlugin {
  onLoad(api) {
    this.api = api

    api.registerCommand({
      id: 'vault-index-rebuild',
      title: 'Vault Index: Rebuild Note Index',
      run: async (api) => {
        const files = flattenFiles(await api.vault.listFiles())
          .filter((file) => file.relativePath.endsWith('.md'))
          .filter((file) => file.relativePath !== INDEX_FILE)
          .sort((a, b) => a.relativePath.localeCompare(b.relativePath))

        const lines = [
          '# Vault Index',
          '',
          `Generated: ${new Date().toLocaleString()}`,
          '',
          `Total notes: ${files.length}`,
          '',
          '## Notes',
          '',
          ...files.map((file) => `- [[${wikiTarget(file)}]] - updated ${formatDate(file.mtime)}`),
          ''
        ]

        await api.vault.writeFile(INDEX_FILE, lines.join('\n'))
        api.ui.toast(`Indexed ${files.length} notes in ${INDEX_FILE}`)
      }
    })
  }

  onUnload() {
    this.api = null
  }
}
