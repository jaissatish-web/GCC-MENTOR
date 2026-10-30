import { voiceAdmin } from './server'
import { removeVoiceAudio } from './retention'
import { NO_SPEECH_TRANSCRIPT, type VoiceAnswer, type VoiceSession } from './types'

/** The transcript is the durable deliverable. Cleanup must never undo it or block coaching. */
export async function deleteTranscribedAudio(session: VoiceSession, answer: VoiceAnswer): Promise<boolean> {
  if (!session.lease_token || !answer.transcript?.trim() || answer.transcript === NO_SPEECH_TRANSCRIPT) return false
  const db = voiceAdmin()
  // Limit cleanup overhead per answer; the existing review request has its own
  // finite budget. A stalled delete stays due for the retention worker.
  const deadline = Date.now() + 5000
  const bounded = async <T>(operation: () => PromiseLike<T>): Promise<T> => {
    const left = deadline - Date.now()
    if (left <= 0) throw new Error('Audio cleanup timed out')
    let timer: ReturnType<typeof setTimeout>
    return Promise.race([Promise.resolve(operation()), new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Audio cleanup timed out')), left)
    })]).finally(() => clearTimeout(timer))
  }
  const hasLease = async () => {
    const { data, error } = await bounded(() => db.from('voice_interview_sessions').select('id')
      .eq('id', session.id).eq('user_id', session.user_id).eq('status', 'processing')
      .eq('lease_token', session.lease_token).gt('lease_until', new Date().toISOString()).maybeSingle())
    return !error && Boolean(data)
  }
  try {
    if (!await hasLease()) return false
    const { data: saved, error } = await bounded(() => db.from('voice_interview_answers')
      .select('audio_path,saved_at,transcript,audio_deleted_at')
      .eq('session_id', session.id).eq('question_id', answer.question_id).maybeSingle())
    if (error || !saved?.saved_at || saved.transcript !== answer.transcript || saved.audio_path !== answer.audio_path
      || !saved.audio_path.startsWith(`${session.user_id}/${session.id}/`)) return false
    if (saved.audio_deleted_at) { answer.audio_deleted_at = saved.audio_deleted_at; return true }

    // A signed upload token remains valid for two hours. Once the object is removed,
    // that token could recreate it even with upsert:false. Preserve a delayed second
    // removal in the EXISTING cleanup queue before making this object eligible for
    // immediate retention/review cleanup. Do not clear this queue on immediate success.
    const { error: queueError } = await bounded(() => db.from('voice_audio_cleanup').upsert({
      audio_path: saved.audio_path,
      delete_after: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    }, { onConflict: 'audio_path' }))
    if (queueError) throw queueError
    const due = new Date().toISOString()
    const { data: dueRow, error: dueError } = await bounded(() => db.from('voice_interview_answers')
      .update({ audio_delete_after: due }).eq('session_id', session.id).eq('question_id', answer.question_id)
      .eq('audio_path', saved.audio_path).is('audio_deleted_at', null).select('audio_delete_after').maybeSingle())
    if (dueError) throw dueError
    if (!dueRow || !await hasLease()) return false
    answer.audio_delete_after = due
    await bounded(() => removeVoiceAudio(db, [saved.audio_path]))
    const deletedAt = new Date().toISOString()
    const { data: marked, error: markError } = await bounded(() => db.from('voice_interview_answers')
      .update({ audio_deleted_at: deletedAt }).eq('session_id', session.id).eq('question_id', answer.question_id)
      .eq('audio_path', saved.audio_path).select('audio_deleted_at').maybeSingle())
    if (markError || !marked) throw markError ?? new Error('Audio cleanup marker was not saved')
    answer.audio_deleted_at = marked.audio_deleted_at
    return true
  } catch {
    // Keep the transcript and the retry deadline/queue. Never leak audio paths or
    // provider errors; the configured retention worker retries unsuccessful cleanup.
    console.warn('voice audio cleanup pending session=' + session.id + ' question=' + answer.question_id)
    return false
  }
}
