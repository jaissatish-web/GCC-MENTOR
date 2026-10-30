import { createServiceRoleClient } from '@/lib/supabase/serviceAdmin'
import { purgeDeletedVoiceSessions, VoiceRetentionError } from '@/lib/voice/retention'

/**
 * Retention clean-up (audit H07, 2026-09-15; migration 054).
 *
 * Anonymous CV scans were stored with a seven-day expiry that only HID them —
 * nothing deleted them. purge_expired_operational_data() deletes expired
 * anonymous sessions (and stale operational rows) in one transaction and
 * returns COUNTS. Each run is recorded in maintenance_runs so the founder can
 * see in /admin/services that clean-up is actually happening, and when it last
 * failed. Nothing here ever reads or logs CV content.
 *
 * Triggered daily by Vercel Cron (app/api/cron/retention, vercel.json) and on
 * demand from /admin/services.
 */

export const RETENTION_JOB = 'retention_purge'

export interface RetentionRun {
  id: string
  trigger: string
  started_at: string
  finished_at: string | null
  ok: boolean | null
  summary: Record<string, number> | null
  error: string | null
}

/** One audit record covers both operational records and private voice objects. */
export async function runRetention(trigger: 'cron' | 'admin'): Promise<{ ok: boolean; summary?: Record<string, number>; error?: string }> {
  const db = createServiceRoleClient()
  const started = Date.now()
  const deadline = started + 160_000
  const cutoff = new Date(started).toISOString()
  const rateCutoff = new Date(started - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const reservationCutoff = new Date(started - 24 * 60 * 60 * 1000).toISOString()
  const summary: Record<string, number> = {}
  async function bounded<T>(promise: PromiseLike<T>, maxMs = 15_000): Promise<T> {
    let timer: ReturnType<typeof setTimeout>
    return Promise.race([Promise.resolve(promise), new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Retention operation timed out')), Math.max(1, Math.min(maxMs, deadline - Date.now())))
    })]).finally(() => clearTimeout(timer))
  }
  const { data: run, error: startError } = await bounded(db.from('maintenance_runs')
    .insert({ job: RETENTION_JOB, trigger }).select('id').single()).catch(() => ({ data: null, error: { message: 'Run start timed out' } }))
  // Never purge without an audit row, and never report an unrecorded run as success.
  if (startError || !run?.id) {
    console.error('retention: could not record the run start')
    return { ok: false, error: 'Could not record retention run start' }
  }
  const operationalQueries = () => [
    ['anonymous_sessions', db.from('anonymous_analysis_sessions').select('*', { count: 'exact', head: true }).lt('expires_at', cutoff)],
    ['anonymous_rate_limit_rows', db.from('anonymous_rate_limits').select('*', { count: 'exact', head: true }).lt('window_start', rateCutoff)],
    ['stale_reservations', db.from('rate_limit_reservations').select('*', { count: 'exact', head: true }).lt('expires_at', reservationCutoff)],
    ['job_analyses', db.from('job_analyses').select('*', { count: 'exact', head: true }).lt('expires_at', cutoff)],
  ] as const
  const snapshot = async (suffix: string) => {
    for (const [key, query] of operationalQueries()) {
      const { count, error } = await bounded(query, 3000)
      if (error || count === null) throw new Error('Could not count operational retention backlog')
      summary[key + '_' + suffix] = count
    }
  }
  let failure: string | undefined
  let step = 'operational'
  try {
    await snapshot('before')
    let operationalError: unknown
    try {
      const { data, error } = await bounded(db.rpc('purge_expired_operational_data', { p_rate_limit_days: 30 }))
      if (error) throw new Error('Operational retention purge failed')
      for (const [key, value] of Object.entries(data ?? {})) if (typeof value === 'number') summary[key] = value
    } catch (error) { operationalError = error }
    try { await snapshot('after') } catch (error) { operationalError ??= error }
    if (operationalError) throw operationalError
    step = 'voice'
    const voiceBudget = Math.min(100_000, deadline - Date.now() - 35_000)
    if (voiceBudget <= 0) throw new Error('Retention time budget exhausted before voice cleanup')
    Object.assign(summary, await purgeDeletedVoiceSessions({ db, budgetMs: voiceBudget }))
  } catch (error) {
    if (error instanceof VoiceRetentionError) Object.assign(summary, error.summary)
    failure = step + ': ' + (error instanceof Error ? error.message : 'Retention cleanup failed')
    console.error('retention: ' + step + ' cleanup failed trigger=' + trigger)
  }
  summary.retention_duration_ms = Date.now() - started
  const { data: finished, error: finishError } = await bounded(db.from('maintenance_runs').update({
    finished_at: new Date().toISOString(), ok: !failure, summary,
    error: failure ? failure.slice(0, 500) : null,
  }).eq('id', run.id).eq('job', RETENTION_JOB).select('id').single(), 5000).catch(() => ({ data: null, error: { message: 'Run result timed out' } }))
  if (finishError || !finished) {
    console.error('retention: could not record the run result')
    return { ok: false, summary, error: 'Could not record retention run result' }
  }
  if (failure) return { ok: false, summary, error: failure }
  console.info('retention: purge done trigger=' + trigger + ' ' + JSON.stringify(summary))
  return { ok: true, summary }
}

export async function recentRetentionRuns(limit = 5): Promise<RetentionRun[]> {
  const { data, error } = await createServiceRoleClient({ fresh: true })
    .from('maintenance_runs')
    .select('id, trigger, started_at, finished_at, ok, summary, error')
    .eq('job', RETENTION_JOB)
    .order('started_at', { ascending: false })
    .limit(limit)
  if (error) {
    console.error('retention: could not read run history', error.message)
    return []
  }
  return (data as RetentionRun[] | null) ?? []
}
