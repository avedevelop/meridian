import { TFunction } from 'i18next'
import { SettingDefinition } from '../settingsTypes'
import { Toggle } from '../controls/Toggle'
import { Slider } from '../controls/Slider'
import { Dropdown } from '../controls/Dropdown'

export function buildEditorSettings(t: TFunction): SettingDefinition[] {
  return [
    {
      id: 'fontSize',
      label: t('settings.editor.fontSize'),
      description: t('settings.editor.fontSizeDesc'),
      category: 'editor',
      render: (s) => (
        <Slider
          label={t('settings.editor.fontSize')}
          description={t('settings.editor.fontSizeDesc')}
          value={s.fontSize}
          min={13}
          max={22}
          unit="px"
          onChange={s.setFontSize}
        />
      )
    },
    {
      id: 'lineWidth',
      label: t('settings.editor.lineWidth'),
      description: t('settings.editor.lineWidthDesc'),
      category: 'editor',
      render: (s) => (
        <Slider
          label={t('settings.editor.lineWidth')}
          description={t('settings.editor.lineWidthDesc')}
          value={s.lineWidth}
          min={600}
          max={960}
          unit="px"
          onChange={s.setLineWidth}
        />
      )
    },
    {
      id: 'readableLineLength',
      label: t('settings.editor.readableLineLength'),
      description: t('settings.editor.readableLineLengthDesc'),
      category: 'editor',
      render: (s) => (
        <Toggle
          label={t('settings.editor.readableLineLength')}
          description={t('settings.editor.readableLineLengthDesc')}
          checked={s.readableLineLength}
          onChange={(v) => s.updateSetting('readableLineLength', v)}
        />
      )
    },
    {
      id: 'fontFamily',
      label: t('settings.editor.fontFamily'),
      description: t('settings.editor.fontFamilyDesc'),
      category: 'editor',
      render: (s) => (
        <Dropdown
          label={t('settings.editor.fontFamily')}
          description={t('settings.editor.fontFamilyDesc')}
          value={s.fontFamily}
          options={[
            { value: 'Georgia', label: t('settings.editor.fontFamily.georgia') },
            { value: 'Inter', label: t('settings.editor.fontFamily.inter') },
            { value: 'Fira Code', label: t('settings.editor.fontFamily.firaCode') },
            { value: 'JetBrains Mono', label: t('settings.editor.fontFamily.jetbrainsMono') },
            { value: 'system-ui', label: t('settings.editor.fontFamily.system') }
          ]}
          onChange={(v) => s.updateSetting('fontFamily', v)}
        />
      )
    },
    {
      id: 'fontWeight',
      label: t('settings.editor.fontWeight'),
      description: t('settings.editor.fontWeightDesc'),
      category: 'editor',
      render: (s) => (
        <Dropdown
          label={t('settings.editor.fontWeight')}
          description={t('settings.editor.fontWeightDesc')}
          value={s.fontWeight}
          options={[
            { value: '300', label: t('settings.editor.fontWeight.light') },
            { value: '400', label: t('settings.editor.fontWeight.regular') },
            { value: '500', label: t('settings.editor.fontWeight.medium') },
            { value: '700', label: t('settings.editor.fontWeight.bold') }
          ]}
          onChange={(v) => s.updateSetting('fontWeight', v)}
        />
      )
    },
    {
      id: 'lineHeight',
      label: t('settings.editor.lineHeight'),
      description: t('settings.editor.lineHeightDesc'),
      category: 'editor',
      render: (s) => (
        <Slider
          label={t('settings.editor.lineHeight')}
          description={t('settings.editor.lineHeightDesc')}
          value={s.lineHeight}
          min={1.2}
          max={2.4}
          unit=""
          onChange={(v) => s.updateSetting('lineHeight', v)}
        />
      )
    },
    {
      id: 'lineWrapping',
      label: t('settings.editor.lineWrapping'),
      description: t('settings.editor.lineWrappingDesc'),
      category: 'editor',
      render: (s) => (
        <Toggle
          label={t('settings.editor.lineWrapping')}
          description={t('settings.editor.lineWrappingDesc')}
          checked={s.lineWrapping}
          onChange={(v) => s.updateSetting('lineWrapping', v)}
        />
      )
    },
    {
      id: 'lineNumbers',
      label: t('settings.editor.lineNumbers'),
      description: t('settings.editor.lineNumbersDesc'),
      category: 'editor',
      render: (s) => (
        <Toggle
          label={t('settings.editor.lineNumbers')}
          description={t('settings.editor.lineNumbersDesc')}
          checked={s.lineNumbers}
          onChange={(v) => s.updateSetting('lineNumbers', v)}
        />
      )
    },
    {
      id: 'tabSize',
      label: t('settings.editor.tabSize'),
      description: t('settings.editor.tabSizeDesc'),
      category: 'editor',
      render: (s) => (
        <Dropdown
          label={t('settings.editor.tabSize')}
          description={t('settings.editor.tabSizeDesc')}
          value={s.tabSize}
          options={[
            { value: 2, label: t('settings.editor.tabSize.2spaces') },
            { value: 4, label: t('settings.editor.tabSize.4spaces') },
            { value: 8, label: t('settings.editor.tabSize.8spaces') }
          ]}
          onChange={(v) => s.updateSetting('tabSize', v)}
        />
      )
    },
    {
      id: 'bracketMatching',
      label: t('settings.editor.bracketMatching'),
      description: t('settings.editor.bracketMatchingDesc'),
      category: 'editor',
      render: (s) => (
        <Toggle
          label={t('settings.editor.bracketMatching')}
          description={t('settings.editor.bracketMatchingDesc')}
          checked={s.bracketMatching}
          onChange={(v) => s.updateSetting('bracketMatching', v)}
        />
      )
    },
    {
      id: 'closeBrackets',
      label: t('settings.editor.closeBrackets'),
      description: t('settings.editor.closeBracketsDesc'),
      category: 'editor',
      render: (s) => (
        <Toggle
          label={t('settings.editor.closeBrackets')}
          description={t('settings.editor.closeBracketsDesc')}
          checked={s.closeBrackets}
          onChange={(v) => s.updateSetting('closeBrackets', v)}
        />
      )
    },
    {
      id: 'typingMode',
      label: t('settings.editor.typingMode'),
      description: t('settings.editor.typingModeDesc'),
      category: 'editor',
      render: (s) => (
        <Dropdown
          label={t('settings.editor.typingMode')}
          description={t('settings.editor.typingModeDesc')}
          value={s.typingMode}
          options={[
            { value: 'normal', label: t('settings.editor.typingMode.normal') },
            { value: 'typewriter', label: t('settings.editor.typingMode.typewriter') },
            { value: 'focus', label: t('settings.editor.typingMode.focus') }
          ]}
          onChange={(v) => s.updateSetting('typingMode', v as any)}
        />
      )
    },
    {
      id: 'showInvisibles',
      label: t('settings.editor.showInvisibles'),
      description: t('settings.editor.showInvisiblesDesc'),
      category: 'editor',
      render: (s) => (
        <Toggle
          label={t('settings.editor.showInvisibles')}
          description={t('settings.editor.showInvisiblesDesc')}
          checked={s.showInvisibles}
          onChange={(v) => s.updateSetting('showInvisibles', v)}
        />
      )
    },
    {
      id: 'defaultView',
      label: t('settings.editor.defaultView'),
      description: t('settings.editor.defaultViewDesc'),
      category: 'editor',
      render: (s) => (
        <Dropdown
          label={t('settings.editor.defaultView')}
          description={t('settings.editor.defaultViewDesc')}
          value={s.defaultView}
          options={[
            { value: 'editor', label: t('settings.editor.defaultView.editor') },
            { value: 'split', label: t('settings.editor.defaultView.split') },
            { value: 'preview', label: t('settings.editor.defaultView.preview') }
          ]}
          onChange={(v) => s.updateSetting('defaultView', v as any)}
        />
      )
    },
    {
      id: 'codeBlockTheme',
      label: t('settings.editor.codeBlockTheme'),
      description: t('settings.editor.codeBlockThemeDesc'),
      category: 'editor',
      render: (s) => (
        <Dropdown
          label={t('settings.editor.codeBlockTheme')}
          description={t('settings.editor.codeBlockThemeDesc')}
          value={s.codeBlockTheme}
          options={[
            { value: 'github-dark', label: 'GitHub Dark' },
            { value: 'monokai', label: 'Monokai' },
            { value: 'one-dark', label: 'One Dark' },
            { value: 'solarized', label: 'Solarized Dark' }
          ]}
          onChange={(v) => s.updateSetting('codeBlockTheme', v as any)}
        />
      )
    },
    {
      id: 'paragraphSpacing',
      label: t('settings.editor.paragraphSpacing'),
      description: t('settings.editor.paragraphSpacingDesc'),
      category: 'editor',
      render: (s) => (
        <Slider
          label={t('settings.editor.paragraphSpacing')}
          description={t('settings.editor.paragraphSpacingDesc')}
          value={s.paragraphSpacing}
          min={0}
          max={2}
          unit="em"
          onChange={(v) => s.updateSetting('paragraphSpacing', v)}
        />
      )
    },
    {
      id: 'spellCheck',
      label: t('settings.editor.spellCheck'),
      description: t('settings.editor.spellCheckDesc'),
      category: 'editor',
      render: (s) => (
        <Toggle
          label={t('settings.editor.spellCheck')}
          description={t('settings.editor.spellCheckDesc')}
          checked={s.spellCheck}
          onChange={(v) => s.updateSetting('spellCheck', v)}
        />
      )
    },
    {
      id: 'spellCheckLanguage',
      label: t('settings.editor.spellCheckLanguage'),
      description: t('settings.editor.spellCheckLanguageDesc'),
      category: 'editor',
      render: (s) => (
        <Dropdown
          label={t('settings.editor.spellCheckLanguage')}
          description={t('settings.editor.spellCheckLanguageDesc')}
          value={s.spellCheckLanguage}
          options={[
            { value: 'en-US', label: t('settings.editor.spellCheckLanguage.en-US') },
            { value: 'ru-RU', label: t('settings.editor.spellCheckLanguage.ru-RU') },
            { value: 'de-DE', label: t('settings.editor.spellCheckLanguage.de-DE') },
            { value: 'fr-FR', label: t('settings.editor.spellCheckLanguage.fr-FR') }
          ]}
          onChange={(v) => s.updateSetting('spellCheckLanguage', v as any)}
        />
      )
    },
    {
      id: 'indentWithTabs',
      label: t('settings.editor.indentWithTabs'),
      description: t('settings.editor.indentWithTabsDesc'),
      category: 'editor',
      render: (s) => (
        <Toggle
          label={t('settings.editor.indentWithTabs')}
          description={t('settings.editor.indentWithTabsDesc')}
          checked={s.indentWithTabs}
          onChange={(v) => s.updateSetting('indentWithTabs', v)}
        />
      )
    }
  ]
}
