import { voiceAdmin } from './server'
import { VOICE_BUCKET } from './types'

type VoiceDb = ReturnType<typeof voiceAdmin>
type Summary = Record<string, number>
const BATCH_SIZE = 100
export const VOICE_RETENTION_MAX_ITEMS = 2000

/** Missing objects are already clean. All other Storage errors remain retriable. */
export async function removeVoiceAudio(db: VoiceDb, paths: string[]): Promise<void> {
  if (!paths.length) return
  const { error } = await db.storage.from(VOICE_BUCKET).remove(paths)
  if (!error) return
  const code = String((error as { statusCode?: unknown; status?: unknown }).statusCode ?? (error as { status?: unknown }).status ?? '')
  // A missing bucket or other404 is a configuration failure, not proof that
  // these objects were deleted. Only an object-specific not-found is idempotent.
  if (/^(?:object|the object) (?:was )?not found[.!]?$/i.test(error.message.trim()) && (code === '404' || code === '' || code === '400')) return
  throw new Error('Voice audio storage removal failed')
}

export class VoiceRetentionError extends Error {
  constructor(message: string, readonly summary: Summary) { super(message); this.name = 'VoiceRetentionError' }
}

interface Options {
  db?: VoiceDb
  now?: () => number
  maxItems?: number
  /** Work budget excludes at most six bounded count snapshots (five seconds each). */
  budgetMs?: number
}

function timeout<T>(work: PromiseLike<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>
  return Promise.race([Promise.resolve(work), new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Voice retention operation timed out')), Math.max(1, ms))
  })]).finally(() => clearTimeout(timer))
}

/**
 * Bounded, resumable backlog worker. Expired audio and delayed cleanup objects are
 * removed before metadata advances. Session deletion is scoped by owner and ID;
 * no transcript, profile snapshot or report is read by this worker.
 */
export async function purgeDeletedVoiceSessions(options: Options = {}): Promise<Summary> {
  const db = options.db ?? voiceAdmin()
  const now = options.now ?? Date.now
  const started = now()
  const deadline = started + Math.min(120_000, Math.max(1, options.budgetMs ?? 120_000))
  const cap = Math.min(VOICE_RETENTION_MAX_ITEMS, Math.max(0, Math.floor(options.maxItems ?? VOICE_RETENTION_MAX_ITEMS)))
  const cutoff = new Date(started).toISOString()
  const deleteCutoff = new Date(started - 3 * 60 * 60 * 1000).toISOString()
  const summary: Summary = { voice_items_processed: 0, voice_item_limit_reached: 0, voice_time_limit_reached: 0,
    voice_expired_audio_removed: 0, voice_cleanup_objects_removed: 0, voice_deleting_sessions_deleted: 0,
    voice_deleting_sessions_deferred: 0 }
  const remaining = () => cap - summary.voice_items_processed
  const canWork = () => {
    if (remaining() <= 0) { summary.voice_item_limit_reached = 1; return false }
    if (now() >= deadline) { summary.voice_time_limit_reached = 1; return false }
    return true
  }
  const work = async <T>(promise: PromiseLike<{ data?: unknown; error?: unknown }>, label: string): Promise<T> => {
    const result = await timeout(promise, Math.min(15_000, Math.max(1, deadline - now())))
    if (result.error) throw new Error(label)
    return result.data as T
  }
  const expiredQuery = (count = false) => db.from('voice_interview_answers')
    .select('session_id,audio_path', count ? { count: 'exact', head: true } : undefined)
    .is('audio_deleted_at', null).lte('audio_delete_after', cutoff)
  const cleanupQuery = (count = false) => db.from('voice_audio_cleanup')
    .select('audio_path', count ? { count: 'exact', head: true } : undefined).lt('delete_after', cutoff)
  const sessionsQuery = (count = false) => db.from('voice_interview_sessions')
    .select('id,user_id', count ? { count: 'exact', head: true } : undefined).eq('status', 'deleting').lt('completed_at', deleteCutoff)
  const snapshot = async (key: string, query: PromiseLike<{ count: number | null; error: unknown }>) => {
    const result = await timeout(query, 5000)
    if (result.error || result.count === null) throw new Error('Could not count ' + key)
    summary[key] = result.count
  }
  // Count after each stage even if it fails; never replace its original error.
  const stage = async (name: string, query: () => PromiseLike<{ count: number | null; error: unknown }>, run: () => Promise<void>) => {
    await snapshot(name + '_before', query())
    let failure: unknown
    try { await run() } catch (error) { failure = error }
    try { await snapshot(name + '_after', query()) } catch (error) { failure ??= error }
    if (failure) throw failure
  }
  try {
    await stage('voice_expired_audio', () => expiredQuery(true), async () => {
      while (canWork()) {
        const rows = await work<Array<{ session_id: string; audio_path: string }>>(expiredQuery().order('audio_delete_after').order('audio_path').limit(Math.min(BATCH_SIZE, remaining())), 'Could not read expired voice audio')
        if (!rows.length) break
        await timeout(removeVoiceAudio(db, rows.map(row => row.audio_path)), Math.min(15_000, Math.max(1, deadline - now())))
        summary.voice_items_processed += rows.length
        summary.voice_expired_audio_removed += rows.length
        const sessions = [...new Set(rows.map(row => row.session_id))]
        for (const sessionId of sessions) {
          await work(db.from('voice_interview_answers').update({ audio_deleted_at: new Date(now()).toISOString() })
            .eq('session_id', sessionId).in('audio_path', rows.filter(row => row.session_id === sessionId).map(row => row.audio_path))
            .is('audio_deleted_at', null).lte('audio_delete_after', cutoff), 'Could not mark removed voice audio')
        }
      }
    })
    await stage('voice_cleanup', () => cleanupQuery(true), async () => {
      while (canWork()) {
        const rows = await work<Array<{ audio_path: string }>>(cleanupQuery().order('delete_after').order('audio_path').limit(Math.min(BATCH_SIZE, remaining())), 'Could not read delayed voice cleanup')
        if (!rows.length) break
        const paths = rows.map(row => row.audio_path)
        await timeout(removeVoiceAudio(db, paths), Math.min(15_000, Math.max(1, deadline - now())))
        summary.voice_items_processed += paths.length
        summary.voice_cleanup_objects_removed += paths.length
        await work(db.from('voice_audio_cleanup').delete().in('audio_path', paths).lt('delete_after', cutoff), 'Could not finish delayed voice cleanup')
      }
    })
    await stage('voice_deleting_sessions', () => sessionsQuery(true), async () => {
      let cursor: string | undefined
      while (canWork()) {
        let query = sessionsQuery().order('id').limit(Math.min(BATCH_SIZE, remaining()))
        if (cursor) query = query.gt('id', cursor)
        const rows = await work<Array<{ id: string; user_id: string }>>(query, 'Could not read deleting voice sessions')
        if (!rows.length) break
        for (const row of rows) {
          cursor = row.id
          if (!canWork()) break
          // Reserve one item for the session itself. A corrupt/oversized session
          // is deferred rather than reading or removing an unbounded answer set.
          const answers = await work<Array<{ audio_path: string }>>(db.from('voice_interview_answers').select('audio_path')
            .eq('session_id', row.id).is('audio_deleted_at', null).order('audio_path').limit(remaining()), 'Could not read deleting-session audio')
          if (answers.length >= remaining()) { summary.voice_deleting_sessions_deferred++; continue }
          await timeout(removeVoiceAudio(db, answers.map(answer => answer.audio_path)), Math.min(15_000, Math.max(1, deadline - now())))
          summary.voice_items_processed += answers.length
          const deleted = await work<boolean>(db.rpc('voice_delete_session', { p_session_id: row.id, p_user_id: row.user_id }), 'Could not finish deleting voice session')
          summary.voice_items_processed++
          if (deleted) summary.voice_deleting_sessions_deleted++
        }
      }
    })
    summary.voice_duration_ms = Math.max(0, now() - started)
    return summary
  } catch (error) {
    summary.voice_duration_ms = Math.max(0, now() - started)
    throw new VoiceRetentionError(error instanceof Error ? error.message : 'Voice retention failed', summary)
  }
}
