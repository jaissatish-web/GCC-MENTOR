import { AUDIO_TYPES, type DeliveryMetrics } from './types'

export function canonicalAudioType(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const mime = value.split(';')[0].trim().toLowerCase()
  return AUDIO_TYPES[mime] ? mime : null
}
export function audioHeaderMatches(bytes: Uint8Array, mime: string): boolean {
  if (bytes.length < 12) return false
  if (mime === 'audio/webm') return bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3
  if (mime === 'audio/ogg') return String.fromCharCode(...bytes.slice(0, 4)) === 'OggS'
  return mime === 'audio/mp4' && String.fromCharCode(...bytes.slice(4, 8)) === 'ftyp'
}
export function deliveryMetrics(text: string, duration: number, rawWords: unknown): DeliveryMetrics {
  const words = text.trim().split(/\s+/).filter(Boolean)
  const timestamps = Array.isArray(rawWords) ? rawWords.filter((w): w is { start: number; end: number } =>
    !!w && typeof w === 'object' && Number.isFinite(w.start) && Number.isFinite(w.end) && w.start >= 0 && w.end >= w.start && w.end <= duration + 1,
  ).sort((a, b) => a.start - b.start) : []
  const timingAvailable = timestamps.length > 1
  let pauses = 0
  for (let i = 1; i < timestamps.length; i++) if (timestamps[i].start - timestamps[i - 1].end >= 2) pauses++
  return {
    duration_seconds: Math.round(duration * 10) / 10,
    word_count: words.length,
    words_per_minute: duration > 0 ? Math.round(words.length * 60 / duration) : null,
    long_pause_count: timingAvailable ? pauses : null,
    filler_count: (text.match(/\b(um|uh|erm|hmm)\b/gi) ?? []).length,
    timing_available: timingAvailable,
    note: 'Pace uses total recording time. Pauses use approximate speech timestamps. Transcription may omit fillers. These are practice observations, not confidence, emotion, accent or pronunciation scores.',
  }
}
