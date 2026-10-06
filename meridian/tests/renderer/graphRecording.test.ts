import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import {
  RECORDER_MIME_CANDIDATES,
  pickRecorderMimeType
} from '../../src/renderer/src/components/Graph/recorderMime'
import { useGraphRecording } from '../../src/renderer/src/components/Graph/useGraphRecording'

describe('pickRecorderMimeType', () => {
  const only = (...types: string[]) => ({ isTypeSupported: (t: string) => types.includes(t) })

  it('prefers VP9, then VP8, then plain webm', () => {
    expect(pickRecorderMimeType(only(...RECORDER_MIME_CANDIDATES))).toBe('video/webm;codecs=vp9')
    expect(pickRecorderMimeType(only('video/webm;codecs=vp8', 'video/webm'))).toBe(
      'video/webm;codecs=vp8'
    )
    expect(pickRecorderMimeType(only('video/webm'))).toBe('video/webm')
  })

  it('lets the recorder choose when it supports none of them or cannot say', () => {
    expect(pickRecorderMimeType(only('video/mp4'))).toBeUndefined()
    expect(pickRecorderMimeType({})).toBeUndefined()
  })

  it('reports that recording is unavailable without a MediaRecorder', () => {
    expect(pickRecorderMimeType(undefined)).toBeNull()
  })

  it('does not lose `this` when calling isTypeSupported', () => {
    const recorder = {
      marker: 'x',
      isTypeSupported(this: { marker?: string }, t: string) {
        return this.marker === 'x' && t === 'video/webm'
      }
    }
    expect(pickRecorderMimeType(recorder)).toBe('video/webm')
  })
})

class FakeRecorder {
  static supported: string[] = ['video/webm;codecs=vp9', 'video/webm']
  static instances: FakeRecorder[] = []
  static throwOnCreate = false
  static isTypeSupported = (t: string) => FakeRecorder.supported.includes(t)
  mimeType: string
  ondataavailable: ((e: { data: Blob }) => void) | null = null
  onstop: (() => void | Promise<void>) | null = null
  onerror: (() => void) | null = null
  started = false
  constructor(
    public stream: unknown,
    public options?: { mimeType?: string }
  ) {
    if (FakeRecorder.throwOnCreate) throw new DOMException('not supported', 'NotSupportedError')
    this.mimeType = options?.mimeType ?? 'video/webm'
    FakeRecorder.instances.push(this)
  }
  start(): void {
    this.started = true
  }
  stop(): void {
    this.ondataavailable?.({ data: new Blob(['frame']) })
    void this.onstop?.()
  }
}

function setup() {
  const stopTrack = vi.fn()
  const canvas = document.createElement('canvas') as HTMLCanvasElement & {
    captureStream: () => unknown
  }
  canvas.captureStream = () => ({ getTracks: () => [{ stop: stopTrack }] })
  const setIsPlaying = vi.fn()
  const setProgress = vi.fn()
  const saveVideo = vi.fn(async () => '/x.webm')
  ;(window as unknown as { vault: unknown }).vault = { saveVideo }
  const { result } = renderHook(() =>
    useGraphRecording({
      d3Ref: { current: null },
      containerRef: { current: { clientWidth: 400, clientHeight: 300 } as HTMLDivElement },
      progress: 0,
      isPlaying: false,
      setIsPlaying,
      setProgress
    })
  )
  ;(result.current.canvasRef as { current: HTMLCanvasElement | null }).current = canvas
  return { result, stopTrack, setIsPlaying, saveVideo }
}

beforeEach(() => {
  FakeRecorder.instances = []
  FakeRecorder.supported = ['video/webm;codecs=vp9', 'video/webm']
  FakeRecorder.throwOnCreate = false
  vi.stubGlobal('MediaRecorder', FakeRecorder)
})
afterEach(() => vi.unstubAllGlobals())

describe('useGraphRecording', () => {
  it('records with the best supported format and saves the video on stop', async () => {
    const { result, saveVideo, stopTrack } = setup()
    act(() => result.current.startRecording())
    expect(result.current.isRecording).toBe(true)
    expect(result.current.recordingError).toBeNull()
    expect(FakeRecorder.instances[0].options).toEqual({ mimeType: 'video/webm;codecs=vp9' })

    await act(async () => FakeRecorder.instances[0].stop())
    expect(saveVideo).toHaveBeenCalledTimes(1)
    expect(saveVideo.mock.calls[0][0]).toBeInstanceOf(Uint8Array)
    expect(stopTrack).toHaveBeenCalled()
    expect(result.current.isRecording).toBe(false)
    expect(result.current.recordingError).toBeNull()
  })

  it('falls back to VP8 when VP9 is not available', () => {
    FakeRecorder.supported = ['video/webm;codecs=vp8']
    const { result } = setup()
    act(() => result.current.startRecording())
    expect(FakeRecorder.instances[0].options).toEqual({ mimeType: 'video/webm;codecs=vp8' })
  })

  it('lets the browser choose when none of the formats is reported as supported', () => {
    FakeRecorder.supported = []
    const { result } = setup()
    act(() => result.current.startRecording())
    expect(FakeRecorder.instances[0].options).toBeUndefined()
    expect(result.current.isRecording).toBe(true)
  })

  it('reports "unsupported" instead of throwing when the recorder cannot be created', () => {
    FakeRecorder.throwOnCreate = true
    const { result } = setup()
    expect(() => act(() => result.current.startRecording())).not.toThrow()
    expect(result.current.recordingError).toBe('unsupported')
    expect(result.current.isRecording).toBe(false)
  })

  it('reports "unsupported" when there is no MediaRecorder at all', () => {
    vi.stubGlobal('MediaRecorder', undefined)
    const { result } = setup()
    act(() => result.current.startRecording())
    expect(result.current.recordingError).toBe('unsupported')
    expect(result.current.isRecording).toBe(false)
  })

  it('stops playback and reports an error when the recorder fails mid-way', () => {
    const { result, setIsPlaying, stopTrack } = setup()
    act(() => result.current.startRecording())
    act(() => FakeRecorder.instances[0].onerror?.())
    expect(result.current.recordingError).toBe('failed')
    expect(result.current.isRecording).toBe(false)
    expect(setIsPlaying).toHaveBeenLastCalledWith(false)
    expect(stopTrack).toHaveBeenCalled()
  })

  it('reports "saveFailed" when saving the file fails, without an unhandled rejection', async () => {
    const { result, saveVideo } = setup()
    saveVideo.mockRejectedValueOnce(new Error('EACCES'))
    act(() => result.current.startRecording())
    await act(async () => FakeRecorder.instances[0].stop())
    expect(result.current.recordingError).toBe('saveFailed')
    expect(result.current.isRecording).toBe(false)
  })

  it('clears a previous error when recording starts again', () => {
    FakeRecorder.throwOnCreate = true
    const { result } = setup()
    act(() => result.current.startRecording())
    expect(result.current.recordingError).toBe('unsupported')
    FakeRecorder.throwOnCreate = false
    act(() => result.current.startRecording())
    expect(result.current.recordingError).toBeNull()
    expect(result.current.isRecording).toBe(true)
  })
})
