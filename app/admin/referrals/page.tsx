import Link from 'next/link'
import type { ReactNode } from 'react'
import { requireAdmin } from '@/lib/admin/adminAuth'
import { createServiceRoleClient } from '@/lib/supabase/serviceAdmin'
import { REFERRAL_TOKEN } from '@/lib/referrals/cookies'
import { CREDIT_SERVICES } from '@/lib/credits/services'
import { loadReferralDashboard } from '@/lib/referrals/dashboard'
import { PageShell } from '@/components/layout/PageShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { saveMonetizationAction } from './actions'

interface Totals {
  links: number
  visits: number
  unique_browsers_90d: number
  status_counts: Record<string, number>
  credits_issued: number
  credits_redeemed: number
  credits_available: number
  top_referrers: { referrer_id: string; qualified: number }[]
  recent_registrations: { day: string; registrations: number; qualified: number }[]
  average_cost_per_credit_inr?: number | null
}

const fieldClass = 'grid gap-1 type-label text-ink'
const LINK_CLASS = 'type-label text-teal underline'

function ActionForm({ action, subject, user, label, children }: {
  action: string; subject?: string; user?: string; label: string; children?: ReactNode
}) {
  return <form action={saveMonetizationAction} className="grid gap-3 sm:grid-cols-2">
    <input type="hidden" name="operation" value={crypto.randomUUID()} />
    <input type="hidden" name="action" value={action} />
    {subject && <input type="hidden" name="subject" value={subject} />}
    {user && <input type="hidden" name="user" value={user} />}
    {children}
    <label className={fieldClass + ' sm:col-span-2'}>Reason <Input name="reason" maxLength={500} required /></label>
    <Button className="justify-self-start" type="submit" size="sm">{label}</Button>
  </form>
}

function Numeric({ label, name, value, max, required = true }: { label: string; name: string; value: number; max: number; required?: boolean }) {
  return <label className={fieldClass}>{label}<Input name={name} type="number" min={1} max={max} defaultValue={value} required={required} /></label>
}

function Toggle({ label, name, enabled }: { label: string; name: string; enabled: boolean }) {
  return <label className="flex min-h-11 items-center gap-2 type-label text-ink">
    <input name={name} type="checkbox" defaultChecked={enabled} className="accent-teal" />{label}
  </label>
}

export default async function AdminReferrals({ searchParams }: { searchParams: Promise<{ user?: string; result?: string }> }) {
  const admin = await requireAdmin()
  const params = await searchParams
  const user = REFERRAL_TOKEN.test(params.user ?? '') ? params.user : undefined
  const db = createServiceRoleClient({ fresh: true })
  const [summary, settings, prices, wallet, queue, detail, audit, lots] = await Promise.all([
    db.rpc('admin_monetization_summary', { p_admin: admin.id }),
    db.from('referral_program_settings').select('*').eq('singleton', true).single(),
    db.from('credit_service_prices').select('service, units'),
    db.from('credit_wallet_settings').select('enforcement_enabled, pricing_visible').eq('singleton', true).single(),
    db.from('referral_attributions').select('id, referrer_id, referred_id, status, reason_code, created_at')
      .in('status', ['under_review', 'pending_qualification']).order('created_at', { ascending: true }).limit(30),
    user ? loadReferralDashboard(user, 1, 1).catch(() => null) : null,
    db.from('monetization_admin_audit').select('admin_id, user_id, action, reason, created_at').order('created_at', { ascending: false }).limit(15),
    user ? db.from('credit_lots').select('id, source, units, issued_at').eq('owner_id', user).order('issued_at', { ascending: false }).limit(15) : null,
  ])
  const totals = summary.data as Totals | null
  const config = settings.data
  const configuredPrices = new Map((prices.data ?? []).map(price => [price.service, price.units]))
  const errors = [summary, settings, prices, wallet, queue, audit, lots].some(query => query?.error)
  const resultText: Record<string, string> = {
    saved: 'Change saved.', qualified: 'Referral approved and credits issued.', rejected: 'Referral rejected.',
    pending_qualification: 'Reward issuance is paused. This referral remains pending.',
    incomplete_profile: 'The candidate needs to review and confirm their current Career Profile.',
    error: 'The change could not be saved. Check the fields and try again.',
  }
  const statusKeys = ['pending_verification', 'incomplete_profile', 'pending_qualification', 'under_review', 'qualified', 'rejected']
  const countRegistrations = totals ? statusKeys.reduce((sum, key) => sum + (totals.status_counts[key] ?? 0), 0) : 0

  return <PageShell title="Referrals and credits" subtitle="Review referrals, manage credits and configure service access.">
    <Link className={LINK_CLASS} href="/admin/users">Find a user</Link>
    {errors && <p role="alert" className="type-helper text-alert">Some referral administration data is unavailable.</p>}
    {params.result && resultText[params.result] && <p role={params.result === 'error' ? 'alert' : 'status'} className="type-helper text-ink">{resultText[params.result]}</p>}

    {totals && <Card className="grid gap-4 p-5">
      <h2 className="type-card text-ink">Program totals</h2>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          ['Referral links', totals.links], ['Visits', totals.visits], ['Estimated browsers · 90 days', totals.unique_browsers_90d],
          ['Referred registrations', countRegistrations], ['Credits issued', totals.credits_issued],
          ['Credits redeemed', totals.credits_redeemed], ['Available credits', totals.credits_available],
          ['Estimated AI exposure', totals.average_cost_per_credit_inr == null ? 'Awaiting usage data'
            : '₹' + (totals.average_cost_per_credit_inr * totals.credits_available).toFixed(2)],
          ...statusKeys.map(key => [key.replaceAll('_', ' '), totals.status_counts[key] ?? 0]),
        ].map(([label, value]) => <div key={label} className="min-w-0 border-b border-line pb-2"><dt className="type-helper capitalize text-ink-soft">{label}</dt><dd className="type-label text-ink">{value}</dd></div>)}
      </dl>
      <details><summary className="min-h-11 cursor-pointer type-label">Daily referral registrations · 30 days</summary>
        <ul className="grid gap-2">{totals.recent_registrations.length ? totals.recent_registrations.map(row => <li key={row.day} className="type-helper text-ink-soft">{row.day} · {row.registrations} registered · {row.qualified} qualified</li>) : <li className="type-helper text-ink-soft">No recent registrations.</li>}</ul>
      </details>
      <details><summary className="min-h-11 cursor-pointer type-label">Top referrers</summary>
        <ul className="grid gap-2">{totals.top_referrers.length ? totals.top_referrers.map(row => <li key={row.referrer_id} className="type-helper"><Link className={LINK_CLASS} href={'/admin/referrals?user=' + row.referrer_id}>{row.referrer_id.slice(0, 8)}</Link> · {row.qualified} qualified</li>) : <li className="type-helper text-ink-soft">No qualified referrals yet.</li>}</ul>
      </details>
    </Card>}

    {user && detail && <Card className="grid gap-4 p-5">
      <h2 className="type-card text-ink">Selected user · {user.slice(0, 8)}</h2>
      <p className="type-helper text-ink-soft">{detail.stats.registrations} registrations · {detail.stats.qualified} qualified · {detail.sources.reduce((sum, item) => sum + item.available, 0)} available credits</p>
      <div className="flex flex-wrap gap-3"><Link className={LINK_CLASS} href={'/admin/users?user=' + user + '#complimentary-service'}>Approve free service uses</Link><Link className={LINK_CLASS} href="/admin/services">AI service controls</Link></div>
      {detail.url && <ActionForm action="suspend_link" subject={user} user={user} label="Update referral link">
        <Toggle name="suspended" enabled={detail.suspended} label="Suspend referral link" />
      </ActionForm>}
      <ActionForm action="grant_wallet" subject={user} user={user} label="Grant wallet credits">
        <label className={fieldClass}>Source<select name="source" className="min-h-11 rounded-ctl border border-line bg-white px-3">
          <option value="admin_grant">Admin grant</option><option value="promotion">Promotion</option><option value="correction">Correction</option>
        </select></label>
        <Numeric label="Credits" name="units" value={1} max={100000} />
        <label className={fieldClass}>Expiry date · optional <Input name="expires_at" type="date" /></label>
      </ActionForm>
      <details><summary className="min-h-11 cursor-pointer type-label">Referral history</summary>
        <ul className="grid gap-2">{detail.activity.map(row => <li key={row.id} className="type-helper text-ink-soft">{row.id.slice(0, 8)} · {row.status.replaceAll('_', ' ')} · {row.created_at.slice(0, 10)}</li>)}</ul>
      </details>
      <details><summary className="min-h-11 cursor-pointer type-label">Credit transaction history</summary>
        <ul className="grid gap-2">{detail.ledger.map(row => <li key={row.id} className="type-helper text-ink-soft">{row.kind} · {row.units} · {row.credit_lots.source} · {row.recorded_at.slice(0, 10)}</li>)}</ul>
      </details>
      {!!lots?.data?.length && <details><summary className="min-h-11 cursor-pointer type-label">Reverse available credits</summary>
        <ActionForm action="reverse_wallet" user={user} label="Reverse credits">
          <label className={fieldClass}>Credit grant<select required name="subject" className="min-h-11 max-w-full rounded-ctl border border-line bg-white px-3">
            {lots.data.map(lot => <option key={lot.id} value={lot.id}>{lot.issued_at.slice(0, 10)} · {lot.source} · issued {lot.units} · {lot.id.slice(0, 8)}</option>)}
          </select></label>
          <Numeric label="Credits to reverse" name="units" value={1} max={100000} />
        </ActionForm>
      </details>}
    </Card>}

    <Card className="grid gap-4 p-5">
      <h2 className="type-card text-ink">Qualification queue</h2>
      {queue.data?.length ? queue.data.map(row => <div key={row.id} className="grid gap-2 border-b border-line pb-4">
        <p className="type-label text-ink">{row.id.slice(0, 8)} · {row.status.replaceAll('_', ' ')} · {row.reason_code?.replaceAll('_', ' ')}</p>
        <div className="flex flex-wrap gap-3">
          <Link className={LINK_CLASS} href={'/admin/referrals?user=' + row.referrer_id}>Referrer</Link>
          {row.referred_id && <Link className={LINK_CLASS} href={'/admin/users?user=' + row.referred_id}>Referred account</Link>}
        </div>
        {row.referred_id && <ActionForm action="review_referral" subject={row.id} user={user} label="Save review">
          <label className={fieldClass}>Decision<select name="decision" className="min-h-11 rounded-ctl border border-line bg-white px-3">
            <option value="approve">Approve</option><option value="reject">Reject</option>
          </select></label>
        </ActionForm>}
      </div>) : <p className="type-helper text-ink-soft">No referrals are awaiting review.</p>}
    </Card>

    {config && <Card className="grid gap-4 p-5">
      <h2 className="type-card text-ink">Referral settings</h2>
      <ActionForm action="configure_referrals" label="Save referral settings">
        <Toggle name="enabled" enabled={config.enabled} label="Enable referral program" />
        <Toggle name="issuance_paused" enabled={config.issuance_paused} label="Pause issuing rewards" />
        <Numeric label="Credits per qualified referral" name="reward_units" value={config.reward_units} max={1000} />
        <Numeric label="Attribution window (days)" name="attribution_days" value={config.attribution_days} max={90} />
        <Numeric label="Hourly visits per browser" name="hourly_visit_threshold" value={config.hourly_visit_threshold} max={10000} />
        <Numeric label="Daily rewards before manual review" name="daily_reward_review_threshold" value={config.daily_reward_review_threshold} max={10000} />
      </ActionForm>
      <p className="type-helper text-ink-soft">Qualification policy v{config.qualification_policy_version}. New referral credits have no expiry.</p>
    </Card>}

    {wallet.data && <Card className="grid gap-4 p-5">
      <h2 className="type-card text-ink">Wallet and pricing settings</h2>
      <ActionForm action="configure_wallet" label="Save wallet settings">
        <Toggle name="enforcement_enabled" enabled={wallet.data.enforcement_enabled} label="Require credits or an existing service allowance" />
        <Toggle name="pricing_visible" enabled={wallet.data.pricing_visible} label="Show indicative pricing" />
        {Object.entries(CREDIT_SERVICES).map(([key, label]) => <Numeric key={key} label={label + ' cost'} name={key} value={configuredPrices.get(key) ?? 1} max={1000} />)}
      </ActionForm>
      <p className="type-helper text-ink-soft">Checkout, subscriptions and direct credit purchases are disabled.</p>
    </Card>}

    <Card className="grid gap-3 p-5">
      <h2 className="type-card text-ink">Recent audit entries</h2>
      <ul className="divide-y divide-line">
        {audit.data?.map((entry, index) => <li key={index} className="break-words py-2 type-helper text-ink-soft">
          {entry.created_at.slice(0, 16).replace('T', ' ')} UTC · {entry.action.replaceAll('_', ' ')} · {entry.admin_id?.slice(0, 8)} · {entry.reason}
        </li>)}
      </ul>
    </Card>
  </PageShell>
}
