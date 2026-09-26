'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { draftOperation, type RecordingDraft } from '@/lib/voice/localDraft'
import { MAX_ANSWER_SECONDS, MAX_AUDIO_BYTES, SILENCE_SECONDS } from '@/lib/voice/types'

export function useRecorder(key: string) {
  const [state, setState] = useState<'idle' | 'recording' | 'paused' | 'ready'>('idle')
  const [draft, setDraft] = useState<RecordingDraft | null>(null)
  const [seconds, setSeconds] = useState(0)
  const [level, setLevel] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const recorder = useRef<MediaRecorder | null>(null)
  const stream = useRef<MediaStream | null>(null)
  const audioContext = useRef<AudioContext | null>(null)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const accumulated = useRef(0)
  const activeStart = useRef(0)
  const draftRef = useRef<RecordingDraft | null>(null)
  const stopResolve = useRef<((value: RecordingDraft) => void) | null>(null)
  const mounted = useRef(true)
  const pending = useRef(false)
  const duration = useCallback(() => accumulated.current + (recorder.current?.state === 'recording' ? (Date.now() - activeStart.current) / 1000 : 0), [])
  const stopDevices = useCallback(() => {
    if (timer.current) clearInterval(timer.current)
    stream.current?.getTracks().forEach(t => t.stop())
    stream.current = null
    void audioContext.current?.close().catch(() => {})
    audioContext.current = null
  }, [])
  const pause = useCallback(() => {
    if (recorder.current?.state !== 'recording') return
    accumulated.current = duration()
    recorder.current.pause()
    setState('paused'); setLevel(0)
  }, [duration])
  const finish = useCallback(async (): Promise<RecordingDraft | null> => {
    const r = recorder.current
    if (!r || r.state === 'inactive') return draftRef.current
    accumulated.current = duration()
    return new Promise(resolve => { stopResolve.current = resolve; r.stop() })
  }, [duration])
  useEffect(() => {
    mounted.current = true
    let disposed = false
    void draftOperation(key, 'read').then(saved => {
      if (!disposed && saved?.blob.size) { draftRef.current = saved; setDraft(saved); setSeconds(saved.duration); setState('ready') }
    }).catch(() => {})
    const visibility = () => { if (document.hidden) pause() }
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (recorder.current?.state !== undefined && recorder.current.state !== 'inactive') { e.preventDefault(); e.returnValue = '' }
    }
    document.addEventListener('visibilitychange', visibility)
    window.addEventListener('beforeunload', beforeUnload)
    return () => {
      disposed = true; mounted.current = false
      document.removeEventListener('visibilitychange', visibility)
      window.removeEventListener('beforeunload', beforeUnload)
      if (recorder.current && recorder.current.state !== 'inactive') { accumulated.current = duration(); recorder.current.stop() }
      stopDevices()
    }
  }, [key, pause, duration, stopDevices])

  const start = useCallback(async () => {
    if (pending.current) return
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') { setError('This browser cannot record audio. Try a recent browser over HTTPS.'); return }
    if (recorder.current?.state === 'recording') return
    if (recorder.current?.state === 'paused') { activeStart.current = Date.now(); recorder.current.resume(); setState('recording'); return }
    pending.current = true; setError(null)
    try {
      window.speechSynthesis?.cancel()
      const media = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false })
      if (!mounted.current) { media.getTracks().forEach(t => t.stop()); return }
      stream.current = media
      const mime = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus'].find(t => MediaRecorder.isTypeSupported(t))
      if (!mime) throw new Error('No supported recording format. Please try another browser.')
      const r = new MediaRecorder(media, { mimeType: mime, audioBitsPerSecond: 64000 })
      recorder.current = r
      const chunks: Blob[] = []
      let bytes = 0
      accumulated.current = 0; activeStart.current = Date.now(); draftRef.current = null; setDraft(null); setSeconds(0)
      r.ondataavailable = e => {
        if (!e.data.size) return
        chunks.push(e.data); bytes += e.data.size
        if (bytes > MAX_AUDIO_BYTES && r.state !== 'inactive') { setError('Recording reached the size limit.'); void finish() }
      }
      r.onstop = () => {
        const value = { blob: new Blob(chunks, { type: r.mimeType }), duration: accumulated.current }
        draftRef.current = value
        // Never clear a recoverable recording until the server confirms it is saved.
        void draftOperation(key, 'write', value).catch(() => { if (mounted.current) setError('Local recovery is unavailable. Keep this page open until the answer is saved.') })
        if (mounted.current) { setDraft(value); setState('ready'); setLevel(0) }
        stopDevices(); stopResolve.current?.(value); stopResolve.current = null
      }
      r.onerror = () => { setError('Recording was interrupted. Listen to the recovered audio before submitting.'); if (r.state !== 'inactive') void finish() }
      media.getAudioTracks().forEach(t => { t.onended = () => { if (r.state !== 'inactive') { setError('Microphone disconnected. Check the recovered recording.'); void finish() } } })
      r.start(1000); setState('recording')
      // Energy is used only to pause on silence. No answer evaluation happens here.
      const context = new AudioContext(); audioContext.current = context
      await context.resume()
      const analyser = context.createAnalyser(); analyser.fftSize = 1024
      context.createMediaStreamSource(media).connect(analyser)
      const samples = new Float32Array(analyser.fftSize)
      let lastSpeech = Date.now(); let voicedFrames = 0; let wasPaused = false
      timer.current = setInterval(() => {
        if (r.state !== 'recording') { wasPaused = true; return }
        if (wasPaused) { lastSpeech = Date.now(); wasPaused = false }
        analyser.getFloatTimeDomainData(samples)
        const rms = Math.sqrt(samples.reduce((sum, n) => sum + n * n, 0) / samples.length)
        setLevel(Math.min(1, rms * 8)); setSeconds(duration())
        if (rms > 0.015) { lastSpeech = Date.now(); voicedFrames++ }
        if (duration() >= MAX_ANSWER_SECONDS) { void finish(); return }
        if (voicedFrames >= 3 && Date.now() - lastSpeech >= SILENCE_SECONDS * 1000) pause()
      }, 200)
    } catch (e) {
      if (recorder.current && recorder.current.state !== 'inactive') void finish()
      else stopDevices()
      setError(e instanceof Error && e.name === 'NotAllowedError' ? 'Allow microphone access in your browser settings, then try again.' : e instanceof Error ? e.message : 'Could not start the microphone.')
    } finally { pending.current = false }
  }, [key, pause, finish, duration, stopDevices])
  const clear = useCallback(async () => { await draftOperation(key, 'delete').catch(() => {}); draftRef.current = null; setDraft(null); setState('idle'); setSeconds(0) }, [key])
  return { state, draft, seconds, level, error, start, pause, finish, clear }
}
