import { useEffect } from 'react'
import { useSettingsStore } from '../../store/useSettingsStore'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

function Slider({ label, value, min, max, unit, onChange }: {
  label: string; value: number; min: number; max: number; unit: string
  onChange: (n: number) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#aaa', fontSize: 13 }}>
        <span>{label}</span>
        <span style={{ color: '#7c6af7', fontWeight: 600 }}>{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: '#7c6af7', cursor: 'pointer' }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#444', fontSize: 11 }}>
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  )
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { fontSize, lineWidth, setFontSize, setLineWidth } = useSettingsStore()

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 480, background: '#1e1e1e', borderRadius: 12,
          border: '1px solid #333', boxShadow: '0 24px 64px rgba(0,0,0,0.8)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid #2a2a2a',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>Settings</span>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 28 }}>
          <div>
            <div style={{ color: '#666', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
              Editor
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <Slider label="Font size" value={fontSize} min={13} max={22} unit="px" onChange={setFontSize} />
              <Slider label="Line width" value={lineWidth} min={600} max={960} unit="px" onChange={setLineWidth} />
            </div>
          </div>

          <div>
            <div style={{ color: '#666', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
              Preview
            </div>
            <div style={{ padding: 16, background: '#161616', borderRadius: 8, fontFamily: 'Georgia, serif', fontSize, lineHeight: 1.8, color: '#ccc', maxWidth: lineWidth }}>
              <p style={{ margin: 0 }}>The quick brown fox jumps over the lazy dog. <strong>Bold</strong> and <em>italic</em> text.</p>
            </div>
          </div>
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid #2a2a2a', color: '#444', fontSize: 11, textAlign: 'center' }}>
          Changes apply immediately. Settings are saved automatically.
        </div>
      </div>
    </div>
  )
}
