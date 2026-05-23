import React from 'react'
import { useTranslation } from 'react-i18next'
import { HistoryTimelineBar } from './HistoryTimelineBar'

export interface GraphControlsProps {
  viewMode: 'live' | 'history'
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
  const { t } = useTranslation()
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
          title={t('graph.controls.zoomIn')}
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
          title={t('graph.controls.zoomOut')}
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
          title={t('graph.controls.recenter')}
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
          title={
            isPhysicsRunning
              ? t('graph.controls.pausePhysics')
              : t('graph.controls.resumePhysics')
          }
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
