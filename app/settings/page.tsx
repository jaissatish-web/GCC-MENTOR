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
  job_match: 'Job Match',
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
    <div className="flex flex-col gap-1 border-b border-line-light py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <span className="text-[12.5px] font-medium text-ink-400">{label}</span>
      <span className="break-words text-[13.5px] font-semibold text-ink-900 sm:text-right">
        {value}
      </span>
    </div>
  )
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-radius-md border border-dashed border-line-light-strong bg-bg px-4 py-6 text-center text-[12.5px] leading-relaxed text-ink-400">
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
          description="Your account, what you currently have access to, and control over your data."
        />

        {/* Tabs — real links, so each section is bookmarkable and keyboard-navigable */}
        <nav aria-label="Settings sections" className="mt-6 border-b border-line-light">
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
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-redesign-gold focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
                      active
                        ? 'border-b-2 border-redesign-gold font-semibold text-redesign-gold'
                        : 'border-b-2 border-transparent font-medium text-ink-400 hover:text-ink-900'
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
              helper="Who you are on GCC MENTOR. Your name comes from your Career Profile — edit it there and it updates everywhere."
              actions={
                <Link
                  href="/profile"
                  className="flex min-h-11 items-center rounded-radius-md border border-line-light-strong px-4 text-[13px] font-semibold text-ink-900 transition-colors hover:bg-surface-2-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-redesign-gold"
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
              helper="The address you sign in with and where account messages are sent."
            >
              <div className="flex flex-col">
                <Row label="Email address" value={user.email ?? '—'} />
                <Row
                  label="Status"
                  value={
                    user.email_confirmed_at ? (
                      <span className="text-forest">Confirmed</span>
                    ) : (
                      <span className="text-amber">Not confirmed</span>
                    )
                  }
                />
              </div>
              <p className="mt-4 text-[12px] leading-relaxed text-ink-400">
                Changing your sign-in email is not available in the app yet. Deleting your data does
                not delete your login — see the Delete Data tab for exactly what is removed.
              </p>
            </SectionCard>
          )}

          {tab === 'package' && (
            <SectionCard
              title="Current Package"
              helper="GCC MENTOR sells one-off services rather than a subscription, so what you hold is a set of service credits."
            >
              {Object.keys(availableByService).length > 0 ? (
                <ul className="flex flex-col gap-2.5">
                  {Object.entries(availableByService).map(([key, count]) => (
                    <li
                      key={key}
                      className="flex items-center justify-between gap-4 rounded-radius-md border border-line-light bg-bg px-4 py-3"
                    >
                      <span className="text-[13.5px] font-semibold text-ink-900">
                        {serviceLabel(key)}
                      </span>
                      <span className="rounded-full bg-forest-tint px-2.5 py-1 text-[11px] font-bold text-forest">
                        {count} available
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState>
                  You have no service credits at the moment. Credits are added when you buy a service
                  or redeem a code.
                </EmptyState>
              )}

              {used.length > 0 ? (
                <div className="mt-5">
                  <h3 className="text-[13px] font-semibold text-ink-900">Recently used</h3>
                  <ul className="mt-2 flex flex-col">
                    {used.slice(0, 5).map((c) => (
                      <li
                        key={c.id}
                        className="flex items-center justify-between gap-4 border-b border-line-light py-2.5 last:border-b-0"
                      >
                        <span className="text-[12.5px] text-ink-700">
                          {serviceLabel(c.serviceKey)}
                        </span>
                        <span className="text-[11.5px] text-ink-400">
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
              helper="What you have unlocked so far. Payments moved here from the main menu — nothing about how they work has changed."
            >
              {unlocked.length > 0 ? (
                <ul className="flex flex-col gap-2.5">
                  {unlocked.map((p) => (
                    <li
                      key={p.id as string}
                      className="flex flex-col gap-1 rounded-radius-md border border-line-light bg-bg px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[13.5px] font-semibold text-ink-900">
                          {(p.target_job_title as string) || 'Untitled resume'}
                        </span>
                        <span className="block text-[11.5px] text-ink-400">
                          Unlocked {formatDate(p.created_at as string)}
                        </span>
                      </span>
                      <Link
                        href={`/package/${p.id as string}`}
                        className="shrink-0 text-[12.5px] font-semibold text-redesign-gold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-redesign-gold"
                      >
                        Open
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState>You have not unlocked any paid resumes yet.</EmptyState>
              )}

              <p className="mt-5 rounded-radius-md border border-line-light bg-bg px-4 py-3 text-[12px] leading-relaxed text-ink-400">
                Online card payment is not switched on yet, so there is no saved card, invoice
                history or billing address to show here. Access is currently granted directly or by
                redeeming a code. This section will show real transactions once checkout goes live.
              </p>
            </SectionCard>
          )}

          {tab === 'delete' && <DeleteDataSection />}
        </div>
      </PageContainer>
    </AppShell>
  )
}
