import { SettingsState } from '../../store/useSettingsStore'

export type SettingCategory =
  | 'editor'
  | 'files'
  | 'appearance'
  | 'canvas'
  | 'hotkeys'
  | 'plugins'
  | 'sync'
  | 'export'
  | 'about'

export interface SettingDefinition {
  id: string
  label: string
  description: string
  category: SettingCategory
  render: (store: SettingsState) => React.ReactNode
}

export interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}
