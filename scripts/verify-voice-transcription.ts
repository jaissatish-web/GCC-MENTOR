import './resolve-paths'
import { transcribeRecording } from '../lib/voice/transcribe'

async function main() {
  const originalFetch = globalThis.fetch
  const originalKey = process.env.VOICE_STT_API_KEY
  const originalModel = process.env.VOICE_STT_MODEL
  const header = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0, 0, 0, 0, 0, 0, 0, 0])
  const blob = new Blob([header], { type: 'audio/webm' })
  const forms: FormData[] = []
  try {
    process.env.VOICE_STT_API_KEY = 'offline-test-key'
    delete process.env.VOICE_STT_MODEL
    globalThis.fetch = async (_url, options) => {
      forms.push(options?.body as FormData)
      return Response.json({ text: 'I completed the project.' })
    }
    const cheap = await transcribeRecording(blob, 'audio/webm', 'answer.webm', 12)
    if (forms[0].get('model') !== 'gpt-4o-mini-transcribe' || forms[0].get('response_format') !== 'json' || forms[0].has('timestamp_granularities[]')) throw new Error('Mini transcription request uses an unsupported response contract')
    if (cheap.delivery.words_per_minute !== 20 || cheap.delivery.long_pause_count !== null || cheap.delivery.timing_available) throw new Error('Mini transcription reported missing word timestamps as measured pauses')
    process.env.VOICE_STT_MODEL = 'whisper-1'
    globalThis.fetch = async (_url, options) => {
      forms.push(options?.body as FormData)
      return Response.json({ text: 'I completed the project.', duration: 12, words: [{ start: 0, end: 0.5 }, { start: 4, end: 4.5 }] })
    }
    const detailed = await transcribeRecording(blob, 'audio/webm', 'answer.webm', 12)
    if (forms[1].get('model') !== 'whisper-1' || forms[1].get('response_format') !== 'verbose_json' || forms[1].getAll('timestamp_granularities[]').length !== 2) throw new Error('Whisper request lost its timestamp contract')
    if (detailed.delivery.long_pause_count !== 1 || !detailed.delivery.timing_available) throw new Error('Whisper word timestamps were not used for pause observations')
    process.env.VOICE_STT_MODEL = 'gpt-transcribe'
    globalThis.fetch = async (_url, options) => {
      forms.push(options?.body as FormData)
      return Response.json({ text: 'I completed the project.' })
    }
    const supported = await transcribeRecording(blob, 'audio/webm', 'answer.webm', 12)
    if (forms[2].get('model') !== 'gpt-transcribe' || forms[2].get('response_format') !== 'json' || forms[2].has('language') || supported.delivery.timing_available) throw new Error('Replacement model request uses an unsupported response contract')
    console.log('Voice transcription model contracts passed')
  } finally {
    globalThis.fetch = originalFetch
    if (originalKey === undefined) delete process.env.VOICE_STT_API_KEY
    else process.env.VOICE_STT_API_KEY = originalKey
    if (originalModel === undefined) delete process.env.VOICE_STT_MODEL
    else process.env.VOICE_STT_MODEL = originalModel
  }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
