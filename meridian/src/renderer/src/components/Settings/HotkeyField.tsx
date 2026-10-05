import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { acceleratorFromEvent, formatAccelerator } from '@shared/accelerator'
import { isMacPlatform } from '../../utils/platformUi'

interface Props {
  label: string
  description: string
  value: string
  /** Called with the new accelerator; resolves to the one that is actually active afterwards. */
  onChange: (accelerator: string) => Promise<string>
}

/** Click, press the new shortcut, done. Esc cancels. Reports when the shortcut is taken. */
export function HotkeyField({ label, description, value, onChange }: Props): React.ReactElement {
  const { t } = useTranslation()
  const mac = isMacPlatform()
  const [recording, setRecording] = useState(false)
  const [rejected, setRejected] = useState<string | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (recording) buttonRef.current?.focus()
  }, [recording])

  async function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>): Promise<void> {
    if (!recording) return
    e.preventDefault()
    e.stopPropagation()
    if (e.key === 'Escape') {
      setRecording(false)
      return
    }
    const accelerator = acceleratorFromEvent(e, mac)
    if (!accelerator) return
    setRecording(false)
    const active = await onChange(accelerator)
    setRejected(active === accelerator ? null : accelerator)
  }

  return (
    <div
      style={{
        padding: '12px 16px',
        background: '#161616',
        borderRadius: 8,
        border: '1px solid #252525'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingRight: 16 }}>
          <span style={{ color: '#eee', fontSize: 13, fontWeight: 500 }}>{label}</span>
          <span style={{ color: '#777', fontSize: 11, lineHeight: '1.4' }}>{description}</span>
        </div>
        <button
          ref={buttonRef}
          onClick={() => {
            setRejected(null)
            setRecording(true)
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => setRecording(false)}
          aria-label={label}
          style={{
            minWidth: 130,
            padding: '6px 12px',
            borderRadius: 6,
            border: `1px solid ${recording ? '#7c6af7' : '#333'}`,
            background: recording ? 'rgba(124,106,247,0.15)' : '#222',
            color: '#eee',
            fontSize: 12,
            cursor: 'pointer',
            flexShrink: 0
          }}
        >
          {recording ? t('settings.clipboard.hotkeyRecording') : formatAccelerator(value, mac)}
        </button>
      </div>
      {recording && (
        <div style={{ marginTop: 6, color: '#777', fontSize: 11 }}>
          {t('settings.clipboard.hotkeyHint')}
        </div>
      )}
      {rejected && (
        <div role="alert" style={{ marginTop: 6, color: '#f59e0b', fontSize: 11 }}>
          {t('settings.clipboard.hotkeyTaken', { hotkey: formatAccelerator(rejected, mac) })}
        </div>
      )}
    </div>
  )
}
