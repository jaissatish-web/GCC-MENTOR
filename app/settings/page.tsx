import Image from 'next/image'
import Link from 'next/link'
import { UserRound } from 'lucide-react'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { pageNumber, ReferralDashboard } from '@/components/referrals/ReferralDashboard'
import { DeleteDataSection } from '@/components/settings/DeleteDataSection'
import { SettingsWorkspace } from '@/components/settings/SettingsWorkspace'
import { buttonVariants } from '@/components/ui/Button'
import { NotLiveText } from '@/components/ui/NotLive'
import { listServiceCreditsForUser } from '@/lib/admin/servicePackages'
import { formatInr, getPrice } from '@/lib/pricing'
import { loadReferralDashboard } from '@/lib/referrals/dashboard'
import { CTA, NAMES } from '@/lib/serviceLabels'
import { signedPhotoUrl } from '@/lib/storage/profilePhoto'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/serviceAdmin'

const legacySections = {
  account: 'account',
  email: 'security',
  package: 'credits',
  payments: 'payments',
  delete: 'privacy',
} as const

const number = new Intl.NumberFormat('en-GB')

const SERVICE_LABELS: Record<string, string> = {
  cover_letter: NAMES.coverLetter,
  resume_optimization: CTA.addTargetJob,
}

function serviceLabel(key: string): string {
  return SERVICE_LABELS[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-line py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <span className="type-helper font-medium text-ink-muted">{label}</span>
      <span className="break-words type-label font-semibold text-ink sm:text-right">
        {value}
      </span>
    </div>
  )
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-ctl border border-dashed border-line-strong bg-canvas px-4 py-6 text-center type-helper leading-relaxed text-ink-muted">
      {children}
    </div>
  )
}

async function loadIndicativePrice() {
  try {
    const { data } = await createServiceRoleClient({ fresh: true }).from('credit_wallet_settings')
      .select('pricing_visible').eq('singleton', true).maybeSingle()
    return data?.pricing_visible ? await getPrice('resume_optimization') : null
  } catch {
    return null
  }
}

export default async function SettingsPage({ searchParams }: {
  searchParams: Promise<{ tab?: string; activity?: string; ledger?: string; wallet?: string; qualification?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const params = await searchParams
  if (!user) redirect('/login?redirectTo=%2Fsettings')

  const initialSection = params.tab && Object.hasOwn(legacySections, params.tab)
    ? legacySections[params.tab as keyof typeof legacySections]
    : undefined
  const initialView = params.wallet === 'history' ? 'history' : 'referrals'
  const activityPage = pageNumber(params.activity)
  const ledgerPage = pageNumber(params.ledger)
  const [profileResult, serviceCredits, packages, wallet, indicativePrice] = await Promise.all([
    supabase.from('career_profiles').select('full_name, updated_at, photo_url').eq('user_id', user.id).maybeSingle(),
    listServiceCreditsForUser(user.id, 50).catch(() => null),
    supabase.from('packages')
      .select('id, target_job_title, created_at', { count: 'exact' })
      .eq('user_id', user.id).eq('is_paid', true).order('created_at', { ascending: false }).limit(25),
    loadReferralDashboard(user.id, activityPage, ledgerPage).catch(() => null),
    loadIndicativePrice(),
  ])

  const profile = profileResult.data
  const photo = await signedPhotoUrl(profile?.photo_url)
  const name: string | undefined = profile?.full_name?.trim()
  const initials = name?.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase()
  const memberSince = formatDate(user.created_at)
  const availableByService = (serviceCredits ?? []).filter(credit => !credit.consumedAt)
    .reduce<Record<string, number>>((totals, credit) => {
      totals[credit.serviceKey] = (totals[credit.serviceKey] ?? 0) + 1
      return totals
    }, {})
  const used = (serviceCredits ?? []).filter(credit => credit.consumedAt)
  const unlocked = packages.data ?? []

  return <AppShell>
    <SettingsWorkspace key={JSON.stringify(params)} initialSection={initialSection} initialView={initialView}
      memberSince={memberSince} balance={wallet ? number.format(wallet.totals.available) + ' credits' : 'Unavailable'}
      earned={wallet ? number.format(wallet.referralEarned) + ' credits' : 'Unavailable'}
      purchases={packages.error || packages.count === null ? 'Unavailable' : number.format(packages.count) + (packages.count === 1 ? ' package' : ' packages')}>
      {{
        account: <div className="flex flex-wrap items-center gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-full bg-[#087f76] text-xl font-semibold text-white sm:size-16">
              {photo ? <Image src={photo} alt="" width={64} height={64} unoptimized className="h-full w-full object-cover" />
                : initials || <UserRound size={26} aria-hidden="true" />}
            </div>
            <div className="min-w-0 space-y-1">
              <p className="break-words text-base font-semibold">{name || (profileResult.error ? 'Profile unavailable' : 'Name not set')}</p>
              <p className="w-fit rounded-md bg-[#edf3ff] px-2 py-1 text-xs">Member since <strong>{memberSince}</strong></p>
              <p className="text-xs text-ink-muted">Career Profile last updated {formatDate(profile?.updated_at ?? null)}</p>
            </div>
          </div>
          <Link href="/profile?view=details" className={buttonVariants({ variant: 'primary', className: 'w-full sm:w-auto' })}>
            <UserRound size={17} aria-hidden="true" /> Edit Career Profile
          </Link>
        </div>,
        security: <div>
          <Row label="Registered email" value={user.email ?? '—'} />
          <Row label="Email verification" value={user.email_confirmed_at ? <span className="text-teal">Confirmed</span> : 'Pending verification'} />
          <p className="my-3 text-sm text-ink-muted">Your registered email is used to sign in. Email changes are currently unavailable.</p>
          <Link href="/forgot-password" className={buttonVariants({ variant: 'secondary', className: 'w-full sm:w-auto' })}>Reset password</Link>
        </div>,
        credits: <div className="grid gap-4">
          <ReferralDashboard data={wallet} activityPage={activityPage} ledgerPage={ledgerPage} qualification={params.qualification} embedded />
          <details id="service-allowances" className="rounded-xl border border-line px-4">
            <summary className="flex min-h-11 cursor-pointer items-center font-semibold text-teal">Service allowances</summary>
            <div className="pb-4">
              {serviceCredits === null ? <p role="alert">Service allowances are temporarily unavailable.</p> : <>
              {Object.keys(availableByService).length > 0 ? (
                <ul className="flex flex-col gap-2.5">
                  {Object.entries(availableByService).map(([key, count]) => (
                    <li
                      key={key}
                      className="flex items-center justify-between gap-4 rounded-ctl border border-line bg-canvas px-4 py-3"
                    >
                      <span className="type-label font-semibold text-ink">
                        {serviceLabel(key)}
                      </span>
                      <span className="rounded-full bg-teal-soft px-2.5 py-1 type-caption font-semibold text-teal">
                        {count} available
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState>
                  No service-specific allowances yet.
                </EmptyState>
              )}

              {used.length > 0 ? (
                <div className="mt-5">
                  <h3 className="type-helper font-semibold text-ink">Recently used</h3>
                  <ul className="mt-2 flex flex-col">
                    {used.slice(0, 5).map((c) => (
                      <li
                        key={c.id}
                        className="flex items-center justify-between gap-4 border-b border-line py-2.5 last:border-b-0"
                      >
                        <span className="type-helper text-ink-soft">
                          {serviceLabel(c.serviceKey)}
                        </span>
                        <span className="type-caption text-ink-muted">
                          {formatDate(c.consumedAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              </>}
            </div>
          </details>
        </div>,
        payments: <div>
              {packages.error ? (
                <p role="alert">Purchase information is temporarily unavailable. Reload to try again.</p>
              ) : unlocked.length > 0 ? (
                <ul className="flex flex-col gap-2.5">
                  {unlocked.map((p) => (
                    <li
                      key={p.id as string}
                      className="flex flex-col gap-1 rounded-ctl border border-line bg-canvas px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                    >
                      <span className="min-w-0">
                        <span className="block truncate type-label font-semibold text-ink">
                          {(p.target_job_title as string) || 'Untitled resume'}
                        </span>
                        <span className="block type-caption text-ink-muted">
                          Unlocked {formatDate(p.created_at as string)}
                        </span>
                      </span>
                      <Link
                        href={`/package/${p.id as string}`}
                        className="inline-flex min-h-11 shrink-0 items-center rounded-ctl px-2 type-helper font-semibold text-teal hover:bg-teal-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
                      >
                        Open
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState>No unlocked resumes yet.</EmptyState>
              )}

              {indicativePrice && <p className="mt-5 type-helper text-ink-soft">Indicative future price · {indicativePrice.label} · {formatInr(indicativePrice.amountInr)}</p>}
              <p className="mt-5 rounded-ctl border border-alert/30 bg-alert-soft/40 px-4 py-3 type-helper leading-relaxed text-ink-soft">
                <NotLiveText>Online payments are disabled</NotLiveText>. See Credits &amp; Rewards for current ways to unlock premium services.
              </p>
        </div>,
        privacy: <DeleteDataSection />,
      }}
    </SettingsWorkspace>
  </AppShell>
}
