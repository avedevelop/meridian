import React from 'react'
import { GROUP_COLORS } from './GraphSidebar'
import { HistoryTimelineBar } from './HistoryTimelineBar'

export interface GraphControlsProps {
  viewMode: 'live' | 'history'
  disabledCategories: Set<string>
  toggleCategory: (category: string) => void
  isPhysicsRunning: boolean
  handleTogglePhysics: () => void
  handleZoomIn: () => void
  handleZoomOut: () => void
  handleRecenter: () => void
  // Timeline props
  progress: number
  setProgress: (progress: number) => void
  isPlaying: boolean
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>
  playDuration: number
  setPlayDuration: (duration: number) => void
  isRecording: boolean
  startRecording: () => void
  stopRecording: () => void
  isSettingsOpen: boolean
  formattedDate: string
  activityBuckets: number[]
  historyTicks: Array<{ frac: number; label: string }>
}

export function GraphControls({
  viewMode,
  disabledCategories,
  toggleCategory,
  isPhysicsRunning,
  handleTogglePhysics,
  handleZoomIn,
  handleZoomOut,
  handleRecenter,
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
}: GraphControlsProps) {
  return (
    <>
      {viewMode === 'history' && (
        <HistoryTimelineBar
          progress={progress}
          setProgress={setProgress}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
          playDuration={playDuration}
          setPlayDuration={setPlayDuration}
          isRecording={isRecording}
          startRecording={startRecording}
          stopRecording={stopRecording}
          isSettingsOpen={isSettingsOpen}
          formattedDate={formattedDate}
          activityBuckets={activityBuckets}
          historyTicks={historyTicks}
        />
      )}

      {/* Floating Legend / Quick Category Filter (Bottom-Center) */}
      <div
        style={{
          position: 'absolute',
          bottom: viewMode === 'history' ? 106 : 24,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(20, 20, 26, 0.85)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 8,
          padding: '6px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          zIndex: 20,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          whiteSpace: 'nowrap'
        }}
      >
        <span style={{ fontSize: 10, color: 'var(--text-secondary)', opacity: 0.5, marginRight: 2 }}>
          ⬡
        </span>
        {([
          { key: 'canvas', label: 'Canvases', color: GROUP_COLORS.canvas },
          { key: 'project', label: 'Projects', color: GROUP_COLORS.project },
          { key: 'daily', label: 'Daily Notes', color: GROUP_COLORS.daily },
          { key: 'connected', label: 'Connected', color: GROUP_COLORS.connected },
          { key: 'orphan', label: 'Orphans', color: GROUP_COLORS.orphan }
        ] as const).map((cat) => {
          const isDisabled = disabledCategories.has(cat.key)
          return (
            <button
              key={cat.key}
              onClick={() => toggleCategory(cat.key)}
              style={{
                background: isDisabled ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                opacity: isDisabled ? 0.4 : 1
              }}
              onMouseEnter={(e) => {
                if (!isDisabled) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'
              }}
              onMouseLeave={(e) => {
                if (!isDisabled) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: cat.color }} />
              <span style={{ fontSize: 11, color: 'var(--text-primary)', textDecoration: isDisabled ? 'line-through' : 'none' }}>
                {cat.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* Floating Navigation & Physics Controls HUD (Bottom-Right) */}
      <div
        style={{
          position: 'absolute',
          bottom: viewMode === 'history' ? 106 : 24,
          right: 24,
          background: 'rgba(20, 20, 26, 0.85)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 8,
          padding: '6px 8px',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          zIndex: 20,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
        }}
      >
        <button
          onClick={handleZoomIn}
          title="Zoom In"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            width: 28,
            height: 28,
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
            e.currentTarget.style.color = 'var(--accent-color)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--text-secondary)'
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 'bold' }}>＋</span>
        </button>
        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            width: 28,
            height: 28,
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
            e.currentTarget.style.color = 'var(--accent-color)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--text-secondary)'
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 'bold' }}>－</span>
        </button>
        <button
          onClick={handleRecenter}
          title="Recenter & Fit View"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            width: 28,
            height: 28,
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
            e.currentTarget.style.color = 'var(--accent-color)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--text-secondary)'
          }}
        >
          <span style={{ fontSize: 14 }}>⊙</span>
        </button>
        
        <div style={{ width: 1, height: 14, background: 'rgba(255, 255, 255, 0.12)' }} />

        <button
          onClick={handleTogglePhysics}
          title={isPhysicsRunning ? "Pause Physics Simulation" : "Resume Physics Simulation"}
          style={{
            background: 'transparent',
            border: 'none',
            color: isPhysicsRunning ? 'var(--accent-color)' : 'var(--text-secondary)',
            cursor: 'pointer',
            width: 28,
            height: 28,
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
          }}
        >
          <span style={{ fontSize: 12 }}>{isPhysicsRunning ? '⏸' : '▶'}</span>
        </button>
      </div>
    </>
  )
}
