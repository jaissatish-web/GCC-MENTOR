import Link from 'next/link'
import {
  ArrowDownLeft, ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight, CircleCheck, CircleX,
  Clock3, Coins, Gift, Link2, List, UserRoundCheck, Wallet,
} from 'lucide-react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'
import { PageContainer } from '@/components/layout/PageHeader'
import { Button, buttonVariants } from '@/components/ui/Button'
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
  rejected: 'Did not qualify',
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

const number = new Intl.NumberFormat('en-GB')
const panel = 'min-w-0 rounded-2xl border border-[#dee7ed] bg-white p-4 sm:p-5'
const heading = 'text-ink'
const pagerLink = buttonVariants({ variant: 'secondary', size: 'sm' })

function Stats({ entries }: { entries: [string, number | string][] }) {
  return <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
    {entries.map(([label, value]) => <div key={label} className="min-w-0">
      <dt className="text-ink-soft">{label}</dt>
      <dd className="font-semibold tabular-nums">{typeof value === 'number' ? number.format(value) : value}</dd>
    </div>)}
  </dl>
}

function Pager({ activity, ledger, which, next }: { activity: number; ledger: number; which: 'activity' | 'ledger'; next: boolean }) {
  const current = which === 'activity' ? activity : ledger
  const href = (value: number) => '/settings/referrals?' + new URLSearchParams({
    activity: String(which === 'activity' ? value : activity),
    ledger: String(which === 'ledger' ? value : ledger),
  }).toString() + '#' + which
  return current > 1 || next ? <nav aria-label={which === 'activity' ? 'Referral activity pages' : 'Credit transaction pages'} className="mt-3 flex flex-wrap gap-2">
    {current > 1 && <Link className={pagerLink} href={href(current - 1)}><ChevronLeft size={14} aria-hidden="true" /> Previous</Link>}
    {next && current < 1000 && <Link className={pagerLink} href={href(current + 1)}>Next <ChevronRight size={14} aria-hidden="true" /></Link>}
  </nav> : null
}

function ActivityIcon({ icon: Icon, tone = 'neutral' }: { icon: typeof Clock3; tone?: 'positive' | 'negative' | 'neutral' }) {
  const colors = { positive: 'bg-[#e5f5ed] text-[#146849]', negative: 'bg-[#fff0ee] text-[#9b4034]', neutral: 'bg-[#edf3f8] text-[#48627c]' }
  return <span className={`grid size-9 shrink-0 place-items-center rounded-full ${colors[tone]}`}><Icon size={17} aria-hidden="true" /></span>
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

  return <AppShell><PageContainer width="wide" className="grid min-w-0 [--ui-h1-size:1.375rem] [--ui-h2-size:1.0625rem] [--ui-page-gap:1rem] [--ui-page-top:1rem] [--ui-weight-title:600] sm:[--ui-h1-size:1.625rem]">
    <header className="flex flex-wrap items-center justify-between gap-2">
      <h1 className="text-ink">Referral &amp; Credits</h1>
      <Link className={pagerLink} href="/settings"><ChevronLeft size={15} aria-hidden="true" /> Settings</Link>
    </header>
    {data && credits ? <>
      <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,4fr)_minmax(0,5fr)]">
        <section data-workspace-card="gradient" aria-labelledby="wallet-heading" className="min-w-0 rounded-2xl border p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 id="wallet-heading">Credit wallet</h2>
            <span className="grid size-9 place-items-center rounded-lg border border-white/25 bg-white/10 text-teal"><Wallet size={18} aria-hidden="true" /></span>
          </div>
          <dl className="mt-1.5">
            <div>
              <dt className="text-sm text-ink-soft">Available credits</dt>
              <dd><span className="break-words text-[2.125rem] font-semibold leading-tight tabular-nums tracking-tight text-white">{number.format(credits.available)}</span></dd>
            </div>
            <div className={`mt-2.5 grid ${credits.reserved ? 'grid-cols-3' : 'grid-cols-2'} gap-2 border-t border-white/25 pt-2.5 text-sm`}>
              {([
                ['Total earned', credits.earned],
                ['Total used', credits.used],
                ...(credits.reserved ? [['Reserved', credits.reserved] as const] : []),
              ] as const).map(([label, amount]) => <div key={label}>
                <dt className="text-ink-soft">{label}</dt>
                <dd><span className="break-words text-base font-semibold tabular-nums text-white">{number.format(amount)}</span></dd>
              </div>)}
            </div>
          </dl>
          {data.sources.length > 0 && <details className="mt-1">
            <summary className="flex min-h-11 w-fit cursor-pointer items-center text-sm font-semibold text-teal focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">Balance by source</summary>
            <dl className="grid gap-2 border-t border-white/25 pt-2 text-sm">
              {data.sources.map(source => <div key={source.source} className="flex justify-between gap-2 text-ink-soft">
                <dt>{SOURCES[source.source] ?? source.source}</dt><dd className="tabular-nums">{number.format(source.available)}</dd>
              </div>)}
            </dl>
          </details>}
          {Object.keys(data.allowances).length > 0 && <p className="mt-2 text-sm text-ink-soft">
            <Link href="/settings?tab=package" className="font-semibold text-teal underline">Service allowances</Link> can cover eligible runs before wallet credits.
          </p>}
        </section>

        <section id="invite" aria-labelledby="invite-heading" className={`${panel} scroll-mt-20`}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 id="invite-heading" className={heading}>Invite professionals</h2>
            {data.config.enabled && <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fff2d5] px-2.5 py-1 text-sm font-semibold text-[#714c15]">
              <Gift size={15} aria-hidden="true" /> +{number.format(data.config.reward_units)} {data.config.reward_units === 1 ? 'credit' : 'credits'}
            </span>}
          </div>
          {data.config.enabled
            ? <p className="mb-3 text-sm text-ink-soft">Earn credits for each qualified referral.</p>
            : <p className="mb-3 text-sm text-ink-soft">Referral earning is currently paused.</p>}
          {(data.config.enabled || data.url) && <ReferralShare initialUrl={data.url} suspended={data.suspended || !data.config.enabled} />}
          {data.config.enabled && <div className="mt-2 border-t border-line pt-3">
            <ol aria-label="How referrals qualify" className="grid grid-cols-3 gap-2 text-center text-xs font-medium text-ink">
              {([
                [Link2, 'Join via link'],
                [CircleCheck, 'Verify email'],
                [UserRoundCheck, 'Confirm profile'],
              ] as const).map(([Icon, label], index) => <li key={label} className="relative grid justify-items-center gap-1.5">
                <span className="grid size-8 place-items-center rounded-lg bg-[#e8f4f0] text-[#146849]"><Icon size={16} aria-hidden="true" /></span>
                {index < 2 && <ArrowRight size={15} aria-hidden="true" className="absolute top-2 -right-2.5 text-[#62788b]" />}
                <span>{label}</span>
              </li>)}
            </ol>
            <p className="mt-2.5 text-xs leading-relaxed text-ink-soft">For new accounts. The saved Career Profile must include a name and at least one work role, education entry or skill.</p>
          </div>}
        </section>
      </div>

      {data.incoming && data.incoming !== 'qualified' && <section id="joining" aria-labelledby="joining-heading" className={`${panel} scroll-mt-20`}>
        <h2 id="joining-heading" className={heading}>Your signup referral</h2>
        <p className="mt-2 text-sm text-ink-soft">{STATUS[data.incoming] ?? data.incoming}.</p>
        {params.qualification === 'incomplete_profile' && <p role="status" className="mt-2 text-sm text-ink-soft">Save your name and at least one work role, education entry or skill, then confirm your profile.</p>}
        {params.qualification === 'error' && <p role="alert" className="mt-2 text-sm text-alert">Could not confirm your referral. Please try again.</p>}
        {['incomplete_profile', 'under_review', 'pending_qualification'].includes(data.incoming) && <>
          <Link href="/profile" className="inline-flex min-h-11 items-center text-sm font-semibold text-teal underline">Review Career Profile</Link>
          <form className="grid gap-2" action={confirmReferralProfile}>
            <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" required name="confirmed" className="size-4 shrink-0 accent-teal" />I reviewed the information in my saved Career Profile.</label>
            <Button size="sm" className="justify-self-start" type="submit">Confirm Career Profile</Button>
          </form>
        </>}
      </section>}

      <div className="grid min-w-0 items-start gap-4 lg:grid-cols-2">
        <section id="activity" aria-labelledby="activity-heading" className={`${panel} scroll-mt-20`}>
          <h2 id="activity-heading" className={heading}>Referral status</h2>
          <dl className="my-3 grid grid-cols-3 gap-2 rounded-lg bg-[#f2f6fa] p-3 text-sm">
            {([
              ['Visits', data.stats.visits],
              ['Joined', data.stats.registrations],
              ['Qualified', data.stats.qualified],
            ] as const).map(([label, amount]) => <div key={label}>
              <dt className="text-xs text-ink-soft">{label}</dt>
              <dd className="break-words font-semibold tabular-nums">{number.format(amount)}</dd>
            </div>)}
          </dl>
          {data.activity.length ? <ul className="divide-y divide-line">
            {data.activity.slice(0, REFERRAL_PAGE_SIZE).map(item => {
              const qualified = item.status === 'qualified'
              const declined = item.status === 'rejected'
              const recorded = item.qualified_at ?? item.created_at
              return <li key={item.id} className="flex items-center gap-2.5 py-2.5 text-sm">
                <ActivityIcon icon={qualified ? CircleCheck : declined ? CircleX : Clock3} tone={qualified ? 'positive' : declined ? 'negative' : 'neutral'} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{STATUS[item.status] ?? item.status}</p>
                  <p className="text-xs text-ink-soft">Referral {item.id.slice(0, 8).toUpperCase()}</p>
                </div>
                <time className="shrink-0 text-right text-xs text-ink-soft" dateTime={recorded}>{date.format(new Date(recorded))}</time>
              </li>
            })}
          </ul> : <p className="py-2 text-sm text-ink-soft">{activityPage === 1 ? 'New referrals will appear here.' : 'No referrals on this page.'}</p>}
          <Pager activity={activityPage} ledger={ledgerPage} which="activity" next={data.activity.length > REFERRAL_PAGE_SIZE} />
          <details className="mt-1 border-t border-line">
            <summary className="flex min-h-11 w-fit cursor-pointer items-center gap-2 text-sm font-semibold text-teal"><List size={16} aria-hidden="true" /> Referral insights</summary>
            <Stats entries={[
              ['Estimated browsers (90 days)', data.stats.unique_browsers_90d],
              ['Email verification pending', data.stats.pending_verification],
              ['Incomplete profiles', data.stats.incomplete_profile], ['Awaiting qualification', data.stats.pending_qualification],
              ['Under review', data.stats.under_review], ['Rejected', data.stats.rejected],
              ['Referral credits earned', data.sources.find(source => source.source === 'referral')?.earned ?? 0],
              ['Conversion rate', data.stats.registrations ? `${Math.round(data.stats.qualified * 100 / data.stats.registrations)}%` : '—'],
            ]} />
            <p className="mt-2 text-xs leading-relaxed text-ink-soft">Conversion is qualified referrals divided by attributed registrations. Estimated browsers can include multiple devices used by one person.</p>
          </details>
        </section>

        <section id="ledger" aria-labelledby="ledger-heading" className={`${panel} scroll-mt-20`}>
          <h2 id="ledger-heading" className={heading}>Credit history</h2>
          {data.ledger.length ? <ul className="mt-2 divide-y divide-line">
            {data.ledger.slice(0, REFERRAL_PAGE_SIZE).map(transaction => {
              const { kind, units, recorded_at, credit_lots } = transaction
              const added = kind === 'grant' || kind === 'refund'
              const deducted = kind === 'settle' || kind === 'expire' || kind === 'reverse'
              return <li key={transaction.id} className="flex items-center gap-2.5 py-2.5 text-sm">
                <ActivityIcon icon={added ? ArrowDownLeft : deducted ? ArrowUpRight : Coins} tone={added ? 'positive' : deducted ? 'negative' : 'neutral'} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{ACTIVITY[kind] ?? kind}</p>
                  <p className="text-xs text-ink-soft">{SOURCES[credit_lots.source] ?? credit_lots.source}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={`font-semibold tabular-nums ${added ? 'text-[#146849]' : deducted ? 'text-[#9b4034]' : 'text-ink'}`}>{added ? '+' : deducted ? '−' : ''}{number.format(units)} <span className="text-xs font-normal">{units === 1 ? 'credit' : 'credits'}</span></p>
                  <time className="block text-xs text-ink-soft" dateTime={recorded_at}>{date.format(new Date(recorded_at))}</time>
                </div>
              </li>
            })}
          </ul> : <p className="mt-3 text-sm text-ink-soft">{ledgerPage === 1 ? 'Credit transactions will appear here.' : 'No credit transactions on this page.'}</p>}
          <Pager activity={activityPage} ledger={ledgerPage} which="ledger" next={data.ledger.length > REFERRAL_PAGE_SIZE} />
        </section>
      </div>
    </> : <p role="alert" className="text-sm text-alert">Referral and credit information is temporarily unavailable. Reload the page to try again.</p>}
  </PageContainer></AppShell>
}
