import { TFunction } from 'i18next'
import { SettingDefinition } from '../settingsTypes'
import { Toggle } from '../controls/Toggle'
import { Dropdown } from '../controls/Dropdown'
import { TextInput } from '../controls/TextInput'

export function buildFilesSettings(t: TFunction): SettingDefinition[] {
  return [
    {
      id: 'autoSaveTrigger',
      label: t('settings.files.autoSaveTrigger'),
      description: t('settings.files.autoSaveTriggerDesc'),
      category: 'files',
      render: (s) => (
        <Dropdown
          label={t('settings.files.autoSaveTrigger')}
          description={t('settings.files.autoSaveTriggerDesc')}
          value={s.autoSaveTrigger}
          options={[
            { value: 'off', label: t('settings.files.autoSaveTrigger.off') },
            { value: 'afterDelay', label: t('settings.files.autoSaveTrigger.afterDelay') },
            { value: 'onFocusChange', label: t('settings.files.autoSaveTrigger.onFocusChange') },
            { value: 'onWindowBlur', label: t('settings.files.autoSaveTrigger.onWindowBlur') }
          ]}
          onChange={(v) => s.updateSetting('autoSaveTrigger', v as any)}
        />
      )
    },
    {
      id: 'autoSaveDelay',
      label: t('settings.files.autoSaveDelay'),
      description: t('settings.files.autoSaveDelayDesc'),
      category: 'files',
      render: (s) => (
        <Dropdown
          label={t('settings.files.autoSaveDelay')}
          description={t('settings.files.autoSaveDelayDesc')}
          value={s.autoSaveDelay}
          options={[
            { value: 1, label: t('settings.files.autoSaveDelay.1second') },
            { value: 5, label: t('settings.files.autoSaveDelay.5seconds') },
            { value: 10, label: t('settings.files.autoSaveDelay.10seconds') },
            { value: 30, label: t('settings.files.autoSaveDelay.30seconds') }
          ]}
          onChange={(v) => s.updateSetting('autoSaveDelay', v)}
        />
      )
    },
    {
      id: 'closeBehavior',
      label: t('settings.files.closeBehavior'),
      description: t('settings.files.closeBehaviorDesc'),
      category: 'files',
      render: (s) => (
        <Dropdown
          label={t('settings.files.closeBehavior')}
          description={t('settings.files.closeBehaviorDesc')}
          value={s.closeBehavior}
          options={[
            { value: 'ask', label: t('settings.files.closeBehavior.ask') },
            { value: 'save', label: t('settings.files.closeBehavior.save') },
            { value: 'discard', label: t('settings.files.closeBehavior.discard') }
          ]}
          onChange={(v) => s.updateSetting('closeBehavior', v as any)}
        />
      )
    },
    {
      id: 'linkFormat',
      label: t('settings.files.linkFormat'),
      description: t('settings.files.linkFormatDesc'),
      category: 'files',
      render: (s) => (
        <Dropdown
          label={t('settings.files.linkFormat')}
          description={t('settings.files.linkFormatDesc')}
          value={s.linkFormat}
          options={[
            { value: 'wiki', label: t('settings.files.linkFormat.wiki') },
            { value: 'markdown', label: t('settings.files.linkFormat.markdown') }
          ]}
          onChange={(v) => s.updateSetting('linkFormat', v)}
        />
      )
    },
    {
      id: 'newNotesFolder',
      label: t('settings.files.newNotesFolder'),
      description: t('settings.files.newNotesFolderDesc'),
      category: 'files',
      render: (s) => (
        <TextInput
          label={t('settings.files.newNotesFolder')}
          description={t('settings.files.newNotesFolderDesc')}
          value={s.newNotesFolder}
          placeholder={t('settings.files.newNotesFolderPlaceholder')}
          onChange={(v) => s.updateSetting('newNotesFolder', v)}
        />
      )
    },
    {
      id: 'attachmentFolder',
      label: t('settings.files.attachmentFolder'),
      description: t('settings.files.attachmentFolderDesc'),
      category: 'files',
      render: (s) => (
        <TextInput
          label={t('settings.files.attachmentFolder')}
          description={t('settings.files.attachmentFolderDesc')}
          value={s.attachmentFolder}
          placeholder="assets"
          onChange={(v) => s.updateSetting('attachmentFolder', v)}
        />
      )
    },
    {
      id: 'dailyNoteDateFormat',
      label: t('settings.files.dailyNoteDateFormat'),
      description: t('settings.files.dailyNoteDateFormatDesc'),
      category: 'files',
      render: (s) => (
        <Dropdown
          label={t('settings.files.dailyNoteDateFormat')}
          description={t('settings.files.dailyNoteDateFormatDesc')}
          value={s.dailyNoteDateFormat}
          options={[
            { value: 'YYYY-MM-DD', label: t('settings.files.dailyNoteDateFormat.YYYY-MM-DD') },
            { value: 'DD-MM-YYYY', label: t('settings.files.dailyNoteDateFormat.DD-MM-YYYY') },
            { value: 'MM-DD-YYYY', label: t('settings.files.dailyNoteDateFormat.MM-DD-YYYY') },
            { value: 'DD.MM.YYYY', label: t('settings.files.dailyNoteDateFormat.DD.MM.YYYY') }
          ]}
          onChange={(v) => s.updateSetting('dailyNoteDateFormat', v as any)}
        />
      )
    },
    {
      id: 'confirmDelete',
      label: t('settings.files.confirmDelete'),
      description: t('settings.files.confirmDeleteDesc'),
      category: 'files',
      render: (s) => (
        <Toggle
          label={t('settings.files.confirmDelete')}
          description={t('settings.files.confirmDeleteDesc')}
          checked={s.confirmDelete}
          onChange={(v) => s.updateSetting('confirmDelete', v)}
        />
      )
    },
    {
      id: 'showHiddenFiles',
      label: t('settings.files.showHiddenFiles'),
      description: t('settings.files.showHiddenFilesDesc'),
      category: 'files',
      render: (s) => (
        <Toggle
          label={t('settings.files.showHiddenFiles')}
          description={t('settings.files.showHiddenFilesDesc')}
          checked={s.showHiddenFiles}
          onChange={(v) => s.updateSetting('showHiddenFiles', v)}
        />
      )
    },
    {
      id: 'excludedFolders',
      label: t('settings.files.excludedFolders'),
      description: t('settings.files.excludedFoldersDesc'),
      category: 'files',
      render: (s) => (
        <TextInput
          label={t('settings.files.excludedFolders')}
          description={t('settings.files.excludedFoldersDesc')}
          value={s.excludedFolders}
          placeholder="node_modules, .git, .obsidian"
          onChange={(v) => s.updateSetting('excludedFolders', v)}
        />
      )
    },
    {
      id: 'fileSortBy',
      label: t('settings.files.fileSortBy'),
      description: t('settings.files.fileSortByDesc'),
      category: 'files',
      render: (s) => (
        <Dropdown
          label={t('settings.files.fileSortBy')}
          description={t('settings.files.fileSortByDesc')}
          value={s.fileSortBy}
          options={[
            { value: 'name', label: t('settings.files.fileSortBy.name') },
            { value: 'created', label: t('settings.files.fileSortBy.created') },
            { value: 'modified', label: t('settings.files.fileSortBy.modified') }
          ]}
          onChange={(v) => s.updateSetting('fileSortBy', v as any)}
        />
      )
    }
  ]
}
