import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ClipboardSettings } from '@shared/clipboard'
import { Dropdown } from './controls/Dropdown'
import { Toggle } from './controls/Toggle'
import { HotkeyField } from './HotkeyField'

const ENTRY_OPTIONS = [500, 1000, 5000, 10000, 50000]
const AGE_OPTIONS = [7, 30, 90, 365]
const CONFIRM_MS = 3000

/** Settings for the clipboard history. These live in the main process, not in the renderer store. */
export function SettingsClipboardSection(): React.ReactElement | null {
  const { t } = useTranslation()
  const api = window.clipboardHistory
  const [settings, setSettings] = useState<ClipboardSettings | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [cleared, setCleared] = useState(false)
  const confirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!api) return
    let alive = true
    void api.getSettings().then((s) => alive && setSettings(s))
    return () => {
      alive = false
      if (confirmTimer.current) clearTimeout(confirmTimer.current)
    }
  }, [api])

  const update = useCallback(
    async (patch: Partial<ClipboardSettings>): Promise<ClipboardSettings> => {
      const next = await api.setSettings(patch)
      setSettings(next)
      return next
    },
    [api]
  )

  if (!api || !settings) return null

  function askClear(): void {
    if (!confirmClear) {
      setConfirmClear(true)
      setCleared(false)
      confirmTimer.current = setTimeout(() => setConfirmClear(false), CONFIRM_MS)
      return
    }
    if (confirmTimer.current) clearTimeout(confirmTimer.current)
    setConfirmClear(false)
    void api.clear().then(() => setCleared(true))
  }

  return (
    <div style={{ marginTop: 28 }}>
      <h4
        style={{ margin: '0 0 4px 0', color: 'var(--text-primary)', fontSize: 14, fontWeight: 600 }}
      >
        {t('settings.clipboard.title')}
      </h4>
      <p style={{ margin: '0 0 16px 0', color: 'var(--text-secondary)', fontSize: 12 }}>
        {t('settings.clipboard.description')}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Toggle
          label={t('settings.clipboard.enabled')}
          description={t('settings.clipboard.enabledDesc')}
          checked={settings.enabled}
          onChange={(v) => void update({ enabled: v })}
        />
        <HotkeyField
          label={t('settings.clipboard.hotkey')}
          description={t('settings.clipboard.hotkeyDesc')}
          value={settings.hotkey}
          onChange={async (accelerator) => (await update({ hotkey: accelerator })).hotkey}
        />
        <Dropdown
          label={t('settings.clipboard.maxEntries')}
          description={t('settings.clipboard.maxEntriesDesc')}
          value={settings.maxEntries}
          options={withCurrent(ENTRY_OPTIONS, settings.maxEntries).map((n) => ({
            value: n,
            label: t('settings.clipboard.nEntries', { n: n.toLocaleString() })
          }))}
          onChange={(v) => void update({ maxEntries: v })}
        />
        <Dropdown
          label={t('settings.clipboard.maxAge')}
          description={t('settings.clipboard.maxAgeDesc')}
          value={settings.maxAgeDays}
          options={withCurrent(AGE_OPTIONS, settings.maxAgeDays).map((n) => ({
            value: n,
            label: t('settings.clipboard.nDays', { n })
          }))}
          onChange={(v) => void update({ maxAgeDays: v })}
        />
        <Dropdown
          label={t('settings.clipboard.sensitive')}
          description={t('settings.clipboard.sensitiveDesc')}
          value={settings.sensitiveMode}
          options={[
            { value: 'mark', label: t('settings.clipboard.sensitive.mark') },
            { value: 'skip', label: t('settings.clipboard.sensitive.skip') }
          ]}
          onChange={(v) => void update({ sensitiveMode: v })}
        />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            background: '#161616',
            borderRadius: 8,
            border: '1px solid #252525'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingRight: 16 }}>
            <span style={{ color: '#eee', fontSize: 13, fontWeight: 500 }}>
              {t('settings.clipboard.clear')}
            </span>
            <span style={{ color: '#777', fontSize: 11, lineHeight: '1.4' }}>
              {cleared ? t('settings.clipboard.cleared') : t('settings.clipboard.clearDesc')}
            </span>
          </div>
          <button
            onClick={askClear}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid #5a2a2a',
              background: confirmClear ? '#7f1d1d' : '#222',
              color: confirmClear ? '#fff' : '#f87171',
              fontSize: 12,
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            {confirmClear
              ? t('settings.clipboard.clearConfirm')
              : t('settings.clipboard.clearButton')}
          </button>
        </div>
      </div>
    </div>
  )
}

/** A stored value that is not one of the presets (edited by hand) still has to be selectable. */
function withCurrent(options: number[], current: number): number[] {
  return options.includes(current) ? options : [...options, current].sort((a, b) => a - b)
}
