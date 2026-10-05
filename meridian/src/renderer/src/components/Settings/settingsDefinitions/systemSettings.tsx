import { TFunction } from 'i18next'
import { SettingDefinition } from '../settingsTypes'
import { Toggle } from '../controls/Toggle'

/** Running in the background. The main process reads these from preferences.json and applies them. */
export function buildSystemSettings(t: TFunction): SettingDefinition[] {
  return [
    {
      id: 'runInBackground',
      label: t('settings.system.runInBackground'),
      description: t('settings.system.runInBackgroundDesc'),
      category: 'system',
      render: (s) => (
        <Toggle
          label={t('settings.system.runInBackground')}
          description={t('settings.system.runInBackgroundDesc')}
          checked={s.runInBackground}
          onChange={(v) => s.updateSetting('runInBackground', v)}
        />
      )
    },
    {
      id: 'launchAtLogin',
      label: t('settings.system.launchAtLogin'),
      description: t('settings.system.launchAtLoginDesc'),
      category: 'system',
      render: (s) => (
        <Toggle
          label={t('settings.system.launchAtLogin')}
          description={t('settings.system.launchAtLoginDesc')}
          checked={s.launchAtLogin}
          onChange={(v) => s.updateSetting('launchAtLogin', v)}
        />
      )
    },
    {
      id: 'startMinimized',
      label: t('settings.system.startMinimized'),
      description: t('settings.system.startMinimizedDesc'),
      category: 'system',
      render: (s) => (
        <Toggle
          label={t('settings.system.startMinimized')}
          description={t('settings.system.startMinimizedDesc')}
          checked={s.startMinimized}
          onChange={(v) => s.updateSetting('startMinimized', v)}
        />
      )
    }
  ]
}
