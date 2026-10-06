import { useTranslation } from 'react-i18next'
import { FORCE_PRESETS, type ForcePreset, type ForceShape } from './graphForces'

const PRESET_LABEL_KEYS: Record<ForcePreset['key'], string> = {
  default: 'graph.presetDefault',
  readable: 'graph.presetReadable',
  dense: 'graph.presetDense',
  galaxy: 'graph.presetGalaxy'
}

function isActivePreset(
  p: ForcePreset,
  v: { linkDistance: number; repulsion: number; textSize: number; shape: ForceShape }
): boolean {
  return (
    p.linkDistance === v.linkDistance &&
    p.repulsion === v.repulsion &&
    (p.textSize === undefined || p.textSize === v.textSize) &&
    p.shape.linkStrength === v.shape.linkStrength &&
    p.shape.gravity === v.shape.gravity &&
    p.shape.collidePad === v.shape.collidePad
  )
}

interface Props {
  linkDistance: number
  repulsionStrength: number
  textSize: number
  shape: ForceShape
  applyPreset: (preset: ForcePreset) => void
}

export function GraphSidebarPresets({
  linkDistance,
  repulsionStrength,
  textSize,
  shape,
  applyPreset
}: Props) {
  const { t } = useTranslation()
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        paddingTop: 14
      }}
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: 'var(--text-secondary)',
          opacity: 0.6,
          letterSpacing: '0.04em'
        }}
      >
        {t('graph.physicsPresets')}
      </span>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {FORCE_PRESETS.map((preset) => {
          const active = isActivePreset(preset, {
            linkDistance,
            repulsion: repulsionStrength,
            textSize,
            shape
          })
          return (
            <button
              key={preset.key}
              onClick={() => applyPreset(preset)}
              style={{
                flex: '1 1 calc(50% - 3px)',
                padding: '6px 0',
                borderRadius: 6,
                fontSize: 11,
                border: '1px solid rgba(255, 255, 255, 0.08)',
                background: active ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {t(PRESET_LABEL_KEYS[preset.key])}
            </button>
          )
        })}
      </div>
    </div>
  )
}
