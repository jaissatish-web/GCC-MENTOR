'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'
import { VOICE_BUCKET, type VoiceSessionView, type VoiceAnswer } from '@/lib/voice/types'
import { draftOperation } from '@/lib/voice/localDraft'
import type { MockInterviewRun } from '@/types/package'
import { Interviewer } from './Interviewer'
import { CallOrb, REVIEWING_LINES } from './CallOrb'
import { useRecorder } from './useRecorder'

async function jsonRequest(url: string, body?: Record<string, unknown>) {
  const response = await fetch(url, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : { cache: 'no-store' })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || 'Could not reach the interview service. Please retry.')
  return payload
}
function Recording({ api, draftKey, questionId, onSaved, onRecording, room = false }: { api: string; draftKey: string; questionId: string; onSaved: () => Promise<void>; onRecording: (active: boolean) => void; room?: boolean }) {
  const recorder = useRecorder(draftKey)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const uploading = useRef(false)
  useEffect(() => { onRecording(recorder.state === 'recording' || recorder.state === 'paused'); return () => onRecording(false) }, [recorder.state, onRecording])
  useEffect(() => {
    if (!recorder.draft) { setUrl(null); return }
    const url = URL.createObjectURL(recorder.draft.blob); setUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [recorder.draft])
  async function submit() {
    if (uploading.current) return
    uploading.current = true; setBusy(true); setError(null)
    try {
      const draft = await recorder.finish()
      if (!draft?.blob.size || draft.duration < 0.5) throw new Error('Record an answer before submitting.')
      const mime = draft.blob.type.split(';')[0]
      const upload = await jsonRequest(api, { action: 'prepare', questionId, mimeType: mime })
      if (!upload.alreadySaved) {
        const { error: uploadError } = await createClient().storage.from(VOICE_BUCKET).uploadToSignedUrl(upload.path, upload.token, draft.blob, { contentType: mime })
        // A lost successful upload reply can yield an object-exists error. The server verifies the stored object either way.
        try { await jsonRequest(api, { action: 'save', questionId, durationSeconds: draft.duration }) }
        catch (e) { if (uploadError) throw new Error('Upload was interrupted. Your recording is kept on this device; retry Submit answer.'); throw e }
      }
      await recorder.clear(); await onSaved()
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save the recording.') }
    finally { uploading.current = false; setBusy(false) }
  }
  return <div className={`space-y-2.5 rounded-2xl border border-line bg-white p-3 sm:space-y-4 sm:p-5 ${room ? 'shrink-0 shadow-[0_10px_35px_rgba(7,42,45,.08)]' : ''}`}>
    <div className="flex items-center justify-between text-sm"><strong>{recorder.state === 'recording' ? 'Recording your answer' : recorder.state === 'paused' ? 'Recording paused' : recorder.state === 'ready' ? 'Listen, then submit' : 'Ready when you are'}</strong><span className="font-mono">{Math.floor(recorder.seconds / 60)}:{String(Math.floor(recorder.seconds % 60)).padStart(2, '0')} / 3:00</span></div>
    <div className="h-2 overflow-hidden rounded bg-canvas" role="meter" aria-label="Microphone activity" aria-valuenow={Math.round(recorder.level * 100)} aria-valuemin={0} aria-valuemax={100}><div className="h-full bg-teal" style={{ width: `${recorder.level * 100}%` }} /></div>
    {recorder.state === 'paused' && <p className="text-sm text-ink-muted">A pause or interruption was detected. Resume when ready, or submit the answer you have recorded.</p>}
    {url && <audio controls src={url} className="w-full" aria-label="Listen to your unsaved answer" />}
    <div className="flex flex-wrap gap-2">
      {(recorder.state === 'idle' || recorder.state === 'paused') && <Button type="button" variant="primary" onClick={() => void recorder.start()} disabled={busy}>{recorder.state === 'paused' ? 'Resume speaking' : 'Start speaking'}</Button>}
      {recorder.state === 'recording' && <Button type="button" variant="secondary" onClick={recorder.pause} disabled={busy}>Pause</Button>}
      {(recorder.state === 'recording' || recorder.state === 'paused') && <Button type="button" variant="secondary" onClick={() => void recorder.finish()} disabled={busy}>Stop &amp; listen</Button>}
      {recorder.state === 'ready' && <Button type="button" variant="secondary" onClick={() => void recorder.start()} disabled={busy}>Record again</Button>}
      {recorder.state !== 'idle' && <Button type="button" variant="primary" onClick={() => void submit()} busy={busy} busyLabel="Saving…">Submit answer</Button>}
    </div>
    <p className={`${room ? 'hidden sm:block' : ''} text-xs text-ink-muted sm:text-sm`}>Seven seconds of silence pauses recording after you begin speaking. No answer is graded now. Recordings are stored privately for your requested review.</p>
    {(error || recorder.error) && <p role="alert" className="text-sm text-alert">{error || recorder.error}</p>}
  </div>
}
function SavedAudio({ api, questionId, expiresAt, deletedAt }: { api: string; questionId: string; expiresAt?: string; deletedAt?: string | null }) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState('')
  const expired = Boolean(deletedAt || (expiresAt && new Date(expiresAt).getTime() <= Date.now()))
  if (expired) return <p className="mt-3 rounded-ctl bg-canvas px-3 py-2 text-xs text-ink-muted">Recording expired after three days. Your transcript and coaching report remain available.</p>
  return <div className="mt-3">{url ? <audio controls src={url} className="w-full" aria-label="Saved answer recording" onError={() => { setUrl(null); setError('Playback link expired. Open it again.') }} /> : <Button type="button" variant="secondary" size="sm" onClick={() => { setError(''); void jsonRequest(api, { action: 'playback', questionId }).then(p => setUrl(p.url)).catch(e => setError(e.message)) }}>Listen to saved answer</Button>}{expiresAt ? <p className="mt-2 text-xs text-ink-muted">Audio available until {new Date(expiresAt).toLocaleString()}.</p> : null}{error && <p role="alert" className="text-sm text-alert">{error}</p>}</div>
}
function AnswerReview({ answer, question, api }: { answer: VoiceAnswer; question: string; api: string }) {
  return <details className="rounded-xl border border-line bg-white p-4"><summary className="cursor-pointer font-semibold">{question}</summary><SavedAudio api={api} questionId={answer.question_id} expiresAt={answer.audio_delete_after} deletedAt={answer.audio_deleted_at} />
    <h4 className="mt-4 font-semibold">Your transcript</h4><p className="mt-2 whitespace-pre-wrap text-sm">{answer.transcript}</p><p className="mt-1 text-xs text-ink-muted">Automatically transcribed. Check against the recording if feedback seems unexpected.</p>
    {answer.feedback && <><h4 className="mt-4 font-semibold">What went well and what to improve · {answer.feedback.score}/10</h4><p className="mt-2 text-sm whitespace-pre-wrap">{answer.feedback.feedback}</p><h4 className="mt-4 font-semibold">A stronger answer to practise</h4><p className="mt-2 text-sm whitespace-pre-wrap">{answer.feedback.better_answer}</p><h4 className="mt-4 font-semibold">Wording to improve</h4>{answer.feedback.grammar.length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{answer.feedback.grammar.map((g, i) => <li key={i}>{g}</li>)}</ul> : <p className="mt-2 text-sm">No specific wording correction identified.</p>}{answer.feedback.follow_up && <><h4 className="mt-4 font-semibold">Practise next</h4><p className="mt-2 text-sm">{answer.feedback.follow_up}</p></>}</>}
    {answer.delivery && <><h4 className="mt-4 font-semibold">Speaking observations</h4><p className="mt-2 text-sm">{answer.delivery.words_per_minute ?? '—'} words/min · {answer.delivery.long_pause_count ?? 'Unavailable'} pauses of 2+ seconds · {answer.delivery.filler_count} transcribed fillers</p><p className="mt-2 text-xs text-ink-muted">{answer.delivery.note}</p></>}
  </details>
}
export function VoiceInterview({ packageId, run, onUpdated, room = false }: { packageId: string; run: MockInterviewRun; onUpdated: () => void; room?: boolean }) {
  const api = `/api/packages/${encodeURIComponent(packageId)}/mock-interview/${encodeURIComponent(run.id)}/voice`
  const [view, setView] = useState<VoiceSessionView | null>(null)
  const [index, setIndex] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [recording, setRecording] = useState(false)
  const [busy, setBusy] = useState(false)
  const [deleted, setDeleted] = useState(false)
  // The calm reviewing screen shows the moment Review is pressed, not after the request returns.
  const [requested, setRequested] = useState(false)
  const updateRef = useRef(onUpdated); updateRef.current = onUpdated
  const completionNotified = useRef(false)
  const retryCount = useRef(0)
  const failedResumes = useRef(0)
  const reload = useCallback(async () => {
    const result = await jsonRequest(api) as VoiceSessionView
    setView(result)
    setIndex(current => current ?? Math.max(0, run.questions.findIndex(q => !result.answers.some(a => a.question_id === q.id && a.saved_at))))
    if (result.status === 'completed' && !completionNotified.current) { completionNotified.current = true; updateRef.current() }
    if (result.status === 'failed') setError(result.last_error || 'Review paused. Your completed answers are saved.')
    return result
  }, [api, run.questions])
  useEffect(() => { void reload().catch(e => setError(e.message)) }, [reload])
  const reviewing = view?.status === 'queued' || view?.status === 'processing'
  useEffect(() => {
    if (!reviewing) return
    let stopped = false
    let timer: ReturnType<typeof setTimeout>
    async function step() {
      try {
        await jsonRequest(api, { action: 'process' })
        if (!stopped) { await reload(); retryCount.current = 0; setError(null) }
      } catch (e) {
        if (!stopped) { retryCount.current++; setError(e instanceof Error ? e.message : 'Connection interrupted. Retrying saved review…') }
      }
      // Straight on after a saved step; back off only after errors (2026-10-03).
      if (!stopped) timer = setTimeout(() => void step(), retryCount.current ? Math.min(15000, 3000 * retryCount.current) : 800)
    }
    void step()
    return () => { stopped = true; clearTimeout(timer) }
  }, [reviewing, api, reload])
  useEffect(() => {
    if (view?.status !== 'failed' || failedResumes.current >= 2) return
    const timer = setTimeout(() => {
      failedResumes.current++
      void jsonRequest(api, { action: 'review' }).then(() => reload()).catch(e => setError(e instanceof Error ? e.message : 'Review paused. Retry when ready.'))
    }, 8000 * (failedResumes.current + 1))
    return () => clearTimeout(timer)
  }, [view?.status, api, reload])
  async function review() {
    setBusy(true); setError(null); setRequested(true)
    try { await jsonRequest(api, { action: 'review' }); await reload() }
    catch (e) { setRequested(false); setError(e instanceof Error ? e.message : 'Could not start review.') }
    finally { setBusy(false) }
  }
  async function remove() {
    if (!window.confirm('Delete this interview, its recordings and report?')) return
    setBusy(true); setError(null)
    try {
      await jsonRequest(api, { action: 'delete' })
      await Promise.all(run.questions.map(q => draftOperation(`gcc.voice.${packageId}.${run.id}.${q.id}`, 'delete').catch(() => {})))
      setDeleted(true); updateRef.current()
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not delete this interview.') }
    finally { setBusy(false) }
  }
  if (deleted || view?.status === 'deleting') return <p className="mt-6">Interview deleted.</p>
  if (!view) return <div className="flex flex-1 flex-col items-center justify-center gap-4 p-5"><p role={error ? 'alert' : 'status'}>{error || 'Loading saved recordings…'}</p>{error && <Button onClick={() => { setError(null); void reload().catch(e => setError(e.message)) }}>Retry</Button>}</div>
  const saved = view.answers.filter(a => a.saved_at).length
  const question = run.questions[index ?? 0]
  const currentAnswer = view.answers.find(a => a.question_id === question?.id)
  const savedCurrent = Boolean(currentAnswer?.saved_at)
  const allSaved = saved === run.questions.length
  const showReviewing = reviewing || (requested && view.status === 'recording' && allSaved)
  return <section className={room ? `flex min-h-0 w-full flex-1 flex-col gap-2 p-2 sm:gap-3 sm:p-4 ${view.status === 'recording' && !allSaved ? 'overflow-hidden' : 'overflow-y-auto'}` : 'mt-6 space-y-5'} aria-label="Recorded voice interview">
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 px-1"><h2 className="text-sm font-semibold text-ink sm:text-xl">{view.status === 'completed' ? 'Your recorded interview review' : showReviewing ? 'Reviewing your interview' : `Question ${Math.min((index ?? 0) + 1, run.questions.length)} of ${run.questions.length} · ${saved} saved`}</h2><Button variant="ghost" size="sm" onClick={() => void remove()} disabled={busy || recording || reviewing}>Delete interview</Button></div>
    {error && <p role="alert" className="rounded-lg bg-alert-soft p-3 text-sm text-alert">{error}</p>}
    {view.status === 'recording' && question && !allSaved && <div className={room ? 'flex min-h-0 flex-1 flex-col gap-2 md:grid md:grid-cols-[1.15fr_1fr] md:gap-4' : 'grid gap-5 lg:grid-cols-[1.15fr_1fr]'}>
      <div className={room ? 'h-[34dvh] min-h-[124px] max-h-[320px] shrink-0 md:h-full md:max-h-none' : 'min-h-[280px]'}><Interviewer interviewerId={run.interviewer_id} recording={recording} /></div>
      <div className={room ? 'flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto md:justify-center md:gap-5' : 'space-y-4'}><div className={`min-h-0 overflow-y-auto rounded-2xl border border-line bg-white p-3 sm:p-5 ${room ? 'flex-1 md:flex-none md:max-h-[40vh]' : ''}`}><p className="text-xs font-semibold text-teal sm:text-sm">Question {(index ?? 0) + 1} of {run.questions.length} · {question.focus}</p><h3 className="mt-2 text-base font-semibold leading-snug text-ink sm:mt-3 sm:text-xl sm:leading-relaxed">{question.question}</h3></div>
        {savedCurrent ? <div className="shrink-0 rounded-2xl bg-teal-soft p-3 sm:p-5"><p className="font-semibold">Recording saved. No grading yet.</p><SavedAudio api={api} questionId={question.id} expiresAt={currentAnswer?.audio_delete_after} deletedAt={currentAnswer?.audio_deleted_at} /><Button className="mt-3" onClick={() => setIndex(run.questions.findIndex(q => !view.answers.some(a => a.question_id === q.id && a.saved_at)))}>Next question</Button></div> : <Recording room={room} key={question.id} api={api} draftKey={`gcc.voice.${packageId}.${run.id}.${question.id}`} questionId={question.id} onSaved={async () => { await reload() }} onRecording={setRecording} />}
      </div>
    </div>}
    {view.status === 'recording' && allSaved && !showReviewing && <div className="rounded-2xl border border-line bg-white p-5"><h3 className="text-xl font-semibold">Your interview is complete</h3><p className="mt-2 text-sm text-ink-muted">Listen to your saved answers below. Audio is kept for three days; transcripts and reports remain. Transcription and grading begin only when you request review.</p><Button className="mt-4" onClick={() => void review()} busy={busy} busyLabel="Starting review…">Review my interview</Button><div className="mt-5 space-y-3">{run.questions.map((q, i) => { const answer = view.answers.find(a => a.question_id === q.id); return <details key={q.id} className="rounded-lg border border-line p-3"><summary className="cursor-pointer">Question {i + 1}: {q.question}</summary><SavedAudio api={api} questionId={q.id} expiresAt={answer?.audio_delete_after} deletedAt={answer?.audio_deleted_at} /></details> })}</div></div>}
    {showReviewing && <div className="rounded-2xl border border-line bg-white">
      <CallOrb
        label="Reviewing"
        title="Thank you. We will get back to you very soon."
        lines={REVIEWING_LINES}
        detail={view.answers.every(a => a.feedback) ? `All ${run.questions.length} answers reviewed · writing your report` : `${view.answers.filter(a => a.feedback).length} of ${run.questions.length} answers reviewed`}
      />
    </div>}
    {view.status === 'failed' && <div role="alert" className="rounded-xl bg-alert-soft p-5"><p>{view.last_error || 'Review was interrupted. Your recordings are saved.'}</p><Button className="mt-3" onClick={() => void review()} busy={busy}>Retry review</Button></div>}
    {view.status === 'completed' && <>{run.final_report && <div className="rounded-2xl bg-teal-soft p-5"><h3 className="text-xl font-semibold">Your next three improvements</h3><ol className="mt-3 list-decimal space-y-2 pl-5">{run.final_report.improvement_plan.slice(0, 3).map((p, i) => <li key={i}>{p}</li>)}</ol><p className="mt-3 text-sm">Practise these points, then start another interview with the same settings to track your progress.</p></div>}<div className="space-y-3">{run.questions.map(q => { const a = view.answers.find(a => a.question_id === q.id); return a ? <AnswerReview key={q.id} answer={a} question={q.question} api={api} /> : null })}</div></>}
  </section>
}
