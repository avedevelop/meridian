import { useState, useRef, useEffect, useCallback } from 'react'
import type { D3State } from './graphTypes'

export interface UseGraphRecordingOptions {
  d3Ref: React.RefObject<D3State | null>
  containerRef: React.RefObject<HTMLDivElement | null>
  progress: number
  isPlaying: boolean
  setIsPlaying: (playing: boolean) => void
  setProgress: (progress: number) => void
}

export function useGraphRecording({
  d3Ref,
  containerRef,
  progress,
  isPlaying,
  setIsPlaying,
  setProgress
}: UseGraphRecordingOptions) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const [isRecording, setIsRecording] = useState(false)

  const renderFrameToCanvas = useCallback(() => {
    const state = d3Ref.current
    const canvas = canvasRef.current
    if (!state || !canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const data = new XMLSerializer().serializeToString(state.svgEl)
    const blob = new Blob([data], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      ctx.fillStyle = '#161616'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)
      URL.revokeObjectURL(url)
    }
    img.src = url
  }, [d3Ref])

  useEffect(() => {
    if (isRecording) renderFrameToCanvas()
  }, [progress, isRecording, renderFrameToCanvas])

  useEffect(() => {
    if (isRecording && !isPlaying && progress >= 1) {
      const t = setTimeout(() => mediaRecorderRef.current?.stop(), 600)
      return () => clearTimeout(t)
    }
    return
  }, [isRecording, isPlaying, progress])

  const startRecording = useCallback(() => {
    const el = containerRef.current
    const canvas = canvasRef.current
    if (!el || !canvas) return
    canvas.width = el.clientWidth
    canvas.height = el.clientHeight
    const stream = canvas.captureStream(15)
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' })
    chunksRef.current = []
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }
    recorder.onstop = async () => {
      setIsRecording(false)
      const blob = new Blob(chunksRef.current, { type: 'video/webm' })
      const buf = await blob.arrayBuffer()
      await window.vault.saveVideo(new Uint8Array(buf))
    }
    recorder.start(200)
    mediaRecorderRef.current = recorder
    setIsRecording(true)
    setProgress(0)
    setIsPlaying(true)
  }, [containerRef, setProgress, setIsPlaying])

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop()
    setIsPlaying(false)
  }, [setIsPlaying])

  const cancelRecording = useCallback(() => {
    if (isRecording) {
      mediaRecorderRef.current?.stop()
      setIsRecording(false)
    }
  }, [isRecording])

  return {
    canvasRef,
    isRecording,
    startRecording,
    stopRecording,
    cancelRecording
  }
}
