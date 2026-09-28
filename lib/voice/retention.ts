import { voiceAdmin, voiceAnswers } from './server'
import { VOICE_BUCKET } from './types'
/** Delayed cleanup catches uploads completed with an already-issued (2-hour) token after deletion. */
export async function purgeDeletedVoiceSessions() {
  const db = voiceAdmin()
  // Audio is deliberately short-lived. Keep the small relational answer row,
  // transcript and coaching so practice history survives after the object is
  // removed. Supabase Storage objects must be deleted through the Storage API.
  const { data: expired, error: expiredError } = await db.from('voice_interview_answers')
    .select('audio_path').is('audio_deleted_at', null).lte('audio_delete_after', new Date().toISOString()).limit(100)
  if (expiredError) throw expiredError
  if (expired?.length) {
    const paths = expired.map(row => row.audio_path)
    const { error: removeError } = await db.storage.from(VOICE_BUCKET).remove(paths)
    if (removeError) throw removeError
    const { error: markError } = await db.from('voice_interview_answers')
      .update({ audio_deleted_at: new Date().toISOString() }).in('audio_path', paths).is('audio_deleted_at', null)
    if (markError) throw markError
  }
  const { data, error } = await db.from('voice_interview_sessions').select('id,user_id').eq('status', 'deleting').lt('completed_at', new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()).limit(20)
  if (error) throw error
  const { data: cleanup, error: cleanupError } = await db.from('voice_audio_cleanup').select('audio_path').lt('delete_after', new Date().toISOString()).limit(100)
  if (cleanupError) throw cleanupError
  if (cleanup?.length) {
    const paths = cleanup.map(row => row.audio_path)
    const { error } = await db.storage.from(VOICE_BUCKET).remove(paths)
    if (error) throw error
    const { error: deleteError } = await db.from('voice_audio_cleanup').delete().in('audio_path', paths)
    if (deleteError) throw deleteError
  }
  for (const row of data ?? []) {
    const answers = await voiceAnswers(row.id)
    if (answers.length) {
      const { error } = await db.storage.from(VOICE_BUCKET).remove(answers.map(a => a.audio_path))
      if (error) throw error
    }
    const { error } = await db.rpc('voice_delete_session', { p_session_id: row.id, p_user_id: row.user_id })
    if (error) throw error
  }
}
