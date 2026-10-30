/** Actual review/helper/playback paths with synthetic DB, Storage and AI; never uses live services. */
import './resolve-paths'
import assert from 'node:assert/strict'
import type { VoiceAnswer, VoiceSession } from '../lib/voice/types'

type Row = Record<string, any>
const originalFetch = globalThis.fetch
const originalTimeout = globalThis.setTimeout
const TRANSCRIPT = 'I checked the instrument and recorded the calibration result.'
const SILENT = '[No clear speech was detected in this recording.]'
const feedback = { score: 7, feedback: 'Relevant explanation of calibration.', better_answer: TRANSCRIPT, follow_up: null, grammar: [] }
const report = { overall_score: 70, technical_score: 70, role_fit_score: 70, gulf_readiness_score: 70, answer_structure_score: 70, strengths: ['Explains calibration'], weak_points: ['Give more detail'], risky_answers: [], improvement_plan: ['Practise', 'Explain', 'Review'], next_practice_questions: ['How do you calibrate?'], executive_summary: 'Continue practising.', priority_focus: 'Explain the result', score_explanations: { technical: 'Relevant', role_fit: 'Relevant', gulf_readiness: 'Relevant', answer_structure: 'Relevant' } }
let state: ReturnType<typeof fixture>
function fixture() {
  const questions = Array.from({ length: 5 }, (_, i) => ({ id: `q${i}`, category: 'technical', focus: 'Calibration', question: 'Explain calibration.', ideal_answer_points: ['Explain your real work'], answer: null }))
  const run: Row = { id: 'session', input_mode: 'voice', status: 'in_progress', mode: 'mixed', difficulty: 'standard', question_count: 5, questions }
  const profile = { full_name: 'Synthetic candidate', professional_summary: TRANSCRIPT, work_experience: [], skills: [], certifications: [], education: [], additional_information: [] }
  const session: Row = { id: 'session', user_id: 'owner', package_id: 'package', status: 'processing', lease_token: 'lease', lease_until: new Date(Date.now() + 240000).toISOString(), attempts: 1, run_snapshot: run, profile_snapshot: profile }
  const answers: Row[] = questions.map((q, i) => ({ session_id: 'session', question_id: q.id, audio_path: `owner/session/${q.id}.webm`, mime_type: 'audio/webm', saved_at: new Date().toISOString(), duration_seconds: 12, byte_size: 16, transcript: i ? TRANSCRIPT : null, delivery: null, feedback: i ? feedback : null, audio_deleted_at: i ? new Date().toISOString() : null, audio_delete_after: new Date(Date.now() + 259200000).toISOString() }))
  return { session, answers, package: { id: 'package', user_id: 'owner', mock_interview_runs: [structuredClone(run)] }, queue: [] as Row[], objects: new Set(['owner/session/q0.webm']), events: [] as string[], tables: [] as string[], stt: 0, sttByPath: {} as Record<string, number>, failSttFor: '', feedbackCalls: 0, reportCalls: 0, signedUrls: 0, removes: 0, failStt: false, noSpeech: false, failPersist: false, zeroPersist: false, failReadback: false, failQueue: false, failDue: false, zeroDue: false, failRemove: false, hangRemove: false, missingRemove: false, failMark: false, failReport: false, failFeedback: false, leaseReads: 0, expireAtLeaseRead: 0 }
}
function reset() { state = fixture(); return state }
function cache(path: string, exports: Row) {
  const id = require.resolve(path)
  require.cache[id] = { id, filename: id, loaded: true, exports } as NodeModule
}
const db = {
  from(table: string) {
    state.tables.push(table)
    assert.ok(['voice_interview_sessions', 'voice_interview_answers', 'voice_audio_cleanup', 'packages'].includes(table), `unexpected data read: ${table}`)
    const filters: Array<[string, string, unknown]> = []
    let update: Row | null = null
    let upsert: Row | null = null
    const result = () => {
      if (table === 'voice_interview_sessions' && !update) {
        state.leaseReads++
        if (state.expireAtLeaseRead && state.leaseReads >= state.expireAtLeaseRead) state.session.lease_until = new Date(Date.now() - 1000).toISOString()
      }
      let rows: Row[] = table === 'voice_interview_sessions' ? [state.session] : table === 'voice_interview_answers' ? state.answers : table === 'packages' ? [state.package] : state.queue
      rows = rows.filter(row => filters.every(([op, key, value]) => op === 'gt' ? String(row[key]) > String(value) : op === 'is' ? row[key] === value : row[key] === value))
      if (upsert) {
        state.events.push('queue')
        if (state.failQueue) return { data: null, error: { message: 'queue unavailable' } }
        const existing = state.queue.find(q => q.audio_path === upsert!.audio_path)
        if (existing) Object.assign(existing, upsert); else state.queue.push({ ...upsert })
        return { data: { ...upsert }, error: null }
      }
      if (table === 'voice_interview_answers' && !update && state.failReadback) return { data: null, error: { message: 'read unavailable' } }
      if (update) {
        if ('transcript' in update) {
          state.events.push('persist-transcript')
          if (state.failPersist) return { data: null, error: { message: 'save unavailable' } }
          if (state.zeroPersist) return { data: null, error: null }
        }
        if ('audio_delete_after' in update) {
          state.events.push('due')
          if (state.failDue) return { data: null, error: { message: 'deadline unavailable' } }
          if (state.zeroDue) return { data: null, error: null }
        }
        if ('audio_deleted_at' in update) {
          state.events.push('mark')
          if (state.failMark) return { data: null, error: { message: 'marker unavailable' } }
        }
        if ('feedback' in update && !('transcript' in update)) state.events.push('persist-feedback')
        for (const row of rows) Object.assign(row, update)
      }
      return { data: rows[0] ? structuredClone(rows[0]) : null, error: null }
    }
    const q = {
      select: (_columns?: string) => q,
      eq: (key: string, value: unknown) => { filters.push(['eq', key, value]); return q },
      gt: (key: string, value: unknown) => { filters.push(['gt', key, value]); return q },
      is: (key: string, value: unknown) => { filters.push(['is', key, value]); return q },
      update: (value: Row) => { update = value; return q },
      upsert: (value: Row) => { upsert = value; return q },
      maybeSingle: async () => result(), single: async () => result(),
      then: (resolve: (value: Row) => unknown, reject: (error: unknown) => unknown) => Promise.resolve(result()).then(resolve, reject),
    }
    return q
  },
  rpc: async (name: string, args: Row) => {
    assert.equal(name, 'voice_claim_review')
    assert.equal(args.p_user_id, 'owner'); assert.equal(args.p_session_id, 'session')
    state.session.status = 'processing'; state.session.lease_token = 'lease'; state.session.lease_until = new Date(Date.now() + 240000).toISOString()
    return { data: structuredClone(state.session), error: null }
  },
  storage: { from(bucket: string) {
    assert.equal(bucket, 'mock-interview-audio')
    return {
      download: async (path: string) => {
        state.events.push('download')
        assert.ok(state.objects.has(path), 'worker redownloaded removed audio')
        return { data: new Blob([new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0, 0, 0, 0, 0, 0, 0, Number(path.match(/q(\d+)\.webm$/)?.[1] ?? 0)])], { type: 'audio/webm' }), error: null }
      },
      remove: async (paths: string[]) => {
        state.events.push('remove'); state.removes++
        assert.equal(state.answers[0].transcript, TRANSCRIPT, 'removed before durable real transcript')
        assert.ok(state.queue.some(q => q.audio_path === paths[0]), 'removed without delayed protection')
        if (state.hangRemove) return new Promise<never>(() => undefined)
        if (state.failRemove) return { error: { message: 'storage unavailable', statusCode: 500 } }
        for (const p of paths) state.objects.delete(p)
        return { error: state.missingRemove ? { message: 'Object not found', statusCode: 404 } : null }
      },
      createSignedUrl: async () => { state.signedUrls++; return { data: { signedUrl: 'https://fixture.test/audio' }, error: null } },
    }
  } },
}
cache('../lib/voice/server.ts', {
  voiceAdmin: () => db,
  voiceAnswers: async () => structuredClone(state.answers),
  voiceEnabled: () => true,
  voiceTranscriptionAuth: async () => ({ provider: 'openrouter', apiKey: 'offline-only' }),
  transcriptionReady: async () => true,
  ownVoiceSession: async () => ({ session: structuredClone(state.session), user: { id: 'owner' } }),
})
cache('../lib/ai/serviceGuard.ts', { reserveAiAction: async () => ({ ok: true, finish: async () => undefined }) })
cache('../lib/rateLimit.ts', { incrementRateLimit: async () => undefined, LIMIT_ACTION_MOCK_TRANSCRIPTION: 'transcribe', LIMIT_ACTION_MOCK_ANSWER: 'answer', LIMIT_ACTION_MOCK_REPORT: 'report' })
cache('../lib/resumeParse/pipeline.ts', { FAST_HOSTS: [] })
class FixtureAiTaskError extends Error {}
cache('../lib/ai/runTask.ts', { AiTaskError: FixtureAiTaskError, runAiTask: async (task: Row) => {
  if (task.route.includes('final-review')) {
    state.reportCalls++; state.events.push('report')
    if (state.failReport) throw new Error('fixture report unavailable')
    return { value: structuredClone(report) }
  }
  state.feedbackCalls++; state.events.push('feedback')
  if (state.failFeedback) throw new Error('fixture coaching unavailable')
  return { value: structuredClone(feedback) }
} })
cache('../lib/packages/serverWrites.ts', {
  recordMockAnswerAtomic: async (args: Row) => {
    const question = state.package.mock_interview_runs[0].questions.find((q: Row) => q.id === args.questionId)
    assert.ok(question, 'answer belongs to the fixture run')
    Object.assign(question, args.fields)
    return { status: 'saved' }
  },
  completeMockRunAtomic: async (args: Row) => {
    Object.assign(state.package.mock_interview_runs[0], { status: 'completed', final_report: args.report })
    return { status: 'completed', run: { final_report: args.report } }
  },
})
const { deleteTranscribedAudio } = require('../lib/voice/audioDeletion.ts') as typeof import('../lib/voice/audioDeletion')
const { processVoiceReview } = require('../lib/voice/review.ts') as typeof import('../lib/voice/review')
const { POST } = require('../app/api/packages/[id]/mock-interview/[runId]/voice/route.ts') as typeof import('../app/api/packages/[id]/mock-interview/[runId]/voice/route')
const s = () => structuredClone(state.session) as VoiceSession
const a = () => structuredClone(state.answers[0]) as VoiceAnswer
async function cleanup() { return deleteTranscribedAudio(s(), a()) }
let checks = 0
function check(condition: unknown, message: string) { assert.ok(condition, message); checks++ }
async function playback() {
  return POST(new Request('http://fixture.test/api/voice', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'playback', questionId: 'q0' }) }), { params: Promise.resolve({ id: 'package', runId: 'session' }) })
}
async function main() {
  globalThis.fetch = async (_url, options) => {
    state.stt++; state.events.push('transcribe')
    const request = JSON.parse(String(options?.body))
    const recordingIndex = Buffer.from(request.input_audio.data, 'base64').at(-1)
    const path = `owner/session/q${recordingIndex}.webm`
    state.sttByPath[path] = (state.sttByPath[path] ?? 0) + 1
    if (state.failStt || state.failSttFor === path) return Response.json({ error: 'busy' }, { status: 503 })
    return Response.json({ text: state.noSpeech ? '' : TRANSCRIPT })
  }
  // Only internal retry waits are shortened; no external request can escape the fixture.
  globalThis.setTimeout = ((fn: (...args: unknown[]) => void, _ms?: number, ...args: unknown[]) => originalTimeout(fn, 0, ...args)) as typeof setTimeout
  reset()
  check((await processVoiceReview('owner', 'session')).status === 'completed', 'review completes after early deletion')
  check(state.stt === 1 && state.feedbackCalls === 1 && state.reportCalls === 1, 'one transcription, coaching and final report')
  check(state.events.indexOf('persist-transcript') < state.events.indexOf('queue') && state.events.indexOf('queue') < state.events.indexOf('due') && state.events.indexOf('due') < state.events.indexOf('remove') && state.events.indexOf('remove') < state.events.indexOf('feedback'), 'durable transcript → delayed protection → due → remove → coaching ordering')
  check(!state.objects.size && state.answers[0].audio_deleted_at && state.queue.length === 1, 'audio removed and marked; delayed straggler queue retained')
  check(new Date(state.queue[0].delete_after).getTime() > Date.now() + 2 * 3600000, 'second removal survives signed upload token lifetime')
  check((await playback()).status === 410 && state.signedUrls === 0, 'processed recording returns410 without signing replay URL')
  check(state.answers[0].transcript === TRANSCRIPT && state.answers[0].feedback && state.package.mock_interview_runs[0].final_report, 'transcript, feedback and report persist')

  reset()
  Object.assign(state.answers[1], { transcript: null, feedback: null, audio_deleted_at: null })
  state.objects.add(state.answers[1].audio_path)
  state.failSttFor = state.answers[1].audio_path
  const failedOriginalDeadline = state.answers[1].audio_delete_after
  check((await processVoiceReview('owner', 'session')).status === 'queued', 'mixed batch saves successful answer while failed transcription remains queued')
  check(state.answers[0].transcript === TRANSCRIPT && state.answers[0].audio_deleted_at && !state.objects.has(state.answers[0].audio_path), 'mixed batch deletes only successfully persisted transcription')
  check(!state.answers[1].transcript && !state.answers[1].audio_deleted_at && state.objects.has(state.answers[1].audio_path) && state.answers[1].audio_delete_after === failedOriginalDeadline, 'mixed batch retains failed answer audio and its original three-day deadline')
  check(state.queue.length === 1 && state.queue[0].audio_path === state.answers[0].audio_path, 'mixed batch queues delayed cleanup only for successful answer')
  const successfulTranscriptions = state.sttByPath[state.answers[0].audio_path]
  state.failSttFor = ''
  check((await processVoiceReview('owner', 'session')).status === 'completed', 'mixed batch retry completes the previously failed answer')
  check(state.sttByPath[state.answers[0].audio_path] === successfulTranscriptions && successfulTranscriptions === 1, 'mixed batch retry does not retranscribe or redownload successful removed answer')
  check(state.answers[1].transcript === TRANSCRIPT && state.answers[1].audio_deleted_at && !state.objects.size && state.queue.length === 2, 'mixed batch retry deletes newly successful answer and retains both delayed protections')

  reset(); state.failReport = true
  check((await processVoiceReview('owner', 'session')).status === 'queued', 'later final-report failure requeues')
  check(!state.objects.size && state.answers[0].transcript === TRANSCRIPT && state.answers[0].feedback, 'report failure retains transcript and coaching after audio removal')
  state.failReport = false
  check((await processVoiceReview('owner', 'session')).status === 'completed' && state.stt === 1, 'report retry completes without redownload or STT')

  reset(); state.failFeedback = true
  await processVoiceReview('owner', 'session')
  check(state.answers[0].transcript === TRANSCRIPT && !state.objects.size && !state.answers[0].feedback, 'coaching failure never loses persisted transcript')
  state.failFeedback = false
  check((await processVoiceReview('owner', 'session')).status === 'completed' && state.stt === 1, 'coaching retry uses transcript without STT')

  for (const mode of ['failStt', 'failPersist', 'zeroPersist', 'noSpeech'] as const) {
    reset(); state[mode] = true
    await processVoiceReview('owner', 'session')
    check(state.removes === 0 && state.objects.size === 1 && state.queue.length === 0, `${mode}: no early deletion or cleanup scheduling`)
    check(mode === 'noSpeech' ? state.answers[0].transcript === SILENT : !state.answers[0].transcript, `${mode}: only valid persisted transcription can reach deletion`)
  }
  for (const mode of ['failQueue', 'failRemove', 'failMark'] as const) {
    reset(); state[mode] = true
    check((await processVoiceReview('owner', 'session')).status === 'completed', `${mode}: cleanup failure never blocks coaching or report`)
    check(state.answers[0].transcript === TRANSCRIPT && state.answers[0].feedback, `${mode}: transcript and coaching preserved`)
    if (mode === 'failQueue') check(state.removes === 0 && new Date(state.answers[0].audio_delete_after).getTime() > Date.now() + 3600000, 'queue failure preserves three-day safety net')
    else check(state.queue.length === 1 && new Date(state.answers[0].audio_delete_after).getTime() <= Date.now(), `${mode}: immediate deadline plus delayed queue retained`)
  }

  reset(); state.hangRemove = true
  const stalledStarted = Date.now()
  check((await processVoiceReview('owner', 'session')).status === 'completed', 'stalled Storage removal times out without blocking coaching or final report')
  check(Date.now() - stalledStarted < 1000, 'cleanup deadline fires under accelerated test timers')
  check(state.answers[0].transcript === TRANSCRIPT && state.answers[0].feedback && !state.answers[0].audio_deleted_at && state.objects.size === 1, 'timeout preserves transcript/coaching and never falsely marks audio removed')
  check(state.queue.length === 1 && new Date(state.answers[0].audio_delete_after).getTime() <= Date.now() && !state.events.includes('mark'), 'timeout leaves immediate retention deadline and delayed queue without a marker write')

  reset(); state.answers[0].transcript = TRANSCRIPT; state.missingRemove = true; state.objects.clear()
  check(await cleanup(), 'already-missing Storage object is idempotent success')
  const removed = state.removes
  check(await cleanup() && state.removes === removed, 'already-marked answer avoids another removal')
  reset(); state.answers[0].transcript = TRANSCRIPT; state.failRemove = true
  check(!await cleanup(), 'storage failure is retriable')
  state.failRemove = false
  check(await cleanup() && state.answers[0].audio_deleted_at, 'later cleanup retry marks successfully')
  reset(); state.answers[0].transcript = TRANSCRIPT; state.failMark = true
  check(!await cleanup() && !state.objects.size && !state.answers[0].audio_deleted_at, 'marker failure retains durable cleanup state after object removed')
  state.failMark = false; state.missingRemove = true
  check(await cleanup(), 'marker failure retry succeeds with already-missing object')

  for (const mode of ['failReadback', 'failDue', 'zeroDue'] as const) {
    reset(); state.answers[0].transcript = TRANSCRIPT; state[mode] = true
    check(!await cleanup() && state.removes === 0, `${mode}: cannot remove without confirmed stored state`)
  }
  for (const mutation of ['wrongOwner', 'wrongPath', 'staleLease', 'expiringLease', 'noSavedAt', 'differentTranscript', 'blankTranscript', 'silentTranscript'] as const) {
    reset(); state.answers[0].transcript = TRANSCRIPT
    const session = s(); const answer = a()
    if (mutation === 'wrongOwner') session.user_id = 'other'
    if (mutation === 'wrongPath') state.answers[0].audio_path = answer.audio_path = 'other/session/q0.webm'
    if (mutation === 'staleLease') state.session.lease_token = 'replacement-lease'
    if (mutation === 'expiringLease') state.expireAtLeaseRead = 2
    if (mutation === 'noSavedAt') state.answers[0].saved_at = null
    if (mutation === 'differentTranscript') state.answers[0].transcript = 'Different saved transcript'
    if (mutation === 'blankTranscript') state.answers[0].transcript = answer.transcript = ' '
    if (mutation === 'silentTranscript') state.answers[0].transcript = answer.transcript = SILENT
    check(!await deleteTranscribedAudio(session, answer) && state.removes === 0, `${mutation}: no early removal`)
  }
  reset(); state.answers[0].transcript = TRANSCRIPT
  check((await processVoiceReview('owner', 'session')).status === 'completed' && state.stt === 0 && !state.objects.size, 'existing stored transcript resumes cleanup and coaching without STT')
  check(!state.tables.some(t => /career_profiles|profiles/.test(t)), 'cleanup/review does not fetch a live profile')
  console.log(`PASS ${checks} voice lifecycle assertions: persisted-transcript checkpoint, actual review retries, failure isolation, owner/lease/path guards, delayed queue and playback410`)
}
main().catch(error => { console.error(error); process.exitCode = 1 }).finally(() => {
  globalThis.fetch = originalFetch
  globalThis.setTimeout = originalTimeout
})
