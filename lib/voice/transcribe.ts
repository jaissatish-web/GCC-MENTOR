import { audioHeaderMatches, deliveryMetrics } from './audio'
import { MAX_AUDIO_BYTES, MAX_ANSWER_SECONDS } from './types'

/** Recorded files only. No streaming and no browser speech recognition. */
export async function transcribeRecording(blob: Blob, mime: string, filename: string, recordedSeconds: number) {
  const key = process.env.VOICE_STT_API_KEY
  if (!key) throw new Error('Speech transcription is not configured. Your recording is saved.')
  if (!blob.size || blob.size > MAX_AUDIO_BYTES) throw new Error('Recording size is invalid.')
  if (!audioHeaderMatches(new Uint8Array(await blob.slice(0, 16).arrayBuffer()), mime)) throw new Error('Unsupported recording format.')
  if (!Number.isFinite(recordedSeconds) || recordedSeconds < 0.5 || recordedSeconds > MAX_ANSWER_SECONDS + 5) throw new Error('Recording duration is invalid.')
  // Mini is the lower cost test default. Whisper can be selected when word timestamps are needed.
  const model = process.env.VOICE_STT_MODEL === 'whisper-1' ? 'whisper-1' : 'gpt-4o-mini-transcribe'
  const form = new FormData()
  form.append('file', blob, filename)
  form.append('model', model)
  form.append('response_format', model === 'whisper-1' ? 'verbose_json' : 'json')
  if (model === 'whisper-1') {
    form.append('timestamp_granularities[]', 'word')
    form.append('timestamp_granularities[]', 'segment')
  }
  form.append('language', 'en')
  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: form,
    signal: AbortSignal.timeout(65_000), cache: 'no-store',
  })
  if (!response.ok) throw new Error(response.status === 429 ? 'Speech service is busy. Retry review later; your recording is saved.' : 'Speech transcription failed. Retry review; your recording is saved.')
  const result = await response.json()
  const text = typeof result.text === 'string' ? result.text.trim() : ''
  // The mini JSON response has no duration or word timestamps. Use the saved recording time.
  const duration = model === 'whisper-1' ? Number(result.duration) : recordedSeconds
  if (!text || !Number.isFinite(duration) || duration < 0.5 || duration > MAX_ANSWER_SECONDS + 5) throw new Error('The recording could not be transcribed reliably. Review the audio before retrying.')
  if (text.length > 12000) throw new Error('The transcript exceeds the supported answer length.')
  const segments = Array.isArray(result.segments) ? result.segments : []
  if (model === 'whisper-1' && segments.length && segments.every((s: { no_speech_prob?: number }) => (s.no_speech_prob ?? 0) > 0.8)) throw new Error('No clear speech was detected. Review the saved recording.')
  return { transcript: text, delivery: deliveryMetrics(text, duration, result.words) }
}
