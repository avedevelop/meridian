import { TFunction } from 'i18next'
import { SettingDefinition } from './settingsTypes'
import { Toggle } from './controls/Toggle'
import { Slider } from './controls/Slider'
import { Dropdown } from './controls/Dropdown'
import { TextInput } from './controls/TextInput'
import { TextAreaInput } from './controls/TextAreaInput'
import { ColorPicker } from './controls/ColorPicker'

export function buildSettingsDefinitions(t: TFunction): SettingDefinition[] {
  return [
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
      id: 'uiZoom',
      label: t('settings.appearance.uiZoom'),
      description: t('settings.appearance.uiZoomDesc'),
      category: 'appearance',
      render: (s) => (
        <Slider
          label={t('settings.appearance.uiZoom')}
          description={t('settings.appearance.uiZoomDesc')}
          value={s.uiZoom}
          min={80}
          max={130}
          unit="%"
          onChange={(v) => s.updateSetting('uiZoom', Math.round(v / 5) * 5)}
        />
      )
    },
    {
      id: 'compactMode',
      label: t('settings.appearance.compactMode'),
      description: t('settings.appearance.compactModeDesc'),
      category: 'appearance',
      render: (s) => (
        <Toggle
          label={t('settings.appearance.compactMode')}
          description={t('settings.appearance.compactModeDesc')}
          checked={s.compactMode}
          onChange={(v) => s.updateSetting('compactMode', v)}
        />
      )
    },
    {
      id: 'showStatusBar',
      label: t('settings.appearance.showStatusBar'),
      description: t('settings.appearance.showStatusBarDesc'),
      category: 'appearance',
      render: (s) => (
        <Toggle
          label={t('settings.appearance.showStatusBar')}
          description={t('settings.appearance.showStatusBarDesc')}
          checked={s.showStatusBar}
          onChange={(v) => s.updateSetting('showStatusBar', v)}
        />
      )
    },
    {
      id: 'previewFontFamily',
      label: t('settings.appearance.previewFontFamily'),
      description: t('settings.appearance.previewFontFamilyDesc'),
      category: 'appearance',
      render: (s) => (
        <Dropdown
          label={t('settings.appearance.previewFontFamily')}
          description={t('settings.appearance.previewFontFamilyDesc')}
          value={s.previewFontFamily}
          options={[
            { value: 'Georgia', label: t('settings.appearance.previewFontFamily.georgia') },
            { value: 'Inter', label: t('settings.appearance.previewFontFamily.inter') },
            { value: 'system-ui', label: t('settings.appearance.previewFontFamily.system') },
            { value: 'JetBrains Mono', label: t('settings.appearance.previewFontFamily.jetbrainsMono') }
          ]}
          onChange={(v) => s.updateSetting('previewFontFamily', v as any)}
        />
      )
    },
    {
      id: 'alwaysShowTabBar',
      label: t('settings.appearance.alwaysShowTabBar'),
      description: t('settings.appearance.alwaysShowTabBarDesc'),
      category: 'appearance',
      render: (s) => (
        <Toggle
          label={t('settings.appearance.alwaysShowTabBar')}
          description={t('settings.appearance.alwaysShowTabBarDesc')}
          checked={s.alwaysShowTabBar}
          onChange={(v) => s.updateSetting('alwaysShowTabBar', v)}
        />
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
    },

    // SYNC
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
