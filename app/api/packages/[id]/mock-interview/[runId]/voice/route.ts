import { NextResponse } from 'next/server'
import { ownVoiceSession, transcriptionReady, voiceAdmin, voiceAnswers, voiceEnabled } from '@/lib/voice/server'
import { processVoiceReview } from '@/lib/voice/review'
import { AUDIO_TYPES, MAX_AUDIO_BYTES, MAX_ANSWER_SECONDS, VOICE_BUCKET, type VoiceSessionView } from '@/lib/voice/types'
import { audioHeaderMatches, canonicalAudioType } from '@/lib/voice/audio'

export const dynamic = 'force-dynamic'
export const maxDuration = 180
type Props = { params: Promise<{ id: string; runId: string }> }

export async function GET(_request: Request, props: Props) {
  const { id, runId } = await props.params
  const ctx = await ownVoiceSession(id, runId)
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  const { session } = ctx
  try {
    const answers = await voiceAnswers(runId)
    const history: VoiceSessionView['history'] = []
    for (let offset = 0; ; offset += 100) {
      const { data: page, error } = await voiceAdmin().from('voice_interview_sessions').select('id,created_at,report')
        .eq('user_id', ctx.user.id).eq('package_id', id).eq('status', 'completed')
        .eq('resume_fingerprint', session.resume_fingerprint).eq('rubric_version', session.rubric_version)
        .eq('run_snapshot->>mode', session.run_snapshot.mode).eq('run_snapshot->>difficulty', session.run_snapshot.difficulty)
        .eq('run_snapshot->>question_count', String(session.run_snapshot.question_count))
        .order('created_at', { ascending: true }).order('id', { ascending: true }).range(offset, offset + 99)
      if (error) throw error
      history.push(...(page ?? []))
      if (!page || page.length < 100) break
    }
    const reviewed = answers.filter(a => a.feedback).length
    return NextResponse.json({ id: session.id, status: session.status,
      last_error: session.status === 'processing' && session.attempts >= 5 && session.lease_until && new Date(session.lease_until).getTime() < Date.now() ? 'Review was interrupted repeatedly. Please retry.' : session.last_error,
      reviewed, total: session.run_snapshot.questions.length, answers, history: history ?? [] }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch { return NextResponse.json({ error: 'Could not load recorded interview details.' }, { status: 503 }) }
}

export async function POST(request: Request, props: Props) {
  const { id, runId } = await props.params
  const ctx = await ownVoiceSession(id, runId)
  if ('error' in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const db = voiceAdmin()
  const { session, user } = ctx
  const questionId = typeof body.questionId === 'string' ? body.questionId : ''
  try {
    if (body.action === 'playback') {
      if (session.status === 'deleting') return NextResponse.json({ error: 'Interview deleted' }, { status: 410 })
      const answer = (await voiceAnswers(runId)).find(a => a.question_id === questionId && a.saved_at)
      if (!answer) return NextResponse.json({ error: 'Recording not found' }, { status: 404 })
      const { data, error } = await db.storage.from(VOICE_BUCKET).createSignedUrl(answer.audio_path, 300)
      if (error) throw error
      return NextResponse.json({ url: data.signedUrl }, { headers: { 'Cache-Control': 'private, no-store' } })
    }
    if (body.action === 'delete') {
      // Lock out workers and uploads before removing audio; final deletion is retriable.
      const { error: lockError } = await db.rpc('voice_mark_deleting', { p_session_id: runId, p_user_id: user.id })
      if (lockError) return NextResponse.json({ error: 'Review is running. Wait for this step to finish before deleting.' }, { status: 409 })
      const answers = await voiceAnswers(runId)
      if (answers.length) {
        const { error } = await db.storage.from(VOICE_BUCKET).remove(answers.map(a => a.audio_path))
        if (error) throw error
      }
      // Tombstone remains for three hours so expiring upload tokens cannot create permanent orphan audio.
      return NextResponse.json({ deleted: true })
    }
    if (!voiceEnabled() || !transcriptionReady()) return NextResponse.json({ error: 'Recorded interviews are temporarily unavailable. Saved recordings remain available.' }, { status: 503 })
    if (body.action === 'review') {
      const { data, error } = await db.rpc('voice_request_review', { p_session_id: runId, p_user_id: user.id })
      if (error) return NextResponse.json({ error: 'Save every answer before requesting review.' }, { status: 409 })
      return NextResponse.json({ status: data })
    }
    if (body.action === 'process') return NextResponse.json(await processVoiceReview(user.id, runId))
    if (!session.run_snapshot.questions.some(q => q.id === questionId)) return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    if (session.status !== 'recording') return NextResponse.json({ error: 'This interview no longer accepts recordings.' }, { status: 409 })
    if (body.action === 'prepare') {
      const mime = canonicalAudioType(body.mimeType)
      if (!mime) return NextResponse.json({ error: 'This recording format is not supported.' }, { status: 400 })
      const path = `${user.id}/${runId}/${questionId}.${AUDIO_TYPES[mime]}`
      const { data: answer, error } = await db.rpc('voice_prepare_answer', { p_session_id: runId, p_user_id: user.id, p_question_id: questionId, p_mime: mime, p_path: path })
      if (error) throw error
      if (answer.saved_at) return NextResponse.json({ alreadySaved: true })
      if (answer.mime_type !== mime) return NextResponse.json({ error: 'Continue this unsaved recording on the original browser, or start a new interview.' }, { status: 409 })
      const { data: upload, error: uploadError } = await db.storage.from(VOICE_BUCKET).createSignedUploadUrl(answer.audio_path, { upsert: false })
      if (uploadError) throw uploadError
      return NextResponse.json({ path: upload.path, token: upload.token })
    }
    if (body.action === 'save') {
      const duration = Number(body.durationSeconds)
      if (!Number.isFinite(duration) || duration < 0.5 || duration > MAX_ANSWER_SECONDS + 5) return NextResponse.json({ error: 'Record an answer of up to three minutes.' }, { status: 400 })
      const answer = (await voiceAnswers(runId)).find(a => a.question_id === questionId)
      if (!answer) return NextResponse.json({ error: 'Upload a recording first.' }, { status: 400 })
      if (answer.saved_at) return NextResponse.json({ saved: true })
      const { data: blob, error } = await db.storage.from(VOICE_BUCKET).download(answer.audio_path)
      if (error || !blob) return NextResponse.json({ error: 'Upload is incomplete. Retry saving your recording.' }, { status: 409 })
      const valid = blob.size > 0 && blob.size <= MAX_AUDIO_BYTES && audioHeaderMatches(new Uint8Array(await blob.slice(0, 16).arrayBuffer()), answer.mime_type)
      if (!valid) return NextResponse.json({ error: 'Invalid audio file. Record your answer again.' }, { status: 400 })
      const { data: saved, error: saveError } = await db.rpc('voice_accept_answer', { p_session_id: runId, p_user_id: user.id, p_question_id: questionId, p_bytes: blob.size, p_seconds: duration })
      if (saveError || !saved) throw saveError ?? new Error('Save failed')
      return NextResponse.json({ saved: true })
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Could not complete that action. Your saved recordings are safe; please retry.' }, { status: 503 })
  }
}
