import { useRef, useState, useEffect, KeyboardEvent, CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { i18n } from '../i18n/index'

declare global {
  interface Window {
    capture: {
      submit: (text: string) => Promise<{ ok: boolean }>
      state: () => Promise<{ vaultOpen: boolean; language: string }>
      hide: () => Promise<void>
    }
  }
}

// Electron-specific drag region — not in standard React CSSProperties
const drag = { WebkitAppRegion: 'drag' } as CSSProperties
const noDrag = { WebkitAppRegion: 'no-drag' } as CSSProperties

export default function CaptureWindow(): React.ReactElement {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
    window.capture.state().then(({ language }) => {
      if (language && language !== i18n.language) {
        void i18n.changeLanguage(language)
      }
    })
  }, [])

  async function handleKeyDown(e: KeyboardEvent<HTMLInputElement>): Promise<void> {
    if (e.key === 'Escape') {
      await window.capture.hide()
      setValue('')
      setMessage(null)
      return
    }

    if (e.key === 'Enter') {
      const text = value.trim()
      if (!text) return

      const { vaultOpen } = await window.capture.state()
      if (!vaultOpen) {
        setMessage(t('capture.noVault'))
        return
      }

      const result = await window.capture.submit(text)
      if (result.ok) {
        setMessage(t('capture.saved'))
        setValue('')
        setTimeout(async () => {
          setMessage(null)
          await window.capture.hide()
        }, 800)
      }
    }
  }

  const noVaultMessage = t('capture.noVault')

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--bg-secondary, #1e1e1e)',
        borderRadius: 'var(--utility-radius, 7px)',
        border: '1px solid var(--border-color, #333)',
        padding: '12px 14px',
        gap: '8px',
        ...drag
      }}
    >
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t('capture.placeholder')}
        style={{
          ...noDrag,
          background: 'var(--bg-primary, #141414)',
          color: 'var(--text-primary, #ccc)',
          border: '1px solid var(--border-color, #333)',
          borderRadius: 'var(--utility-radius-small, 5px)',
          padding: '8px 10px',
          fontSize: '14px',
          outline: 'none',
          width: '100%',
          caretColor: 'var(--accent-color, #7c6af7)'
        }}
        autoFocus
      />
      {message && (
        <div
          style={{
            ...noDrag,
            fontSize: '12px',
            color:
              message === noVaultMessage
                ? 'var(--text-secondary, #888)'
                : 'var(--accent-color, #7c6af7)',
            textAlign: 'center'
          }}
        >
          {message}
        </div>
      )}
    </div>
  )
}
