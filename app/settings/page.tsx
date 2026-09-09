import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { listServiceCreditsForUser } from '@/lib/admin/servicePackages'
import { DeleteDataSection } from '@/components/settings/DeleteDataSection'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader, PageContainer, SectionCard } from '@/components/layout/PageHeader'
import { cn } from '@/lib/utils'

/**
 * Settings — Account · Email · Current Package · Payments · Delete Data.
 *
 * Previously this page contained only the data-deletion block (TASK-037).
 * The four sections above it are new *presentation* of data that already
 * existed; none of them introduces a new table, column or write path.
 *
 * Tabs are plain links driven by ?tab=, not client state, so the page stays
 * a Server Component, every section is linkable/bookmarkable, and it works
 * with JavaScript disabled. `/payments` redirects into ?tab=payments.
 *
 * SERVICE-ROLE NOTE: user_service_credits is service-role-only by design
 * (migration 026 grants no policy to `authenticated`), so the credit read
 * below necessarily uses the admin helper. It is called with `user.id` taken
 * from the verified server session and never from a query param, so a caller
 * cannot address another user's credits.
 */

const TABS = [
  { id: 'account', label: 'Account' },
  { id: 'email', label: 'Email' },
  { id: 'package', label: 'Current Package' },
  { id: 'payments', label: 'Payments' },
  { id: 'delete', label: 'Delete Data' },
] as const

type TabId = (typeof TABS)[number]['id']

/** Friendly names for the service keys that exist today; unknown keys degrade to a readable form. */
const SERVICE_LABELS: Record<string, string> = {
  cover_letter: 'Cover Letter',
  resume_optimization: 'Resume Optimization',
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
      <span className="text-[13px] font-medium text-ink-muted">{label}</span>
      <span className="break-words text-[14px] font-semibold text-ink sm:text-right">
        {value}
      </span>
    </div>
  )
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-ctl border border-dashed border-line-strong bg-canvas px-4 py-6 text-center text-[13px] leading-relaxed text-ink-muted">
      {children}
    </div>
  )
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const params = await searchParams
  const requested = params?.tab
  const tab: TabId = (TABS.find((t) => t.id === requested)?.id ?? 'account') as TabId

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // middleware already guarantees a session on /settings; this is a type guard.
  if (!user) {
    return (
      <AppShell>
        <PageContainer>
          <PageHeader title="Settings" />
          <div className="mt-6">
            <EmptyState>Your session has expired. Please log in again.</EmptyState>
          </div>
        </PageContainer>
      </AppShell>
    )
  }

  const { data: profile } = await supabase
    .from('career_profiles')
    .select('full_name, updated_at')
    .eq('user_id', user.id)
    .maybeSingle()

  const credits = await listServiceCreditsForUser(user.id, 50)
  const available = credits.filter((c) => !c.consumedAt)
  const used = credits.filter((c) => c.consumedAt)

  // Group available credits by service for the "what you currently hold" view.
  const availableByService = available.reduce<Record<string, number>>((acc, c) => {
    acc[c.serviceKey] = (acc[c.serviceKey] ?? 0) + 1
    return acc
  }, {})

  const { data: paidPackages } = await supabase
    .from('packages')
    .select('id, target_job_title, target_country, created_at, is_paid')
    .eq('user_id', user.id)
    .eq('is_paid', true)
    .order('created_at', { ascending: false })
    .limit(25)

  const unlocked = paidPackages ?? []

  return (
    <AppShell>
      <PageContainer>
        <PageHeader
          title="Settings"
          description="Your account, your access, and control over your data."
        />

        {/* Tabs — real links, so each section is bookmarkable and keyboard-navigable */}
        <nav aria-label="Settings sections" className="mt-6 border-b border-line">
          <ul className="-mb-px flex flex-wrap gap-1">
            {TABS.map((t) => {
              const active = t.id === tab
              return (
                <li key={t.id}>
                  <Link
                    href={`/settings?tab=${t.id}`}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex min-h-11 items-center rounded-t-radius-md px-3.5 text-[13px] font-redesign-sans transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
                      active
                        ? 'border-b-2 border-teal font-semibold text-teal'
                        : 'border-b-2 border-transparent font-medium text-ink-muted hover:text-ink'
                    )}
                  >
                    {t.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="mt-6 flex flex-col gap-5">
          {tab === 'account' && (
            <SectionCard
              title="Account"
              helper="Your name comes from your Career Profile — edit it there and it updates everywhere."
              actions={
                <Link
                  href="/profile"
                  className="flex min-h-11 items-center rounded-ctl border border-line-strong px-4 text-[13px] font-semibold text-ink transition-colors hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
                >
                  Edit Career Profile
                </Link>
              }
            >
              <div className="flex flex-col">
                <Row label="Name" value={profile?.full_name?.trim() || 'Not set yet'} />
                <Row label="Member since" value={formatDate(user.created_at)} />
                <Row label="Profile last updated" value={formatDate(profile?.updated_at ?? null)} />
              </div>
            </SectionCard>
          )}

          {tab === 'email' && (
            <SectionCard
              title="Email"
              helper="Where you sign in and where account messages go."
            >
              <div className="flex flex-col">
                <Row label="Email address" value={user.email ?? '—'} />
                <Row
                  label="Status"
                  value={
                    user.email_confirmed_at ? (
                      <span className="text-teal">Confirmed</span>
                    ) : (
                      <span className="text-amber">Not confirmed</span>
                    )
                  }
                />
              </div>
              <p className="mt-4 text-[12px] leading-relaxed text-ink-muted">
                You cannot change your sign-in email here yet. Deleting your data does not delete your login.
              </p>
            </SectionCard>
          )}

          {tab === 'package' && (
            <SectionCard
              title="Current Package"
              helper="One-off services, not a subscription — so what you hold is service credits."
            >
              {Object.keys(availableByService).length > 0 ? (
                <ul className="flex flex-col gap-2.5">
                  {Object.entries(availableByService).map(([key, count]) => (
                    <li
                      key={key}
                      className="flex items-center justify-between gap-4 rounded-ctl border border-line bg-canvas px-4 py-3"
                    >
                      <span className="text-[14px] font-semibold text-ink">
                        {serviceLabel(key)}
                      </span>
                      <span className="rounded-full bg-teal-soft px-2.5 py-1 text-[12px] font-bold text-teal">
                        {count} available
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState>
                  No credits yet. They arrive when you buy a service or redeem a code.
                </EmptyState>
              )}

              {used.length > 0 ? (
                <div className="mt-5">
                  <h3 className="text-[13px] font-semibold text-ink">Recently used</h3>
                  <ul className="mt-2 flex flex-col">
                    {used.slice(0, 5).map((c) => (
                      <li
                        key={c.id}
                        className="flex items-center justify-between gap-4 border-b border-line py-2.5 last:border-b-0"
                      >
                        <span className="text-[13px] text-ink-soft">
                          {serviceLabel(c.serviceKey)}
                        </span>
                        <span className="text-[12px] text-ink-muted">
                          {formatDate(c.consumedAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </SectionCard>
          )}

          {tab === 'payments' && (
            <SectionCard
              title="Payments"
              helper="What you have unlocked so far."
            >
              {unlocked.length > 0 ? (
                <ul className="flex flex-col gap-2.5">
                  {unlocked.map((p) => (
                    <li
                      key={p.id as string}
                      className="flex flex-col gap-1 rounded-ctl border border-line bg-canvas px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[14px] font-semibold text-ink">
                          {(p.target_job_title as string) || 'Untitled resume'}
                        </span>
                        <span className="block text-[12px] text-ink-muted">
                          Unlocked {formatDate(p.created_at as string)}
                        </span>
                      </span>
                      <Link
                        href={`/package/${p.id as string}`}
                        className="shrink-0 text-[13px] font-semibold text-teal hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
                      >
                        Open
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState>You have not unlocked any paid resumes yet.</EmptyState>
              )}

              <p className="mt-5 rounded-ctl border border-line bg-canvas px-4 py-3 text-[12px] leading-relaxed text-ink-muted">
                Card payment is not switched on yet, so there is nothing to show here. Access is granted directly or by redeeming a code.
              </p>
            </SectionCard>
          )}

          {tab === 'delete' && <DeleteDataSection />}
        </div>
      </PageContainer>
    </AppShell>
  )
}
