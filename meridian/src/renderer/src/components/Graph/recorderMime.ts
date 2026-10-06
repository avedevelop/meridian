/** Formats to try for the exported graph animation, best first. */
export const RECORDER_MIME_CANDIDATES = [
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm'
] as const

/**
 * Pick a MediaRecorder format the platform can encode.
 * - a string: use it
 * - `undefined`: the recorder exists but reports none of the candidates; let it choose its default
 * - `null`: recording is not available at all
 */
export function pickRecorderMimeType(
  recorder: { isTypeSupported?: (type: string) => boolean } | undefined
): string | undefined | null {
  if (!recorder) return null
  const supported = recorder.isTypeSupported
  if (typeof supported !== 'function') return undefined
  return RECORDER_MIME_CANDIDATES.find((type) => supported.call(recorder, type))
}
