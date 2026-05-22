import { TFunction } from 'i18next'
import { SettingDefinition } from '../settingsTypes'
import { Toggle } from '../controls/Toggle'
import { Dropdown } from '../controls/Dropdown'
import { TextAreaInput } from '../controls/TextAreaInput'

export function buildExportSettings(t: TFunction): SettingDefinition[] {
  return [
    {
      id: 'defaultExportFormat',
      label: t('settings.export.defaultExportFormat'),
      description: t('settings.export.defaultExportFormatDesc'),
      category: 'export',
      render: (s) => (
        <Dropdown
          label={t('settings.export.defaultExportFormat')}
          description={t('settings.export.defaultExportFormatDesc')}
          value={s.defaultExportFormat}
          options={[
            { value: 'html', label: 'HTML' },
            { value: 'pdf', label: 'PDF' }
          ]}
          onChange={(v) => s.updateSetting('defaultExportFormat', v as any)}
        />
      )
    },
    {
      id: 'pdfPageSize',
      label: t('settings.export.pdfPageSize'),
      description: t('settings.export.pdfPageSizeDesc'),
      category: 'export',
      render: (s) => (
        <Dropdown
          label={t('settings.export.pdfPageSize')}
          description={t('settings.export.pdfPageSizeDesc')}
          value={s.pdfPageSize}
          options={[
            { value: 'A4', label: t('settings.export.pdfPageSize.A4') },
            { value: 'Letter', label: t('settings.export.pdfPageSize.Letter') }
          ]}
          onChange={(v) => s.updateSetting('pdfPageSize', v as any)}
        />
      )
    },
    {
      id: 'exportIncludeFrontmatter',
      label: t('settings.export.exportIncludeFrontmatter'),
      description: t('settings.export.exportIncludeFrontmatterDesc'),
      category: 'export',
      render: (s) => (
        <Toggle
          label={t('settings.export.exportIncludeFrontmatter')}
          description={t('settings.export.exportIncludeFrontmatterDesc')}
          checked={s.exportIncludeFrontmatter}
          onChange={(v) => s.updateSetting('exportIncludeFrontmatter', v)}
        />
      )
    },
    {
      id: 'exportCustomCSS',
      label: t('settings.export.exportCustomCSS'),
      description: t('settings.export.exportCustomCSSDesc'),
      category: 'export',
      render: (s) => (
        <TextAreaInput
          label={t('settings.export.exportCustomCSS')}
          description={t('settings.export.exportCustomCSSDesc')}
          value={s.exportCustomCSS}
          placeholder="body { font-family: Georgia; }"
          onChange={(v) => s.updateSetting('exportCustomCSS', v)}
        />
      )
    }
  ]
}
