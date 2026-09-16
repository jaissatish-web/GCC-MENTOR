import { createServiceRoleClient } from '@/lib/supabase/serviceAdmin'

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

export async function runRetention(trigger: 'cron' | 'admin'): Promise<{ ok: boolean; summary?: Record<string, number>; error?: string }> {
  const db = createServiceRoleClient()
  const { data: run, error: startError } = await db
    .from('maintenance_runs')
    .insert({ job: RETENTION_JOB, trigger })
    .select('id')
    .single()
  if (startError) console.error('retention: could not record the run start', startError.message)

  const { data, error } = await db.rpc('purge_expired_operational_data', { p_rate_limit_days: 30 })
  const summary = (data as Record<string, number> | null) ?? undefined

  if (run?.id) {
    const { error: finishError } = await db
      .from('maintenance_runs')
      .update({
        finished_at: new Date().toISOString(),
        ok: !error,
        summary: error ? null : summary,
        error: error ? error.message.slice(0, 500) : null,
      })
      .eq('id', run.id)
    if (finishError) console.error('retention: could not record the run result', finishError.message)
  }

  if (error) {
    console.error('retention: purge failed trigger=' + trigger, error.message)
    return { ok: false, error: error.message }
  }
  // Counts only.
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
