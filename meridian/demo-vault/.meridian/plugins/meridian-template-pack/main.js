const TEMPLATE_DIR = '_templates'

const TEMPLATES = [
  {
    name: 'daily.md',
    content: [
      '# {{date}}',
      '',
      '## Focus',
      '',
      '- ',
      '',
      '## Notes',
      '',
      '- ',
      '',
      '## Done',
      '',
      '- [ ] ',
      ''
    ].join('\n')
  },
  {
    name: 'meeting.md',
    content: [
      '# {{title}}',
      '',
      'Date: {{date}}',
      '',
      '## Attendees',
      '',
      '- ',
      '',
      '## Agenda',
      '',
      '- ',
      '',
      '## Decisions',
      '',
      '- ',
      '',
      '## Action Items',
      '',
      '- [ ] ',
      ''
    ].join('\n')
  },
  {
    name: 'project.md',
    content: [
      '# {{title}}',
      '',
      '## Outcome',
      '',
      '- ',
      '',
      '## Milestones',
      '',
      '- [ ] ',
      '',
      '## Notes',
      '',
      '- ',
      ''
    ].join('\n')
  }
]

async function exists(api, path) {
  try {
    await api.vault.readFile(path)
    return true
  } catch {
    return false
  }
}

export default class TemplatePackPlugin {
  onLoad(api) {
    this.api = api

    api.registerCommand({
      id: 'template-pack-install-starters',
      title: 'Templates: Install Starter Pack',
      run: async (api) => {
        await api.vault.createDir('', TEMPLATE_DIR)

        let installed = 0
        let skipped = 0
        for (const template of TEMPLATES) {
          const path = `${TEMPLATE_DIR}/${template.name}`
          if (await exists(api, path)) {
            skipped += 1
            continue
          }

          await api.vault.writeFile(path, template.content)
          installed += 1
        }

        api.ui.toast(`Template pack installed ${installed}; skipped ${skipped}`)
      }
    })
  }

  onUnload() {
    this.api = null
  }
}
