import { TFunction } from 'i18next'
import { SettingDefinition } from '../settingsTypes'
import { TextInput } from '../controls/TextInput'

export function buildSyncSettings(t: TFunction): SettingDefinition[] {
  return [
    {
      id: 'gitCommitTemplate',
      label: t('settings.sync.gitCommitTemplate'),
      description: t('settings.sync.gitCommitTemplateDesc'),
      category: 'sync',
      render: (s) => (
        <TextInput
          label={t('settings.sync.gitCommitTemplate')}
          description={t('settings.sync.gitCommitTemplateDesc')}
          value={s.gitCommitTemplate}
          placeholder="Updated {files}"
          onChange={(v) => s.updateSetting('gitCommitTemplate', v)}
        />
      )
    },
    {
      id: 'gitDefaultBranch',
      label: t('settings.sync.gitDefaultBranch'),
      description: t('settings.sync.gitDefaultBranchDesc'),
      category: 'sync',
      render: (s) => (
        <TextInput
          label={t('settings.sync.gitDefaultBranch')}
          description={t('settings.sync.gitDefaultBranchDesc')}
          value={s.gitDefaultBranch}
          placeholder="main"
          onChange={(v) => s.updateSetting('gitDefaultBranch', v)}
        />
      )
    }
  ]
}
