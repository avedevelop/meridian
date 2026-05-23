import type { PluginAPI } from '../types'
import { pluginRegistry } from '../registry'
import { dailyNotesPlugin } from './dailyNotes'
import { wordCounterPlugin } from './wordCounter'
import {
  slashCommandsPlugin,
  tagsPanelPlugin,
  backlinksPanelPlugin,
  tocPanelPlugin,
  gitBackupPlugin,
  excalidrawPlugin,
  vimModePlugin
} from './otherCorePlugins'

export function initCorePlugins(api: PluginAPI): void {
  pluginRegistry.setAPI(api)

  pluginRegistry.registerCorePlugin(dailyNotesPlugin)
  pluginRegistry.registerCorePlugin(wordCounterPlugin)
  pluginRegistry.registerCorePlugin(slashCommandsPlugin)
  pluginRegistry.registerCorePlugin(tagsPanelPlugin)
  pluginRegistry.registerCorePlugin(backlinksPanelPlugin)
  pluginRegistry.registerCorePlugin(tocPanelPlugin)
  pluginRegistry.registerCorePlugin(gitBackupPlugin)
  pluginRegistry.registerCorePlugin(excalidrawPlugin)
  pluginRegistry.registerCorePlugin(vimModePlugin)
}
