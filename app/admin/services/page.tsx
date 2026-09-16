import { requireAdmin } from '@/lib/admin/adminAuth'
import { PageShell } from '@/components/layout/PageShell'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { ACTION_LABELS, loadServiceControls, type ActionStats } from '@/lib/admin/serviceControls'
import { recentRetentionRuns } from '@/lib/admin/retention'
import { runRetentionNowAction, setServicePausedAction, updateServiceLimitsAction } from '../actions'

export const dynamic = 'force-dynamic'

/**
 * Service controls — the founder's safety switch for every AI service (audit
 * M14, 2026-09-15).
 *
 * WHAT IS ENFORCED, AND WHERE. Every paid model call reserves a slot through
 * lib/ai/serviceGuard.ts before it runs. That server-side check reads these
 * settings on every request, so a pause or a new limit applies to the very next
 * request — no deploy, and no reliance on hiding a button.
 *
 * WHAT IS NOT DECIDED HERE FOR YOU. Blank allowances use the code defaults,
 * which are abuse ceilings chosen well above what one genuine user needs, not a
 * free-plan allowance. The free plan and a money budget are business decisions
 * (docs/SAAS_RELEASE_CHECKLIST.md). The counters are calls, not rupees: the
 * cost per call is on the AI Provider tab.
 */

const FIELD =
  'min-h-11 w-full rounded-ctl border border-line-strong bg-white px-3 py-2 text-[14px] text-ink outline-none focus:border-teal focus:ring-2 focus:ring-teal/20'

function StatLine({ stats }: { stats: ActionStats }) {
  const refused = stats.refused_limit + stats.refused_busy + stats.refused_global
  return (
    <span>
      {stats.succeeded} done · {stats.failed} failed · {refused} refused
      {refused > 0 ? ` (limit ${stats.refused_limit}, busy ${stats.refused_busy}, cap ${stats.refused_global})` : ''}
    </span>
  )
}

export default async function AdminServicesPage({
  searchParams,
}: {
  searchParams?: Promise<{ saved?: string; error?: string }>
}) {
  await requireAdmin()
  const params = (await searchParams) ?? {}
  const [{ groups, changes, error }, runs] = await Promise.all([loadServiceControls(), recentRetentionRuns(5)])
  const lastRun = runs[0]

  return (
    <PageShell
      title="Service controls"
      subtitle="Pause any AI service and set daily allowances. Changes apply to the next request — no deploy."
    >
      {params.error ? <Alert variant="danger">{decodeURIComponent(params.error)}</Alert> : null}
      {params.saved ? <Alert variant="success">{decodeURIComponent(params.saved)}</Alert> : null}
      {error ? <Alert variant="warning">{error}</Alert> : null}

      <Alert variant="warning" title="Defaults are safety ceilings, not your free plan">
        A blank &ldquo;per user per day&rdquo; uses the code default shown beside it — set high enough that a real
        job-seeker never meets it, low enough that a script cannot spend without end. Decide your free allowance and
        budget deliberately; counts here are AI calls, not money.
      </Alert>

      {groups.map((group) => (
        <section key={group.serviceKey} className="flex flex-col gap-3 border border-line bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1">
              <h2 className="font-display text-[17px] font-semibold text-ink">{group.serviceLabel}</h2>
              {group.enabled ? (
                <span className="w-fit rounded-full bg-teal-soft px-2 py-0.5 text-[12px] font-semibold text-teal">Available</span>
              ) : (
                <span className="w-fit rounded-full bg-alert-soft px-2 py-0.5 text-[12px] font-semibold text-alert">Paused</span>
              )}
            </div>
            <form action={setServicePausedAction} className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[320px]">
              <input type="hidden" name="serviceKey" value={group.serviceKey} />
              <input type="hidden" name="paused" value={group.enabled ? 'on' : ''} />
              {group.enabled ? (
                <label className="flex flex-col gap-1">
                  <span className="text-[12px] font-semibold text-ink-soft">Message users see while paused (optional)</span>
                  <input name="message" maxLength={300} placeholder="e.g. Back in an hour — nothing was used." className={FIELD} />
                </label>
              ) : group.pausedMessage ? (
                <p className="text-[12px] text-ink-muted">Users see: &ldquo;{group.pausedMessage}&rdquo;</p>
              ) : null}
              <Button type="submit" size="sm" variant={group.enabled ? 'danger' : 'primary'} busyLabel="Saving…" className="w-fit">
                {group.enabled ? 'Pause this service' : 'Resume this service'}
              </Button>
            </form>
          </div>

          {group.actions.map((a) => (
            <form key={a.action} action={updateServiceLimitsAction} className="flex flex-col gap-3 border-t border-line pt-3">
              <input type="hidden" name="action" value={a.action} />
              <div className="flex flex-col gap-0.5">
                <span className="text-[14px] font-semibold text-ink">{a.label}</span>
                <span className="text-[12px] text-ink-muted">{a.help}</span>
                <span className="text-[12px] text-ink-soft">
                  Today: <StatLine stats={a.today} /> · Last 7 days: <StatLine stats={a.week} />
                </span>
              </div>
              {a.usesQuota ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-[12px] font-semibold text-ink-soft">Per user per day (default {a.defaultDailyLimit})</span>
                    <input name="dailyLimit" inputMode="numeric" defaultValue={a.daily_limit_per_user ?? ''} placeholder={String(a.defaultDailyLimit)} className={FIELD} />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[12px] font-semibold text-ink-soft">All users per day (blank = no cap)</span>
                    <input name="globalLimit" inputMode="numeric" defaultValue={a.global_daily_limit ?? ''} placeholder="No cap" className={FIELD} />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[12px] font-semibold text-ink-soft">Requests at once per user (1–5)</span>
                    <input name="maxConcurrent" inputMode="numeric" defaultValue={a.max_concurrent_per_user} className={FIELD} />
                  </label>
                </div>
              ) : null}
              {a.usesQuota ? (
                <Button type="submit" size="sm" variant="secondary" busyLabel="Saving…" className="w-fit">
                  Save allowances
                </Button>
              ) : null}
            </form>
          ))}
        </section>
      ))}

      <section className="flex flex-col gap-3 border border-line bg-white p-4 sm:p-5">
        <h2 className="font-display text-[17px] font-semibold text-ink">Data clean-up</h2>
        <p className="text-[13px] leading-relaxed text-ink-soft">
          Deletes signed-out CV scans once their seven days are up, and old operational counters. Runs every night
          when the <code className="font-mono text-[12px]">CRON_SECRET</code> setting is configured on Vercel. Counts
          only — no CV content is read or logged.
        </p>
        {lastRun ? (
          <p className="text-[13px] text-ink-soft">
            Last run {new Date(lastRun.started_at).toLocaleString()} ({lastRun.trigger}) —{' '}
            {lastRun.ok === false
              ? `failed: ${lastRun.error ?? 'unknown error'}`
              : lastRun.ok
                ? Object.entries(lastRun.summary ?? {}).map(([k, v]) => `${v} ${k.replace(/_/g, ' ')}`).join(', ')
                : 'still running or interrupted'}
          </p>
        ) : (
          <p className="text-[13px] text-ink-muted">No clean-up has run yet.</p>
        )}
        <form action={runRetentionNowAction}>
          <Button type="submit" size="sm" variant="secondary" busyLabel="Running…">
            Run clean-up now
          </Button>
        </form>
      </section>

      <section className="flex flex-col gap-2 border border-line bg-white p-4 sm:p-5">
        <h2 className="font-display text-[17px] font-semibold text-ink">Recent changes</h2>
        {changes.length === 0 ? (
          <p className="text-[13px] text-ink-muted">No changes yet.</p>
        ) : (
          <ul className="flex flex-col gap-1.5 text-[12.5px] text-ink-soft">
            {changes.map((c) => (
              <li key={c.id}>
                {new Date(c.changed_at).toLocaleString()} · {ACTION_LABELS[c.action]?.label ?? c.action} ·{' '}
                {'enabled' in c.after_value
                  ? c.after_value.enabled
                    ? 'resumed'
                    : 'paused'
                  : `per user ${c.after_value.daily_limit_per_user ?? 'default'}, all users ${c.after_value.global_daily_limit ?? 'no cap'}, at once ${c.after_value.max_concurrent_per_user}`}
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageShell>
  )
}
