const REPORT_DIR = 'Reports'
const REPORT_FILE = 'Reports/Broken Links.md'
const WIKI_LINK_RE = /!?\[\[([^\]]+)\]\]/g

function flattenFiles(files) {
  return files.flatMap((file) => (file.isDirectory ? flattenFiles(file.children || []) : [file]))
}

function normalizeTarget(value) {
  return value.replace(/\\/g, '/').replace(/\.md$/i, '').trim().toLowerCase()
}

function displayTarget(value) {
  return value.replace(/\\/g, '/').replace(/\.md$/i, '').trim()
}

function noteAliases(file) {
  const target = displayTarget(file.relativePath)
  const basename = target.split('/').pop()
  return [normalizeTarget(target), normalizeTarget(basename || target)]
}

function extractLinks(content) {
  const links = []
  WIKI_LINK_RE.lastIndex = 0
  let match = WIKI_LINK_RE.exec(content)
  while (match) {
    const raw = match[1].split('|')[0].split('#')[0]
    const target = displayTarget(raw)
    if (target) links.push(target)
    match = WIKI_LINK_RE.exec(content)
  }
  return links
}

export default class LinkAuditorPlugin {
  onLoad(api) {
    this.api = api

    api.registerCommand({
      id: 'link-auditor-build-report',
      title: 'Links: Build Broken Link Report',
      run: async (api) => {
        const notes = flattenFiles(await api.vault.listFiles())
          .filter((file) => file.relativePath.endsWith('.md'))
          .filter((file) => file.relativePath !== REPORT_FILE)
        const knownNotes = new Set(notes.flatMap(noteAliases))
        const broken = []

        for (const note of notes) {
          const content = await api.vault.readFile(note.path)
          const missingLinks = extractLinks(content).filter(
            (target) => !knownNotes.has(normalizeTarget(target))
          )

          for (const target of missingLinks) {
            broken.push({ source: note.relativePath, target })
          }
        }

        await api.vault.createDir('', REPORT_DIR)

        const report = [
          '# Broken Links',
          '',
          `Generated: ${new Date().toLocaleString()}`,
          '',
          broken.length === 0
            ? 'No broken wiki-links found.'
            : `Found ${broken.length} broken wiki-link${broken.length === 1 ? '' : 's'}.`,
          '',
          ...broken.map((item) => `- [[${displayTarget(item.source)}]] -> [[${item.target}]]`),
          ''
        ].join('\n')

        await api.vault.writeFile(REPORT_FILE, report)
        api.ui.toast(`Broken link report written to ${REPORT_FILE}`)
      }
    })
  }

  onUnload() {
    this.api = null
  }
}
