import { useTranslation } from 'react-i18next'
import { shortcutKeyLabels } from '../../utils/platformShortcuts'

export function SettingsHotkeysSection() {
  const { t } = useTranslation()

  const hotkeysList = [
    { group: 'general' },
    { actionId: 'commandPalette', keys: ['mod', 'K'] },
    { actionId: 'settings', keys: ['mod', ','] },
    { actionId: 'openVault', keys: ['mod', 'O'] },
    { group: 'files' },
    { actionId: 'newNote', keys: ['mod', 'N'] },
    { actionId: 'newDailyNote', keys: ['mod', 'D'] },
    { actionId: 'save', keys: ['mod', 'S'] },
    { actionId: 'exportHtml', keys: ['mod', 'E'] },
    { actionId: 'closeTab', keys: ['mod', 'W'] },
    { group: 'view' },
    { actionId: 'graphView', keys: ['mod', 'shift', 'G'] },
    { group: 'sketchpad' },
    { actionId: 'undoStroke', keys: ['mod', 'Z'] },
    { actionId: 'redoStroke', keys: ['mod', 'shift', 'Z'] }
  ] as const

  return (
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
        {hotkeysList.map((hk, idx) => {
          if ('group' in hk) {
            return (
              <div
                key={idx}
                style={{
                  padding: '8px 16px 4px',
                  background: '#161616',
                  color: '#555',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  borderTop: idx > 0 ? '1px solid #252525' : 'none'
                }}
              >
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
                background: '#161616'
              }}
            >
              <span style={{ color: '#ddd', fontSize: 13 }}>
                {t('settings.hotkeys.action.' + hk.actionId)}
              </span>
              <div style={{ display: 'flex', gap: 4 }}>
                {shortcutKeyLabels(hk.keys).map((k, i) => (
                  <kbd
                    key={i}
                    style={{
                      background: '#222',
                      border: '1px solid #3c3c3c',
                      borderRadius: 4,
                      color: '#aaa',
                      fontSize: 11,
                      padding: '2px 6px',
                      fontFamily: 'monospace',
                      boxShadow: '0 2px 0 #111'
                    }}
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
