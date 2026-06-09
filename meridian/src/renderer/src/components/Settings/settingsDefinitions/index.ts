import { TFunction } from 'i18next'
import { SettingDefinition } from '../settingsTypes'
import { buildEditorSettings } from './editorSettings'
import { buildFilesSettings } from './filesSettings'
import { buildAppearanceSettings } from './appearanceSettings'
import { buildCanvasSettings } from './canvasSettings'
import { buildExportSettings } from './exportSettings'
import { buildSyncSettings } from './syncSettings'
import { buildAiSettings } from './aiSettings'

export function buildSettingsDefinitions(t: TFunction): SettingDefinition[] {
  return [
    ...buildEditorSettings(t),
    ...buildFilesSettings(t),
    ...buildAppearanceSettings(t),
    ...buildCanvasSettings(t),
    ...buildAiSettings(t),
    ...buildExportSettings(t),
    ...buildSyncSettings(t)
  ]
}
