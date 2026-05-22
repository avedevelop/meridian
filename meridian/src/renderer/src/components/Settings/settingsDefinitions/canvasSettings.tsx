import { TFunction } from 'i18next'
import { SettingDefinition } from '../settingsTypes'
import { Toggle } from '../controls/Toggle'
import { Slider } from '../controls/Slider'
import { Dropdown } from '../controls/Dropdown'
import { ColorPicker } from '../controls/ColorPicker'

export function buildCanvasSettings(t: TFunction): SettingDefinition[] {
  return [
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
    }
  ]
}
