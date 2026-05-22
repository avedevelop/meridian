import { useState, useEffect, useMemo, useRef } from 'react'
import type { VaultFile } from '@shared/types'
import { flattenFiles } from './graphLayout'

export interface UseGraphTimelineOptions {
  files: VaultFile[]
  viewMode: 'live' | 'history'
}

export function useGraphTimeline({ files, viewMode }: UseGraphTimelineOptions) {
  const [progress, setProgress] = useState(1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playDuration, setPlayDuration] = useState(20000)

  const progressRef = useRef(progress)
  useEffect(() => {
    progressRef.current = progress
  }, [progress])

  const { birthtimes, minTime, maxTime } = useMemo(() => {
    const bt = new Map<string, number>()
    flattenFiles(files).forEach((f) => {
      if (!f.isDirectory) bt.set(f.path, f.birthtime ?? f.mtime)
    })
    const times = Array.from(bt.values())
    const min = times.length > 0 ? Math.min(...times) : Date.now() - 86_400_000
    const max = times.length > 0 ? Math.max(...times) : Date.now()
    const finalMax = max === min ? min + 3600000 : max
    return {
      birthtimes: bt,
      minTime: min,
      maxTime: finalMax
    }
  }, [files])

  const currentTimestamp = minTime + (maxTime - minTime) * progress

  const formattedDate = new Date(currentTimestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  const historyTicks = useMemo(() => {
    if (maxTime === minTime) return []
    const span = maxTime - minTime
    const MS_MONTH = 30 * 86400000
    const MS_YEAR = 365 * 86400000
    const count = 6
    return Array.from({ length: count + 1 }, (_, i) => {
      const frac = i / count
      const ts = minTime + span * frac
      const d = new Date(ts)
      let label: string
      if (span > MS_YEAR * 1.5) {
        label = String(d.getFullYear())
      } else if (span > MS_MONTH * 2) {
        label = d.toLocaleDateString('en-US', { month: 'short' })
      } else {
        label = String(d.getDate())
      }
      return { frac, label }
    }).filter((t, i, arr) => t.frac > 0.04 && t.frac < 0.96 && (i === 0 || t.label !== arr[i - 1].label))
  }, [minTime, maxTime])

  const activityBuckets = useMemo(() => {
    const BUCKETS = 80
    const counts = new Array<number>(BUCKETS).fill(0)
    birthtimes.forEach((ts) => {
      const frac = (ts - minTime) / (maxTime - minTime)
      const idx = Math.min(Math.floor(frac * BUCKETS), BUCKETS - 1)
      counts[idx]++
    })
    const maxCount = Math.max(...counts, 1)
    return counts.map((c) => c / maxCount)
  }, [birthtimes, minTime, maxTime])

  // Effect: handle playing animation
  useEffect(() => {
    if (!isPlaying) return
    const startTime = performance.now()
    const startProgress = progressRef.current
    let raf: number
    const tick = (now: number) => {
      const newProgress = Math.min(startProgress + (now - startTime) / playDuration, 1)
      setProgress(newProgress)
      if (newProgress >= 1) {
        setIsPlaying(false)
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [isPlaying, playDuration])

  // Effect: keyboard navigation shortcuts
  useEffect(() => {
    if (viewMode !== 'history') return
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return
      if (e.code === 'Space') {
        e.preventDefault()
        if (progressRef.current >= 1) setProgress(0)
        setIsPlaying((p) => !p)
      } else if (e.code === 'ArrowRight') {
        e.preventDefault()
        setIsPlaying(false)
        setProgress((p) => Math.min(p + 0.01, 1))
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault()
        setIsPlaying(false)
        setProgress((p) => Math.max(p - 0.01, 0))
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [viewMode])

  return {
    progress,
    setProgress,
    isPlaying,
    setIsPlaying,
    playDuration,
    setPlayDuration,
    birthtimes,
    minTime,
    maxTime,
    formattedDate,
    activityBuckets,
    historyTicks
  }
}
