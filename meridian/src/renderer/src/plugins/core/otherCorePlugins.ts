import type { MeridianPlugin } from '../types'

export const slashCommandsPlugin: MeridianPlugin = {
  id: 'slashCommands',
  name: 'Slash Commands',
  version: '1.0.0',
  description: 'Trigger formatting actions and note insertions using / key triggers.',
  author: 'ave'
}

export const tagsPanelPlugin: MeridianPlugin = {
  id: 'tagsPanel',
  name: 'Tag Index Panel',
  version: '1.0.0',
  description: 'Show an index of all hashtag elements parsed in note contents.',
  author: 'ave'
}

export const backlinksPanelPlugin: MeridianPlugin = {
  id: 'backlinksPanel',
  name: 'Backlinks Explorer',
  version: '1.0.0',
  description: 'List notes referencing the current active tab note.',
  author: 'ave'
}

export const tocPanelPlugin: MeridianPlugin = {
  id: 'tocPanel',
  name: 'Table of Contents',
  version: '1.0.0',
  description: 'Generate dynamic layout heading navigators for markdown documents.',
  author: 'ave'
}

export const gitBackupPlugin: MeridianPlugin = {
  id: 'gitBackup',
  name: 'Git Autocommit Backups',
  version: '1.0.0',
  description: 'Periodically git commit changes inside the vault automatically.',
  author: 'ave'
}

export const excalidrawPlugin: MeridianPlugin = {
  id: 'excalidraw',
  name: 'Excalidraw Sketchpad',
  version: '1.0.0',
  description: 'Integrate dynamic hand-drawn diagrams inside notes.',
  author: 'ave'
}

export const vimModePlugin: MeridianPlugin = {
  id: 'vimMode',
  name: 'Vim Mode',
  version: '1.0.0',
  description: 'Enable Vim keybindings in the markdown editor (Normal, Insert, Visual modes).',
  author: 'ave'
}
