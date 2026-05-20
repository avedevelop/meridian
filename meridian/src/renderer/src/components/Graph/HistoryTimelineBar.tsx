import React, { useRef, useState } from 'react'

interface HistoryTimelineBarProps {
  progress: number
  setProgress: (p: number) => void
  isPlaying: boolean
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>
  playDuration: number
  setPlayDuration: (d: number) => void
  isRecording: boolean
  startRecording: () => void
  stopRecording: () => void
  isSettingsOpen: boolean
  formattedDate: string
  activityBuckets: number[]
  historyTicks: Array<{ frac: number; label: string }>
}

export function HistoryTimelineBar({
  progress,
  setProgress,
  isPlaying,
  setIsPlaying,
  playDuration,
  setPlayDuration,
  isRecording,
  startRecording,
  stopRecording,
  isSettingsOpen,
  formattedDate,
  activityBuckets,
  historyTicks
}: HistoryTimelineBarProps) {
  const scrubberRef = useRef<HTMLDivElement>(null)
  const [hoveredTick, setHoveredTick] = useState<number | null>(null)

  const handleScrubberMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const updateFromEvent = (clientX: number) => {
      if (!scrubberRef.current) return
      const rect = scrubberRef.current.getBoundingClientRect()
      const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      setProgress(frac)
      setIsPlaying(() => false)
    }
    updateFromEvent(e.clientX)
    const onMove = (ev: MouseEvent) => updateFromEvent(ev.clientX)
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  return (
    <div
      style={{
        height: 90,
        background: 'rgba(18, 18, 22, 0.92)',
        backdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.07)',
        display: 'flex',
        alignItems: 'stretch',
        gap: 10,
        paddingLeft: isSettingsOpen ? 348 : 16,
        paddingRight: 16,
        paddingTop: 12,
        paddingBottom: 12,
        transition: 'padding-left 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        flexShrink: 0
      }}
    >
      {/* Date */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0, justifyContent: 'center' }}>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', lineHeight: 1, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Viewing</span>
        <span style={{ fontSize: 12, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
          {formattedDate}
        </span>
      </div>

      {/* Grouped: minimap + scrubber + ticks */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 8,
        padding: '8px 14px',
        background: 'rgba(255,255,255,0.03)',
        overflow: 'visible'
      }}>
        {/* Minimap */}
        <svg
          style={{ display: 'block', width: '100%', height: 12, pointerEvents: 'none', opacity: 0.55 }}
          preserveAspectRatio="none"
          viewBox={`0 0 ${activityBuckets.length} 1`}
        >
          {activityBuckets.map((h, i) => (
            <rect key={i} x={i} y={1 - h} width={1} height={h} fill="var(--accent-color)" />
          ))}
        </svg>
        {/* Custom scrubber — no invisible hit area bleeding into ticks */}
        <div
          ref={scrubberRef}
          onMouseDown={handleScrubberMouseDown}
          style={{ position: 'relative', height: 16, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
        >
          {/* Track */}
          <div style={{ width: '100%', height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
            <div style={{ width: `${progress * 100}%`, height: '100%', background: 'var(--accent-color)', borderRadius: 2 }} />
          </div>
          {/* Thumb */}
          <div style={{
            position: 'absolute',
            left: `${progress * 100}%`,
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 13,
            height: 13,
            borderRadius: '50%',
            background: 'var(--accent-color)',
            boxShadow: '0 0 0 2px rgba(124,106,240,0.35)',
            pointerEvents: 'none',
            transition: 'box-shadow 0.15s ease'
          }} />
        </div>
        {/* Ticks */}
        <div style={{ position: 'relative', height: 12, flexShrink: 0 }}>
          {historyTicks.map(({ frac, label }) => (
            <span
              key={frac}
              onClick={() => { setProgress(frac); setIsPlaying(false); }}
              onMouseEnter={() => setHoveredTick(frac)}
              onMouseLeave={() => setHoveredTick(null)}
              style={{
                position: 'absolute',
                left: `${frac * 100}%`,
                top: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                fontSize: 9,
                color: hoveredTick === frac ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.28)',
                transform: frac <= 0.05 ? 'none' : frac >= 0.95 ? 'translateX(-100%)' : 'translateX(-50%)',
                cursor: 'pointer',
                userSelect: 'none' as const,
                whiteSpace: 'nowrap' as const,
                transition: 'color 0.15s ease, background 0.15s ease',
                padding: '0 5px',
                background: hoveredTick === frac ? 'rgba(255,255,255,0.08)' : 'transparent',
                borderRadius: 3
              }}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, alignSelf: 'center' }}>
        <button
          onClick={() => {
            if (progress >= 1) setProgress(0)
            setIsPlaying((p) => !p)
          }}
          style={{
            background: 'var(--accent-color)',
            border: 'none',
            borderRadius: 6,
            color: '#fff',
            width: 34,
            height: 34,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: 14,
            flexShrink: 0
          }}
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        <select
          value={playDuration}
          onChange={(e) => setPlayDuration(Number(e.target.value))}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            color: 'var(--text-secondary)',
            borderRadius: 6,
            padding: '5px 6px',
            fontSize: 11,
            cursor: 'pointer',
            height: 34
          }}
        >
          <option value={5000}>5s</option>
          <option value={10000}>10s</option>
          <option value={20000}>20s</option>
          <option value={30000}>30s</option>
          <option value={60000}>1 min</option>
          <option value={120000}>2 min</option>
          <option value={300000}>5 min</option>
          <option value={600000}>10 min</option>
        </select>
        {isRecording ? (
          <button
            onClick={stopRecording}
            style={{
              background: '#c62828',
              border: 'none',
              borderRadius: 6,
              color: '#fff',
              height: 34,
              padding: '0 12px',
              cursor: 'pointer',
              fontSize: 12,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', display: 'inline-block' }} />
            Stop
          </button>
        ) : (
          <button
            onClick={startRecording}
            title="Record graph animation as WebM video"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 6,
              color: 'var(--text-secondary)',
              height: 34,
              padding: '0 12px',
              cursor: 'pointer',
              fontSize: 12,
              flexShrink: 0
            }}
          >
            ⏺ Rec
          </button>
        )}
      </div>
    </div>
  )
}
