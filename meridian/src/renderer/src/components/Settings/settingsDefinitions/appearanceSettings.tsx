import { TFunction } from 'i18next'
import { SettingDefinition } from '../settingsTypes'
import { Toggle } from '../controls/Toggle'
import { Slider } from '../controls/Slider'
import { Dropdown } from '../controls/Dropdown'
import { ColorPicker } from '../controls/ColorPicker'

export function buildAppearanceSettings(t: TFunction): SettingDefinition[] {
  return [
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
    {
      id: 'graphMaxNodes',
      label: t('settings.appearance.graphMaxNodes'),
      description: t('settings.appearance.graphMaxNodesDesc'),
      category: 'appearance',
      render: (s) => (
        <Dropdown
          label={t('settings.appearance.graphMaxNodes')}
          description={t('settings.appearance.graphMaxNodesDesc')}
          value={s.graphMaxNodes}
          options={[
            { value: 200, label: t('settings.appearance.graphMaxNodes.200') },
            { value: 400, label: t('settings.appearance.graphMaxNodes.400') },
            { value: 800, label: t('settings.appearance.graphMaxNodes.800') },
            { value: 0, label: t('settings.appearance.graphMaxNodes.0') }
          ]}
          onChange={(v) => s.updateSetting('graphMaxNodes', v)}
        />
      )
    }
  ]
}
