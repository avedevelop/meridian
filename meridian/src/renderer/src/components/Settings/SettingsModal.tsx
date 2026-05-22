import { useEffect, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSettingsStore } from '../../store/useSettingsStore'
import { useVaultStore } from '../../store/useVaultStore'
import { Toggle } from './controls/Toggle'
import { Slider } from './controls/Slider'
import { Dropdown } from './controls/Dropdown'
import { TextInput } from './controls/TextInput'
import { TextAreaInput } from './controls/TextAreaInput'
import { ColorPicker } from './controls/ColorPicker'
import { SettingCategory, SettingDefinition, SettingsModalProps } from './settingsTypes'
import { getCategoryIcon } from './settingsCategoryIcons'
import { SettingsGitHubSection } from './SettingsGitHubSection'

// ----------------------------------------------------
// UI COMPONENTS (EXTRACTED)
// ----------------------------------------------------
// SETTINGS ITEMS SCHEMA (For Searchability)
// ----------------------------------------------------


// ----------------------------------------------------
// MAIN SETTINGS MODAL
// ----------------------------------------------------

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { t } = useTranslation()
  const store = useSettingsStore()
  const vault = useVaultStore((s) => s.vault)
  const [activeCategory, setActiveCategory] = useState<SettingCategory>('editor')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (!isOpen) return

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  useEffect(() => {
    if (isOpen) {
      setActiveCategory('editor')
      setSearchQuery('')
    }
  }, [isOpen])

  // Definitions for all settings for search and tab rendering
  const settingsDefinitions = useMemo<SettingDefinition[]>(
    () => [
      // EDITOR
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
      },

      // AUTO-SAVE & FILES
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
      },

      // APPEARANCE
      {
        id: 'accentColor',
        label: t('settings.appearance.accentColor'),
        description: t('settings.appearance.accentColorDesc'),
        category: 'appearance',
        render: (s) => (
          <ColorPicker
            label={t('settings.appearance.accentColor')}
            description={t('settings.appearance.accentColorDesc')}
            value={s.accentColor}
            options={[
              { color: 'purple', name: t('settings.appearance.accentColor.purple') },
              { color: 'blue', name: t('settings.appearance.accentColor.blue') },
              { color: 'green', name: t('settings.appearance.accentColor.green') },
              { color: 'orange', name: t('settings.appearance.accentColor.orange') },
              { color: 'red', name: t('settings.appearance.accentColor.red') }
            ]}
            onChange={(v) => s.updateSetting('accentColor', v as any)}
          />
        )
      },
      {
        id: 'theme',
        label: t('settings.appearance.theme'),
        description: t('settings.appearance.themeDesc'),
        category: 'appearance',
        render: (s) => (
          <Dropdown
            label={t('settings.appearance.theme')}
            description={t('settings.appearance.themeDesc')}
            value={s.theme}
            options={[
              { value: 'dark', label: t('settings.appearance.theme.dark') },
              { value: 'midnight', label: t('settings.appearance.theme.midnight') },
              { value: 'indigo', label: t('settings.appearance.theme.indigo') },
              { value: 'cyberpunk', label: t('settings.appearance.theme.cyberpunk') },
              { value: 'forest', label: t('settings.appearance.theme.forest') },
              { value: 'nord', label: t('settings.appearance.theme.nord') },
              { value: 'dracula', label: t('settings.appearance.theme.dracula') },
              { value: 'obsidian', label: t('settings.appearance.theme.obsidian') }
            ]}
            onChange={(v) => s.updateSetting('theme', v as any)}
          />
        )
      },
      {
        id: 'language',
        label: t('settings.appearance.language'),
        description: t('settings.appearance.languageDesc'),
        category: 'appearance',
        render: (s) => (
          <Dropdown
            label={t('settings.appearance.language')}
            description={t('settings.appearance.languageDesc')}
            value={s.language}
            options={[
              { value: 'en', label: 'English' },
              { value: 'ru', label: 'Русский (Russian)' }
            ]}
            onChange={(v) => s.updateSetting('language', v)}
          />
        )
      },
      {
        id: 'sidebarSide',
        label: t('settings.appearance.sidebarSide'),
        description: t('settings.appearance.sidebarSideDesc'),
        category: 'appearance',
        render: (s) => (
          <Dropdown
            label={t('settings.appearance.sidebarSide')}
            description={t('settings.appearance.sidebarSideDesc')}
            value={s.sidebarSide}
            options={[
              { value: 'left', label: t('settings.appearance.sidebarSide.left') },
              { value: 'right', label: t('settings.appearance.sidebarSide.right') }
            ]}
            onChange={(v) => s.updateSetting('sidebarSide', v)}
          />
        )
      },
      {
        id: 'uiZoom', label: t('settings.appearance.uiZoom'),
        description: t('settings.appearance.uiZoomDesc'),
        category: 'appearance',
        render: (s) => (
          <Slider label={t('settings.appearance.uiZoom')} description={t('settings.appearance.uiZoomDesc')}
            value={s.uiZoom} min={80} max={130} unit="%"
            onChange={(v) => s.updateSetting('uiZoom', Math.round(v / 5) * 5)} />
        )
      },
      {
        id: 'compactMode', label: t('settings.appearance.compactMode'),
        description: t('settings.appearance.compactModeDesc'),
        category: 'appearance',
        render: (s) => (
          <Toggle label={t('settings.appearance.compactMode')} description={t('settings.appearance.compactModeDesc')}
            checked={s.compactMode} onChange={(v) => s.updateSetting('compactMode', v)} />
        )
      },
      {
        id: 'showStatusBar', label: t('settings.appearance.showStatusBar'),
        description: t('settings.appearance.showStatusBarDesc'),
        category: 'appearance',
        render: (s) => (
          <Toggle label={t('settings.appearance.showStatusBar')} description={t('settings.appearance.showStatusBarDesc')}
            checked={s.showStatusBar} onChange={(v) => s.updateSetting('showStatusBar', v)} />
        )
      },
      {
        id: 'previewFontFamily', label: t('settings.appearance.previewFontFamily'),
        description: t('settings.appearance.previewFontFamilyDesc'),
        category: 'appearance',
        render: (s) => (
          <Dropdown label={t('settings.appearance.previewFontFamily')} description={t('settings.appearance.previewFontFamilyDesc')}
            value={s.previewFontFamily}
            options={[
              { value: 'Georgia', label: t('settings.appearance.previewFontFamily.georgia') },
              { value: 'Inter', label: t('settings.appearance.previewFontFamily.inter') },
              { value: 'system-ui', label: t('settings.appearance.previewFontFamily.system') },
              { value: 'JetBrains Mono', label: t('settings.appearance.previewFontFamily.jetbrainsMono') }
            ]}
            onChange={(v) => s.updateSetting('previewFontFamily', v as any)} />
        )
      },
      {
        id: 'alwaysShowTabBar', label: t('settings.appearance.alwaysShowTabBar'),
        description: t('settings.appearance.alwaysShowTabBarDesc'),
        category: 'appearance',
        render: (s) => (
          <Toggle label={t('settings.appearance.alwaysShowTabBar')} description={t('settings.appearance.alwaysShowTabBarDesc')}
            checked={s.alwaysShowTabBar} onChange={(v) => s.updateSetting('alwaysShowTabBar', v)} />
        )
      },

      // CANVAS
      {
        id: 'snapToGrid',
        label: t('settings.canvas.snapToGrid'),
        description: t('settings.canvas.snapToGridDesc'),
        category: 'canvas',
        render: (s) => (
          <Toggle
            label={t('settings.canvas.snapToGrid')}
            description={t('settings.canvas.snapToGridDesc')}
            checked={s.snapToGrid}
            onChange={(v) => s.updateSetting('snapToGrid', v)}
          />
        )
      },
      {
        id: 'gridSize',
        label: t('settings.canvas.gridSize'),
        description: t('settings.canvas.gridSizeDesc'),
        category: 'canvas',
        render: (s) => (
          <Slider
            label={t('settings.canvas.gridSize')}
            description={t('settings.canvas.gridSizeDesc')}
            value={s.gridSize}
            min={5}
            max={30}
            unit="px"
            onChange={(v) => s.updateSetting('gridSize', v)}
          />
        )
      },
      {
        id: 'connectionLineStyle',
        label: t('settings.canvas.connectionLineStyle'),
        description: t('settings.canvas.connectionLineStyleDesc'),
        category: 'canvas',
        render: (s) => (
          <Dropdown
            label={t('settings.canvas.connectionLineStyle')}
            description={t('settings.canvas.connectionLineStyleDesc')}
            value={s.connectionLineStyle}
            options={[
              { value: 'curved', label: t('settings.canvas.connectionLineStyle.curved') },
              { value: 'straight', label: t('settings.canvas.connectionLineStyle.straight') },
              { value: 'orthogonal', label: t('settings.canvas.connectionLineStyle.orthogonal') }
            ]}
            onChange={(v) => s.updateSetting('connectionLineStyle', v)}
          />
        )
      },
      {
        id: 'defaultCardColor',
        label: t('settings.canvas.defaultCardColor'),
        description: t('settings.canvas.defaultCardColorDesc'),
        category: 'canvas',
        render: (s) => (
          <ColorPicker
            label={t('settings.canvas.defaultCardColor')}
            description={t('settings.canvas.defaultCardColorDesc')}
            value={s.defaultCardColor}
            options={[
              { color: '#7c6af7', name: t('settings.canvas.defaultCardColor.purple') },
              { color: '#e0c068', name: t('settings.canvas.defaultCardColor.yellow') },
              { color: '#68c098', name: t('settings.canvas.defaultCardColor.green') },
              { color: '#6898c0', name: t('settings.canvas.defaultCardColor.blue') },
              { color: '#c06868', name: t('settings.canvas.defaultCardColor.red') }
            ]}
            onChange={(v) => s.updateSetting('defaultCardColor', v)}
          />
        )
      },

      // EXPORT
      {
        id: 'defaultExportFormat', label: t('settings.export.defaultExportFormat'),
        description: t('settings.export.defaultExportFormatDesc'),
        category: 'export',
        render: (s) => (
          <Dropdown label={t('settings.export.defaultExportFormat')} description={t('settings.export.defaultExportFormatDesc')}
            value={s.defaultExportFormat}
            options={[{ value: 'html', label: 'HTML' }, { value: 'pdf', label: 'PDF' }]}
            onChange={(v) => s.updateSetting('defaultExportFormat', v as any)} />
        )
      },
      {
        id: 'pdfPageSize', label: t('settings.export.pdfPageSize'),
        description: t('settings.export.pdfPageSizeDesc'),
        category: 'export',
        render: (s) => (
          <Dropdown label={t('settings.export.pdfPageSize')} description={t('settings.export.pdfPageSizeDesc')}
            value={s.pdfPageSize}
            options={[
              { value: 'A4', label: t('settings.export.pdfPageSize.A4') },
              { value: 'Letter', label: t('settings.export.pdfPageSize.Letter') }
            ]}
            onChange={(v) => s.updateSetting('pdfPageSize', v as any)} />
        )
      },
      {
        id: 'exportIncludeFrontmatter', label: t('settings.export.exportIncludeFrontmatter'),
        description: t('settings.export.exportIncludeFrontmatterDesc'),
        category: 'export',
        render: (s) => (
          <Toggle label={t('settings.export.exportIncludeFrontmatter')} description={t('settings.export.exportIncludeFrontmatterDesc')}
            checked={s.exportIncludeFrontmatter} onChange={(v) => s.updateSetting('exportIncludeFrontmatter', v)} />
        )
      },
      {
        id: 'exportCustomCSS', label: t('settings.export.exportCustomCSS'),
        description: t('settings.export.exportCustomCSSDesc'),
        category: 'export',
        render: (s) => (
          <TextAreaInput label={t('settings.export.exportCustomCSS')} description={t('settings.export.exportCustomCSSDesc')}
            value={s.exportCustomCSS} placeholder="body { font-family: Georgia; }"
            onChange={(v) => s.updateSetting('exportCustomCSS', v)} />
        )
      },

      // SYNC
      {
        id: 'gitCommitTemplate', label: t('settings.sync.gitCommitTemplate'),
        description: t('settings.sync.gitCommitTemplateDesc'),
        category: 'sync',
        render: (s) => (
          <TextInput label={t('settings.sync.gitCommitTemplate')} description={t('settings.sync.gitCommitTemplateDesc')}
            value={s.gitCommitTemplate} placeholder="Updated {files}"
            onChange={(v) => s.updateSetting('gitCommitTemplate', v)} />
        )
      },
      {
        id: 'gitDefaultBranch', label: t('settings.sync.gitDefaultBranch'),
        description: t('settings.sync.gitDefaultBranchDesc'),
        category: 'sync',
        render: (s) => (
          <TextInput label={t('settings.sync.gitDefaultBranch')} description={t('settings.sync.gitDefaultBranchDesc')}
            value={s.gitDefaultBranch} placeholder="main"
            onChange={(v) => s.updateSetting('gitDefaultBranch', v)} />
        )
      },
    ],
    [t]
  )

  const categoriesList: { id: SettingCategory; label: string }[] = [
    { id: 'editor', label: t('settings.nav.editor') },
    { id: 'files', label: t('settings.nav.files') },
    { id: 'appearance', label: t('settings.nav.appearance') },
    { id: 'canvas', label: t('settings.nav.canvas') },
    { id: 'plugins', label: t('settings.nav.plugins') },
    { id: 'export', label: t('settings.nav.export') },
    { id: 'sync', label: t('settings.nav.sync') },
    { id: 'hotkeys', label: t('settings.nav.hotkeys') },
    { id: 'about', label: t('settings.nav.about') }
  ]

  // Filtered settings based on search query
  const filteredSettings = useMemo(() => {
    if (!searchQuery) return []
    const query = searchQuery.toLowerCase().trim()
    return settingsDefinitions.filter(
      (s) =>
        s.label.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query) ||
        s.category.toLowerCase().includes(query)
    )
  }, [searchQuery, settingsDefinitions])

  // Custom link opener using window.vault.openExternal
  const handleOpenLink = (url: string) => {
    if (window.vault?.openExternal) {
      window.vault.openExternal(url)
    } else {
      window.open(url, '_blank')
    }
  }

  // Plugins list
  const pluginsList = [
    {
      id: 'dailyNotes',
      name: 'Daily Notes',
      desc: 'Create and open a daily note based on current date automatically.',
      author: 'ave'
    },
    {
      id: 'wordCounter',
      name: 'Word Counter',
      desc: 'Count and display the total number of words in the status bar.',
      author: 'ave'
    },
    {
      id: 'slashCommands',
      name: 'Slash Commands',
      desc: 'Trigger formatting actions and note insertions using / key triggers.',
      author: 'ave'
    },
    {
      id: 'tagsPanel',
      name: 'Tag Index Panel',
      desc: 'Show an index of all hashtag elements parsed in note contents.',
      author: 'ave'
    },
    {
      id: 'backlinksPanel',
      name: 'Backlinks Explorer',
      desc: 'List notes referencing the current active tab note.',
      author: 'ave'
    },
    {
      id: 'tocPanel',
      name: 'Table of Contents',
      desc: 'Generate dynamic layout heading navigators for markdown documents.',
      author: 'ave'
    },
    {
      id: 'gitBackup',
      name: 'Git Autocommit Backups',
      desc: 'Periodically git commit changes inside the vault automatically.',
      author: 'ave'
    },
    {
      id: 'excalidraw',
      name: 'Excalidraw Sketchpad',
      desc: 'Integrate dynamic hand-drawn diagrams inside notes.',
      author: 'ave'
    },
    {
      id: 'vimMode',
      name: 'Vim Mode',
      desc: 'Enable Vim keybindings in the markdown editor (Normal, Insert, Visual modes).',
      author: 'ave'
    }
  ] as const

  if (!isOpen) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(4px)'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 900,
          height: 600,
          background: 'var(--bg-primary)',
          borderRadius: 14,
          border: '1px solid var(--border-color)',
          boxShadow: '0 24px 72px rgba(0,0,0,0.9)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
        }}
      >
        {/* TOP BAR */}
        <div
          style={{
            height: 48,
            padding: '0 24px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-secondary)'
          }}
        >
          <span style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 600, letterSpacing: '0.02em' }}>
            {t('settings.title')}
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: 22,
              lineHeight: 1,
              transition: 'color 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
          >
            ×
          </button>
        </div>

        {/* CONTAINER */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* SIDEBAR */}
          <div
            style={{
              width: 240,
              background: 'var(--bg-tertiary)',
              borderRight: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              padding: '16px 8px'
            }}
          >
            {/* Search Input */}
            <div style={{ padding: '0 8px 12px 8px' }}>
              <input
                type="text"
                placeholder={t('settings.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 6,
                  color: 'var(--text-primary)',
                  fontSize: 12,
                  padding: '6px 10px',
                  outline: 'none'
                }}
              />
            </div>

            {/* Category Navigation */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                flex: 1,
                overflowY: 'auto'
              }}
            >
              {categoriesList.map((cat) => {
                const isSelected = !searchQuery && activeCategory === cat.id
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSearchQuery('')
                      setActiveCategory(cat.id)
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 12px',
                      borderRadius: 6,
                      background: isSelected ? 'var(--accent-glow)' : 'transparent',
                      border: 'none',
                      color: isSelected ? 'var(--accent-color)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: 12,
                      fontWeight: isSelected ? 600 : 500,
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                        e.currentTarget.style.color = 'var(--text-primary)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.color = 'var(--text-secondary)'
                      }
                    }}
                  >
                    <span
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      {getCategoryIcon(cat.id, isSelected ? 'var(--accent-color)' : 'var(--text-secondary)')}
                    </span>
                    <span>{cat.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Reset Defaults button */}
            <div style={{ padding: '8px 8px 0 8px', borderTop: '1px solid var(--border-color)' }}>
              <button
                onClick={() => {
                  if (confirm(t('settings.resetConfirm'))) {
                    store.resetToDefault()
                  }
                }}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: '1px dashed var(--border-color)',
                  borderRadius: 6,
                  color: 'var(--text-secondary)',
                  fontSize: 11,
                  padding: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#c06868'
                  e.currentTarget.style.color = '#c06868'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-color)'
                  e.currentTarget.style.color = 'var(--text-secondary)'
                }}
              >
                {t('settings.resetDefaults')}
              </button>
            </div>
          </div>

          {/* MAIN SETTINGS PANE */}
          <div
            style={{
              flex: 1,
              background: 'var(--bg-primary)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            {/* Scroll Container */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
              {/* SEARCH RESULTS MODE */}
              {searchQuery ? (
                <div>
                  <div style={{ color: 'var(--text-primary)', fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
                    {t('settings.searchResults')}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 11, marginBottom: 20 }}>
                    {t('settings.searchResultsFor', { query: searchQuery })}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {filteredSettings.length > 0 ? (
                      filteredSettings.map((item) => (
                        <div key={item.id}>
                          <div
                            style={{
                              color: 'var(--text-secondary)',
                              fontSize: 9,
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              marginBottom: 4
                            }}
                          >
                            {t('settings.nav.' + item.category)}
                          </div>
                          {item.render(store)}
                        </div>
                      ))
                    ) : (
                      <div
                        style={{
                          textAlign: 'center',
                          color: 'var(--text-secondary)',
                          padding: '48px 0',
                          fontSize: 13
                        }}
                      >
                        {t('settings.noResults')}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* CATEGORY TAB MODE */
                <div>
                  {activeCategory === 'editor' && (
                    <div>
                      <h3
                        style={{
                          margin: '0 0 4px 0',
                          color: 'var(--text-primary)',
                          fontSize: 16,
                          fontWeight: 600
                        }}
                      >
                        {t('settings.editor.title')}
                      </h3>
                      <p style={{ margin: '0 0 20px 0', color: 'var(--text-secondary)', fontSize: 12 }}>
                        {t('settings.editor.description')}
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {settingsDefinitions
                          .filter((s) => s.category === 'editor')
                          .map((s) => (
                            <div key={s.id}>{s.render(store)}</div>
                          ))}
                      </div>
                    </div>
                  )}

                  {activeCategory === 'files' && (
                    <div>
                      <h3
                        style={{
                          margin: '0 0 4px 0',
                          color: '#fff',
                          fontSize: 16,
                          fontWeight: 600
                        }}
                      >
                        {t('settings.files.title')}
                      </h3>
                      <p style={{ margin: '0 0 20px 0', color: '#777', fontSize: 12 }}>
                        {t('settings.files.description')}
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {settingsDefinitions
                          .filter((s) => s.category === 'files')
                          .map((s) => (
                            <div key={s.id}>{s.render(store)}</div>
                          ))}
                      </div>
                    </div>
                  )}

                  {activeCategory === 'appearance' && (
                    <div>
                      <h3
                        style={{
                          margin: '0 0 4px 0',
                          color: '#fff',
                          fontSize: 16,
                          fontWeight: 600
                        }}
                      >
                        {t('settings.appearance.title')}
                      </h3>
                      <p style={{ margin: '0 0 20px 0', color: '#777', fontSize: 12 }}>
                        {t('settings.appearance.description')}
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {settingsDefinitions
                          .filter((s) => s.category === 'appearance')
                          .map((s) => (
                            <div key={s.id}>{s.render(store)}</div>
                          ))}
                      </div>
                    </div>
                  )}

                  {activeCategory === 'canvas' && (
                    <div>
                      <h3
                        style={{
                          margin: '0 0 4px 0',
                          color: '#fff',
                          fontSize: 16,
                          fontWeight: 600
                        }}
                      >
                        {t('settings.canvas.title')}
                      </h3>
                      <p style={{ margin: '0 0 20px 0', color: '#777', fontSize: 12 }}>
                        {t('settings.canvas.description')}
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {settingsDefinitions
                          .filter((s) => s.category === 'canvas')
                          .map((s) => (
                            <div key={s.id}>{s.render(store)}</div>
                          ))}
                      </div>
                    </div>
                  )}

                  {activeCategory === 'plugins' && (
                    <div>
                      <h3
                        style={{
                          margin: '0 0 4px 0',
                          color: '#fff',
                          fontSize: 16,
                          fontWeight: 600
                        }}
                      >
                        {t('settings.plugins.title')}
                      </h3>
                      <p style={{ margin: '0 0 20px 0', color: '#777', fontSize: 12 }}>
                        {t('settings.plugins.description')}
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {pluginsList.map((p) => {
                          const isEnabled = store.pluginsEnabled[p.id]
                          return (
                            <div
                              key={p.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '14px 18px',
                                background: '#161616',
                                borderRadius: 8,
                                border: '1px solid #252525'
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: 3,
                                  paddingRight: 16
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ color: '#eee', fontSize: 13, fontWeight: 600 }}>
                                    {t('settings.plugins.' + p.id + '.name')}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: 9,
                                      color: '#555',
                                      background: '#222',
                                      padding: '1px 5px',
                                      borderRadius: 4
                                    }}
                                  >
                                    v{(window as any).appInfo?.version ?? '1.0.0'}
                                  </span>
                                </div>
                                <span style={{ color: '#777', fontSize: 11, lineHeight: '1.4' }}>
                                  {t('settings.plugins.' + p.id + '.desc')}
                                </span>
                                <div
                                  style={{
                                    display: 'flex',
                                    gap: 4,
                                    fontSize: 10,
                                    color: '#555',
                                    marginTop: 4
                                  }}
                                >
                                  <span>{t('settings.plugins.by')}</span>
                                  <span
                                    onClick={() => handleOpenLink('https://github.com/bvsmma')}
                                    style={{
                                      color: '#7c6af7',
                                      cursor: 'pointer',
                                      textDecoration: 'underline'
                                    }}
                                  >
                                    {p.author}
                                  </span>
                                </div>
                              </div>
                              <div
                                onClick={() => store.togglePlugin(p.id)}
                                style={{
                                  width: 38,
                                  height: 20,
                                  borderRadius: 10,
                                  background: isEnabled ? '#7c6af7' : '#333',
                                  position: 'relative',
                                  cursor: 'pointer',
                                  transition: 'background 0.2s ease',
                                  flexShrink: 0
                                }}
                              >
                                <div
                                  style={{
                                    width: 14,
                                    height: 14,
                                    borderRadius: '50%',
                                    background: '#fff',
                                    position: 'absolute',
                                    top: 3,
                                    left: isEnabled ? 21 : 3,
                                    transition: 'left 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)'
                                  }}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {activeCategory === 'hotkeys' && (
                    <div>
                      <h3
                        style={{
                          margin: '0 0 4px 0',
                          color: '#fff',
                          fontSize: 16,
                          fontWeight: 600
                        }}
                      >
                        {t('settings.hotkeys.title')}
                      </h3>
                      <p style={{ margin: '0 0 20px 0', color: '#777', fontSize: 12 }}>
                        {t('settings.hotkeys.description')}
                      </p>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 1,
                          background: '#252525',
                          borderRadius: 8,
                          overflow: 'hidden',
                          border: '1px solid #252525'
                        }}
                      >
                        {[
                          { group: 'general' },
                          { actionId: 'commandPalette', keys: ['⌘', 'K'] },
                          { actionId: 'settings', keys: ['⌘', ','] },
                          { actionId: 'openVault', keys: ['⌘', 'O'] },
                          { group: 'files' },
                          { actionId: 'newNote', keys: ['⌘', 'N'] },
                          { actionId: 'newDailyNote', keys: ['⌘', 'D'] },
                          { actionId: 'save', keys: ['⌘', 'S'] },
                          { actionId: 'exportHtml', keys: ['⌘', 'E'] },
                          { actionId: 'closeTab', keys: ['⌘', 'W'] },
                          { group: 'view' },
                          { actionId: 'graphView', keys: ['⌘', '⇧', 'G'] },
                          { group: 'sketchpad' },
                          { actionId: 'undoStroke', keys: ['⌘', 'Z'] },
                          { actionId: 'redoStroke', keys: ['⌘', '⇧', 'Z'] },
                        ].map((hk, idx) => {
                          if ('group' in hk) {
                            return (
                              <div key={idx} style={{
                                padding: '8px 16px 4px',
                                background: '#161616',
                                color: '#555',
                                fontSize: 10,
                                fontWeight: 700,
                                letterSpacing: '0.08em',
                                textTransform: 'uppercase',
                                borderTop: idx > 0 ? '1px solid #252525' : 'none',
                              }}>
                                {t('settings.hotkeys.group.' + hk.group)}
                              </div>
                            )
                          }
                          return (
                            <div
                              key={hk.actionId}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '10px 16px',
                                background: '#161616',
                              }}
                            >
                              <span style={{ color: '#ddd', fontSize: 13 }}>{t('settings.hotkeys.action.' + hk.actionId)}</span>
                              <div style={{ display: 'flex', gap: 4 }}>
                                {hk.keys.map((k, i) => (
                                  <kbd key={i} style={{
                                    background: '#222', border: '1px solid #3c3c3c',
                                    borderRadius: 4, color: '#aaa', fontSize: 11,
                                    padding: '2px 6px', fontFamily: 'monospace',
                                    boxShadow: '0 2px 0 #111',
                                  }}>
                                    {k}
                                  </kbd>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {activeCategory === 'export' && (
                    <div>
                      <h3 style={{ margin: '0 0 4px 0', color: 'var(--text-primary)', fontSize: 16, fontWeight: 600 }}>{t('settings.export.title')}</h3>
                      <p style={{ margin: '0 0 20px 0', color: 'var(--text-secondary)', fontSize: 12 }}>
                        {t('settings.export.description')}
                      </p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {settingsDefinitions.filter((s) => s.category === 'export').map((s) => (
                          <div key={s.id}>{s.render(store)}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeCategory === 'sync' && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
                        <h3 style={{ margin: 0, color: '#fff', fontSize: 16, fontWeight: 600 }}>{t('settings.sync.title')}</h3>
                      </div>
                      <p style={{ margin: '0 0 24px 0', color: '#777', fontSize: 12 }}>
                        {t('settings.sync.description')}
                      </p>
                      <SettingsGitHubSection isOpen={isOpen} />
                    </div>
                  )}

                  {activeCategory === 'about' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                      <div>
                        <h3
                          style={{
                            margin: '0 0 4px 0',
                            color: '#fff',
                            fontSize: 16,
                            fontWeight: 600
                          }}
                        >
                          {t('settings.about.activeVault')}
                        </h3>
                        <p style={{ margin: '0 0 16px 0', color: '#777', fontSize: 12 }}>
                          {t('settings.about.activeVaultDesc')}
                        </p>
                        <div
                          style={{
                            padding: '16px',
                            background: '#161616',
                            borderRadius: 8,
                            border: '1px solid #252525',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8,
                            fontSize: 12
                          }}
                        >
                          <div style={{ display: 'flex' }}>
                            <span style={{ color: '#555', width: 100, fontWeight: 600 }}>
                              {t('settings.about.vaultName')}
                            </span>
                            <span style={{ color: '#eee', fontFamily: 'monospace' }}>
                              {vault?.name || t('settings.about.noVault')}
                            </span>
                          </div>
                          <div style={{ display: 'flex' }}>
                            <span style={{ color: '#555', width: 100, fontWeight: 600 }}>
                              {t('settings.about.vaultPath')}
                            </span>
                            <span
                              style={{
                                color: '#aaa',
                                fontFamily: 'monospace',
                                wordBreak: 'break-all'
                              }}
                            >
                              {vault?.path || t('settings.about.noPath')}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3
                          style={{
                            margin: '0 0 4px 0',
                            color: '#fff',
                            fontSize: 16,
                            fontWeight: 600
                          }}
                        >
                          {t('settings.about.title')}
                        </h3>
                        <p style={{ margin: '0 0 16px 0', color: '#777', fontSize: 12 }}>
                          {t('settings.about.titleDesc')}
                        </p>
                        <div
                          style={{
                            padding: '16px',
                            background: '#161616',
                            borderRadius: 8,
                            border: '1px solid #252525',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8,
                            fontSize: 12
                          }}
                        >
                          <div style={{ display: 'flex' }}>
                            <span style={{ color: '#555', width: 100, fontWeight: 600 }}>
                              {t('settings.about.version')}
                            </span>
                            <span style={{ color: '#eee' }}>v{(window as any).appInfo?.version ?? '1.0.0'}</span>
                          </div>
                          <div style={{ display: 'flex' }}>
                            <span style={{ color: '#555', width: 100, fontWeight: 600 }}>
                              {t('settings.about.engine')}
                            </span>
                            <span style={{ color: '#aaa' }}>Electron / React / TypeScript</span>
                          </div>
                          <div style={{ display: 'flex' }}>
                            <span style={{ color: '#555', width: 100, fontWeight: 600 }}>
                              {t('settings.about.developer')}
                            </span>
                            <span
                              onClick={() => handleOpenLink('https://github.com/bvsmma')}
                              style={{
                                color: '#7c6af7',
                                fontWeight: 600,
                                cursor: 'pointer',
                                textDecoration: 'underline'
                              }}
                            >
                              ave
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 style={{ margin: '0 0 4px 0', color: '#fff', fontSize: 16, fontWeight: 600 }}>{t('settings.about.actions')}</h3>
                        <p style={{ margin: '0 0 16px 0', color: '#777', fontSize: 12 }}>{t('settings.about.actionsDesc')}</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <button
                            onClick={() => handleOpenLink('https://github.com/bvsmma/meridian/releases')}
                            style={{ padding: '10px 16px', background: '#161616', border: '1px solid #252525', borderRadius: 8, color: '#eee', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}
                          >{t('settings.about.checkUpdates')}</button>
                          <button
                            onClick={async () => {
                              const vault = window.vault as any
                              if (vault?.getConfigPath) {
                                const p = await vault.getConfigPath()
                                if (p) vault.openPath(p)
                              }
                            }}
                            style={{ padding: '10px 16px', background: '#161616', border: '1px solid #252525', borderRadius: 8, color: '#eee', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}
                          >{t('settings.about.openConfig')}</button>
                          <button
                            onClick={() => {
                              const raw = localStorage.getItem('meridian-settings') ?? '{}'
                              const blob = new Blob([raw], { type: 'application/json' })
                              const url = URL.createObjectURL(blob)
                              const a = document.createElement('a')
                              a.href = url; a.download = 'meridian-settings.json'; a.click()
                              URL.revokeObjectURL(url)
                            }}
                            style={{ padding: '10px 16px', background: '#161616', border: '1px solid #252525', borderRadius: 8, color: '#eee', fontSize: 13, cursor: 'pointer', textAlign: 'left' }}
                          >{t('settings.about.exportSettings')}</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
