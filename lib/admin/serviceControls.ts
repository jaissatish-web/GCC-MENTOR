import { createServiceRoleClient } from '@/lib/supabase/serviceAdmin'
import { getDefaultDailyLimit, windowStart } from '@/lib/rateLimit'
import { AI_SERVICES, isServiceKey } from '@/lib/ai/services'

/**
 * Founder service controls (audit M14, 2026-09-15; migration 049).
 *
 * The data behind /admin/services: for every quota action, whether it is
 * available, its allowances, and what happened today and over the last seven
 * days — counted inside the same database functions that enforce the limits,
 * so what the founder reads is what the server did. Every change is written to
 * ai_service_control_changes with its before and after values.
 *
 * Enforcement lives in lib/ai/serviceGuard.ts, server-side, on every model
 * call. Nothing on this screen works by hiding a button.
 */

export const ACTION_LABELS: Record<string, { label: string; help: string; usesQuota: boolean }> = {
  profile_extraction: { label: 'CV reading', help: 'Reading an uploaded or pasted CV into the Career Profile.', usesQuota: true },
  anonymous_scan: { label: 'Anonymous scan (legacy)', help: 'The old signed-out scan at /ats-scan. It keeps its own per-visitor limit; only the pause applies here.', usesQuota: false },
  job_description: { label: 'Job advert reading', help: 'Structuring a pasted job advert when a job is set up.', usesQuota: true },
  optimization: { label: 'Optimized CV build', help: 'Writing the job-specific CV.', usesQuota: true },
  cover_letter: { label: 'Cover letter', help: 'One letter per request.', usesQuota: true },
  interview_qa: { label: 'Interview Q&A set', help: 'Up to 25 questions and answers per request.', usesQuota: true },
  mock_interview_start: { label: 'Mock interview — start', help: 'Planning the questions for one interview.', usesQuota: true },
  mock_interview_answer: { label: 'Mock interview — answer feedback', help: 'Feedback on one typed answer.', usesQuota: true },
  mock_interview_report: { label: 'Mock interview — final report', help: 'The preparation report at the end.', usesQuota: true },
}

export interface ServiceControlRow {
  action: string
  service_key: string
  enabled: boolean
  daily_limit_per_user: number | null
  global_daily_limit: number | null
  max_concurrent_per_user: number
  paused_message: string | null
  updated_at: string
}

export interface ActionStats {
  reserved: number
  succeeded: number
  failed: number
  refused_limit: number
  refused_busy: number
  refused_global: number
}

export interface ServiceControlView extends ServiceControlRow {
  label: string
  help: string
  usesQuota: boolean
  defaultDailyLimit: number
  today: ActionStats
  week: ActionStats
}

export interface ServiceGroupView {
  serviceKey: string
  serviceLabel: string
  enabled: boolean
  pausedMessage: string | null
  actions: ServiceControlView[]
}

export interface ControlChange {
  id: string
  action: string
  changed_at: string
  changed_by: string | null
  before_value: Record<string, unknown> | null
  after_value: Record<string, unknown>
}

const ZERO: ActionStats = { reserved: 0, succeeded: 0, failed: 0, refused_limit: 0, refused_busy: 0, refused_global: 0 }

function addStats(a: ActionStats, b: Partial<ActionStats>): ActionStats {
  return {
    reserved: a.reserved + (b.reserved ?? 0),
    succeeded: a.succeeded + (b.succeeded ?? 0),
    failed: a.failed + (b.failed ?? 0),
    refused_limit: a.refused_limit + (b.refused_limit ?? 0),
    refused_busy: a.refused_busy + (b.refused_busy ?? 0),
    refused_global: a.refused_global + (b.refused_global ?? 0),
  }
}

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

export async function loadServiceControls(): Promise<{ groups: ServiceGroupView[]; changes: ControlChange[]; error: string | null }> {
  const db = createServiceRoleClient({ fresh: true })
  const [controls, stats, changes] = await Promise.all([
    db.from('ai_service_controls').select('action, service_key, enabled, daily_limit_per_user, global_daily_limit, max_concurrent_per_user, paused_message, updated_at'),
    db.from('ai_service_daily_stats').select('*').gte('day', daysAgo(6)),
    db.from('ai_service_control_changes').select('id, action, changed_at, changed_by, before_value, after_value').order('changed_at', { ascending: false }).limit(15),
  ])
  if (controls.error) {
    return { groups: [], changes: [], error: 'Could not read the service controls. Has migration 049 been applied?' }
  }

  const today = windowStart()
  const statsRows = (stats.data as Array<Partial<ActionStats> & { action: string; day: string }> | null) ?? []
  const byAction = new Map<string, { today: ActionStats; week: ActionStats }>()
  for (const row of statsRows) {
    const current = byAction.get(row.action) ?? { today: ZERO, week: ZERO }
    byAction.set(row.action, {
      today: row.day === today ? addStats(current.today, row) : current.today,
      week: addStats(current.week, row),
    })
  }

  const rows = (controls.data as ServiceControlRow[] | null) ?? []
  const groups = new Map<string, ServiceGroupView>()
  for (const row of rows.sort((a, b) => Object.keys(ACTION_LABELS).indexOf(a.action) - Object.keys(ACTION_LABELS).indexOf(b.action))) {
    const meta = ACTION_LABELS[row.action] ?? { label: row.action, help: '', usesQuota: true }
    const view: ServiceControlView = {
      ...row,
      label: meta.label,
      help: meta.help,
      usesQuota: meta.usesQuota,
      defaultDailyLimit: getDefaultDailyLimit(row.action),
      today: byAction.get(row.action)?.today ?? ZERO,
      week: byAction.get(row.action)?.week ?? ZERO,
    }
    const group = groups.get(row.service_key) ?? {
      serviceKey: row.service_key,
      serviceLabel: isServiceKey(row.service_key) ? AI_SERVICES[row.service_key].label : row.service_key,
      enabled: true,
      pausedMessage: null,
      actions: [],
    }
    group.actions.push(view)
    // A service reads as paused when any of its actions is paused.
    if (!row.enabled) {
      group.enabled = false
      group.pausedMessage = group.pausedMessage ?? row.paused_message
    }
    groups.set(row.service_key, group)
  }

  return {
    groups: Array.from(groups.values()),
    changes: (changes.data as ControlChange[] | null) ?? [],
    error: stats.error ? 'Usage counts could not be read; controls are shown without them.' : null,
  }
}

function parseLimit(raw: FormDataEntryValue | null, max: number): number | null | 'invalid' {
  const v = String(raw ?? '').trim()
  if (v === '') return null
  if (!/^\d+$/.test(v)) return 'invalid'
  const n = Number.parseInt(v, 10)
  return n >= 0 && n <= max ? n : 'invalid'
}

async function writeChange(action: string, before: unknown, after: unknown, adminId: string): Promise<void> {
  const { error } = await createServiceRoleClient()
    .from('ai_service_control_changes')
    .insert({ action, changed_by: adminId, before_value: before, after_value: after })
  if (error) console.error('serviceControls: change history not written action=' + action, error.message)
}

/** Allowances for one action. Blank = code default (per user) or no cap (all users). */
export async function updateActionLimits(opts: {
  action: string
  dailyLimit: FormDataEntryValue | null
  globalLimit: FormDataEntryValue | null
  maxConcurrent: FormDataEntryValue | null
  adminId: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(opts.action in ACTION_LABELS)) return { ok: false, error: 'Unknown service action.' }
  const daily = parseLimit(opts.dailyLimit, 100000)
  const global = parseLimit(opts.globalLimit, 1000000)
  const concurrent = parseLimit(opts.maxConcurrent, 5)
  if (daily === 'invalid') return { ok: false, error: 'Daily allowance must be a whole number (or blank for the default).' }
  if (global === 'invalid') return { ok: false, error: 'All-users cap must be a whole number (or blank for no cap).' }
  if (concurrent === 'invalid' || concurrent === 0) return { ok: false, error: 'Requests at once must be between 1 and 5.' }

  const db = createServiceRoleClient()
  const { data: before, error: readError } = await db.from('ai_service_controls').select('*').eq('action', opts.action).maybeSingle()
  if (readError || !before) return { ok: false, error: 'Could not read this control. Nothing was changed.' }

  const after = {
    daily_limit_per_user: daily,
    global_daily_limit: global,
    max_concurrent_per_user: concurrent ?? 1,
    updated_at: new Date().toISOString(),
    updated_by: opts.adminId,
  }
  const { error } = await db.from('ai_service_controls').update(after).eq('action', opts.action)
  if (error) return { ok: false, error: 'Could not save. Nothing was changed.' }
  await writeChange(opts.action, before, after, opts.adminId)
  return { ok: true }
}

/** Pause or resume every action of one service, with an optional message to users. */
export async function setServicePaused(opts: {
  serviceKey: string
  paused: boolean
  message: string
  adminId: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = createServiceRoleClient()
  const { data: before, error: readError } = await db.from('ai_service_controls').select('*').eq('service_key', opts.serviceKey)
  if (readError || !before || before.length === 0) return { ok: false, error: 'Unknown service. Nothing was changed.' }

  const message = opts.message.trim().slice(0, 300) || null
  const after = { enabled: !opts.paused, paused_message: opts.paused ? message : null, updated_at: new Date().toISOString(), updated_by: opts.adminId }
  const { error } = await db.from('ai_service_controls').update(after).eq('service_key', opts.serviceKey)
  if (error) return { ok: false, error: 'Could not save. Nothing was changed.' }
  for (const row of before as ServiceControlRow[]) await writeChange(row.action, row, after, opts.adminId)
  return { ok: true }
}
