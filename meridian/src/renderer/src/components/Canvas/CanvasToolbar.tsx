import React from 'react'
import { useTranslation } from 'react-i18next'
import { FrameIcon } from '../Icons'
import { NODE_SELECTED_STROKE, FONT_FAMILY } from './canvasTools'

interface CanvasToolbarProps {
  addCard: () => void
  addFrame: () => void
  fitToContent: () => void
  autoLayout: () => void
  zoomPct: number
}

export function CanvasToolbar({
  addCard,
  addFrame,
  fitToContent,
  autoLayout,
  zoomPct
}: CanvasToolbarProps) {
  const { t } = useTranslation()

  const sep = <div style={{ width: 1, height: 20, background: '#2a2a35', flexShrink: 0 }} />

  const btn = (
    onClick: () => void,
    title: string,
    content: React.ReactNode,
    accent = false
  ) => (
    <button
      key={title}
      onClick={onClick}
      title={title}
      style={{
        background: accent ? NODE_SELECTED_STROKE : 'transparent',
        border: accent ? `1px solid ${NODE_SELECTED_STROKE}` : '1px solid transparent',
        borderRadius: 6,
        color: accent ? '#fff' : '#999',
        height: 28,
        padding: '0 10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        cursor: 'pointer',
        fontSize: 12,
        fontFamily: FONT_FAMILY,
        flexShrink: 0
      }}
      onMouseEnter={(e) => {
        if (!accent) {
          e.currentTarget.style.background = '#21212a'
          e.currentTarget.style.color = '#ddd'
        } else {
          e.currentTarget.style.opacity = '0.85'
        }
      }}
      onMouseLeave={(e) => {
        if (!accent) {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = '#999'
        } else {
          e.currentTarget.style.opacity = '1'
        }
      }}
    >
      {content}
    </button>
  )

  return (
    <div
      style={{
        position: 'absolute',
        top: 12,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        background: '#14141a',
        borderRadius: 10,
        border: '1px solid #2a2a35',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        padding: '4px 8px',
        userSelect: 'none'
      }}
    >
      {/* Create group */}
      {btn(
        addCard,
        t('canvas.tooltip.newCard'),
        <>
          <span style={{ fontSize: 15, fontWeight: 600 }}>+</span>
          <span>{t('canvas.label.card')}</span>
        </>,
        true
      )}
      {btn(
        addFrame,
        t('canvas.tooltip.addFrame'),
        <>
          <FrameIcon size={13} color="#7c6af7" />
          <span>{t('canvas.label.frame')}</span>
        </>
      )}

      {sep}

      {/* View group */}
      {btn(
        fitToContent,
        t('canvas.tooltip.fitToContent'),
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
          <path
            d="M1 5V2a1 1 0 011-1h3M11 1h3a1 1 0 011 1v3M15 11v3a1 1 0 01-1 1h-3M5 15H2a1 1 0 01-1-1v-3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      )}
      <span
        style={{
          fontSize: 12,
          color: '#555',
          minWidth: 34,
          textAlign: 'center',
          fontFamily: FONT_FAMILY
        }}
      >
        {zoomPct}%
      </span>

      {sep}

      {/* Arrange group */}
      {btn(
        autoLayout,
        t('canvas.tooltip.autoLayout'),
        <>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="3" r="2" stroke="currentColor" strokeWidth="1.4" />
            <circle cx="3" cy="12" r="2" stroke="currentColor" strokeWidth="1.4" />
            <circle cx="13" cy="12" r="2" stroke="currentColor" strokeWidth="1.4" />
            <path d="M8 5v2M6.5 7.5L4 10M9.5 7.5L12 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <span>{t('canvas.label.autoLayout')}</span>
        </>
      )}
    </div>
  )
}
