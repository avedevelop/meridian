import type { MeridianPlugin } from '../types'

export const dailyNotesPlugin: MeridianPlugin = {
  id: 'dailyNotes',
  name: 'Daily Notes',
  version: '1.0.0',
  description: 'Create and open a daily note based on current date automatically.',
  author: 'ave',
  commands: [
    {
      id: 'daily-note',
      title: "Open Today's Daily Note",
      run: async (api) => {
        await api.app.openDailyNote()
      }
    }
  ]
}

export default dailyNotesPlugin
