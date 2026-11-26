import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'
import { PageContainer, PageHeader, SectionCard } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { confirmReferralProfile } from './actions'
import { ReferralShare } from '@/components/referrals/ReferralShare'
import { loadReferralDashboard, REFERRAL_PAGE_SIZE } from '@/lib/referrals/dashboard'

export const dynamic = 'force-dynamic'

const STATUS: Record<string, string> = {
  pending_verification: 'Email verification pending',
  incomplete_profile: 'Career Profile incomplete',
  pending_qualification: 'Awaiting qualification',
  under_review: 'Under review',
  qualified: 'Qualified',
  rejected: 'Referral did not meet the qualification requirements',
}

const SOURCES: Record<string, string> = {
  referral: 'Referral', promotion: 'Promotion', admin_grant: 'Admin grant',
  purchase: 'Purchase', subscription: 'Subscription', correction: 'Correction',
}

const ACTIVITY: Record<string, string> = {
  grant: 'Credits added', reserve: 'Credits reserved', settle: 'Credits used', release: 'Reservation released',
  refund: 'Credits refunded', expire: 'Credits expired', reverse: 'Credits reversed',
}

const date = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Riyadh' })

const pageNumber = (raw?: string) => {
  const page = Number(raw)
  return Number.isInteger(page) && page > 0 && page <= 1000 ? page : 1
}

function Stats({ entries }: { entries: [string, number | string][] }) {
  return <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
    {entries.map(([label, value]) => <div key={label} className="min-w-0 border-b border-line py-2">
      <dt className="type-helper text-ink-soft">{label}</dt>
      <dd className="type-card text-ink">{value}</dd>
    </div>)}
  </dl>
}

function Pager({ activity, ledger, which, next }: { activity: number; ledger: number; which: 'activity' | 'ledger'; next: boolean }) {
  const current = which === 'activity' ? activity : ledger
  const href = (value: number) => '/settings/referrals?' + new URLSearchParams({
    activity: String(which === 'activity' ? value : activity),
    ledger: String(which === 'ledger' ? value : ledger),
  }).toString() + '#' + which
  return current > 1 || next ? <nav aria-label={which === 'activity' ? 'Referral activity pages' : 'Credit transaction pages'} className="mt-3 flex flex-wrap gap-4">
    {current > 1 && <Link className="min-h-11 py-2 type-label text-teal underline" href={href(current - 1)}>Previous</Link>}
    {next && current < 1000 && <Link className="min-h-11 py-2 type-label text-teal underline" href={href(current + 1)}>Next</Link>}
  </nav> : null
}

export default async function ReferralsPage({ searchParams }: { searchParams: Promise<{ activity?: string; ledger?: string; qualification?: string }> }) {
  const { data: { user } } = await (await createClient()).auth.getUser()
  if (!user) redirect('/login?redirectTo=%2Fsettings%2Freferrals')
  const params = await searchParams
  const activityPage = pageNumber(params.activity)
  const ledgerPage = pageNumber(params.ledger)
  const data = await loadReferralDashboard(user.id, activityPage, ledgerPage).catch(() => null)
  const credits = data?.sources.reduce((total, source) => ({
    available: total.available + source.available, reserved: total.reserved + source.reserved,
    earned: total.earned + source.earned, used: total.used + source.used,
  }), { available: 0, reserved: 0, earned: 0, used: 0 })

  return <AppShell><PageContainer className="grid min-w-0 gap-4">
    <PageHeader title="Referral & Credits" actions={<Link className="type-label text-teal underline" href="/settings">Back to Settings</Link>} />
    {data && credits ? <>
      {data.incoming && data.incoming !== 'qualified' && <SectionCard title="Your signup referral" id="joining">
        <p className="type-helper text-ink-soft">{STATUS[data.incoming] ?? data.incoming}.</p>
        {params.qualification === 'incomplete_profile' && <p role="status" className="mt-2 type-helper text-ink-soft">Save your name and at least one work role, education entry or skill, then confirm your profile.</p>}
        {params.qualification === 'error' && <p role="alert" className="mt-2 type-helper text-alert">Could not confirm your referral. Please try again.</p>}
        {['incomplete_profile', 'under_review', 'pending_qualification'].includes(data.incoming) && <>
          <Link href="/profile" className="my-2 inline-flex min-h-11 items-center type-label text-teal underline">Review Career Profile</Link>
          <form className="grid gap-3" action={confirmReferralProfile}>
            <label className="flex items-start gap-2 type-label"><input type="checkbox" required name="confirmed" className="mt-1 accent-teal" />I reviewed the information in my saved Career Profile.</label>
            <Button size="sm" className="justify-self-start" type="submit">Confirm Career Profile</Button>
          </form>
        </>}
      </SectionCard>}
      <SectionCard title="Credit balance">
        <Stats entries={[
          ['Available', credits.available], ...(credits.reserved ? [['Reserved', credits.reserved] as [string, number]] : []),
          ['Total earned', credits.earned], ['Total used', credits.used],
          ...data.sources.map(source => [SOURCES[source.source] ?? source.source, source.available] as [string, number]),
        ]} />
        {Object.keys(data.allowances).length > 0 && <p className="mt-3 type-helper text-ink-soft">
          Your <Link href="/settings?tab=package" className="text-teal underline">service-specific allowances</Link> can cover eligible runs before wallet credits.
        </p>}
      </SectionCard>
      <SectionCard title="Invite professionals" id="invite">
        <p className="mb-3 type-helper text-ink-soft">{data.config.enabled
          ? `Earn ${data.config.reward_units} credits when a new professional joins through your link, verifies their email and confirms an eligible Career Profile.`
          : 'Referral earning is currently paused.'}</p>
        {(data.config.enabled || data.url) && <ReferralShare initialUrl={data.url} suspended={data.suspended || !data.config.enabled} />}
      </SectionCard>
      <SectionCard title="Referral performance">
        <Stats entries={[
          ['Total visits', data.stats.visits], ['Estimated browsers · 90 days', data.stats.unique_browsers_90d],
          ['Referred registrations', data.stats.registrations], ['Email verification pending', data.stats.pending_verification],
          ['Incomplete profiles', data.stats.incomplete_profile], ['Awaiting qualification', data.stats.pending_qualification],
          ['Under review', data.stats.under_review], ['Qualified', data.stats.qualified], ['Rejected', data.stats.rejected],
          ['Referral credits earned', data.sources.find(source => source.source === 'referral')?.earned ?? 0],
          ['Conversion rate', data.stats.registrations ? `${Math.round(data.stats.qualified * 100 / data.stats.registrations)}%` : '—'],
        ]} />
        <p className="mt-3 type-helper text-ink-muted">Conversion is qualified referrals divided by attributed registrations. Estimated browsers can include multiple devices used by one person.</p>
      </SectionCard>
      <SectionCard title="Referral activity" id="activity">
        {data.activity.length ? <ul className="divide-y divide-line">
          {data.activity.slice(0, REFERRAL_PAGE_SIZE).map(item => <li key={item.id} className="flex flex-wrap justify-between gap-2 py-3 type-helper text-ink">
            <span>Referral {item.id.slice(0, 8).toUpperCase()} · {STATUS[item.status] ?? item.status}</span>
            <time dateTime={item.created_at}>{date.format(new Date(item.qualified_at ?? item.created_at))}</time>
          </li>)}
        </ul> : <p className="type-helper text-ink-soft">No referral activity on this page.</p>}
        <Pager activity={activityPage} ledger={ledgerPage} which="activity" next={data.activity.length > REFERRAL_PAGE_SIZE} />
      </SectionCard>
      <SectionCard title="Credit transactions" id="ledger">
        {data.ledger.length ? <ul className="divide-y divide-line">
          {data.ledger.slice(0, REFERRAL_PAGE_SIZE).map(transaction => <li key={transaction.id} className="flex flex-wrap justify-between gap-2 py-3 type-helper text-ink">
            <span>{ACTIVITY[transaction.kind] ?? transaction.kind} · {SOURCES[transaction.credit_lots.source] ?? transaction.credit_lots.source}</span>
            <span>{transaction.units} credits · <time dateTime={transaction.recorded_at}>{date.format(new Date(transaction.recorded_at))}</time></span>
          </li>)}
        </ul> : <p className="type-helper text-ink-soft">No credit transactions on this page.</p>}
        <Pager activity={activityPage} ledger={ledgerPage} which="ledger" next={data.ledger.length > REFERRAL_PAGE_SIZE} />
      </SectionCard>
    </> : <p role="alert" className="type-helper text-alert">Referral and credit information is temporarily unavailable. Reload the page to try again.</p>}
  </PageContainer></AppShell>
}
