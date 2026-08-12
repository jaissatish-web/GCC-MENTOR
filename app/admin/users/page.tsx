import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/adminAuth'
import { searchUsers, listPackages, getTodayRateLimits } from '@/lib/admin/adminData'
import { overrideRateLimitAction, grantCreditAction } from '@/app/admin/actions'
import { listCreditsForUser } from '@/lib/admin/credits'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Pill } from '@/components/ui/Pill'

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return iso.slice(0, 10)
}

function readableCategory(cat: string | null): string {
  if (!cat) return '—'
  return cat.replace(/_/g, ' ')
}

/**
 * Admin · Find a user (TASK-075 split — moved verbatim from the old
 * monolithic /admin page). Search by phone/email, then for a selected user
 * shows packages, manual credit grant, and rate-limit override. The search
 * result and the selected-user detail all share the same q / user search
 * params and stay together on this one page, exactly as they worked on the
 * old root page.
 */
export default async function UsersPage({
  searchParams,
}: {
  searchParams: { q?: string; user?: string }
}) {
  const admin = await requireAdmin()
  const { q, user: selectedUserId } = searchParams

  const results = q ? await searchUsers(q) : []
  const selectedPackages = selectedUserId
    ? await listPackages({ userId: selectedUserId, limit: 50 }, admin)
    : []
  const selectedRateLimits = selectedUserId ? await getTodayRateLimits(selectedUserId) : []
  const selectedCredits = selectedUserId ? await listCreditsForUser(selectedUserId) : []

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-5 py-8 font-redesign-sans">
      <div>
        <h1 className="font-serif text-2xl text-ink-900">Users</h1>
        <p className="text-sm text-ink-400">Signed in as {admin.email ?? admin.id}</p>
      </div>

      {/* ---- Users list (docs/ADMIN.md §2.1) --------------------------- */}
      <Card className="flex flex-col gap-4 p-5">
        <h2 className="text-[13px] font-bold uppercase tracking-wide text-ink-400">
          Find a user
        </h2>
        <form method="get" action="/admin/users" className="flex gap-2">
          <Input
            name="q"
            defaultValue={q ?? ''}
            placeholder="Search by phone or email"
            aria-label="Search by phone or email"
            className="flex-1"
          />
          <Button type="submit" variant="primary">
            Search
          </Button>
        </form>

        {q ? (
          results.length === 0 ? (
            <p className="text-sm text-ink-400">No matches for &ldquo;{q}&rdquo;.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {results.map((r) => (
                <div
                  key={r.userId}
                  className="flex flex-col gap-2 rounded-radius-lg border border-line-light p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-ink-900">
                      {r.fullName || 'Unnamed profile'}
                    </span>
                    <span className="text-[12px] text-ink-400">
                      {r.phone || '—'} · {r.email || '—'}
                    </span>
                    <span className="text-[12px] text-ink-400">
                      Readiness: {r.readinessScore ?? '—'} ({readableCategory(r.readinessCategory)}) ·
                      Signed up {fmtDate(r.signupDate)}
                    </span>
                  </div>
                  <Link
                    href={`/admin/users?${new URLSearchParams({ q: q ?? '', user: r.userId }).toString()}`}
                    className="text-[12px] font-semibold text-forest"
                  >
                    View packages →
                  </Link>
                </div>
              ))}
            </div>
          )
        ) : (
          <p className="text-sm text-ink-400">
            Search for a user to view their packages or override their rate limit.
          </p>
        )}
      </Card>

      {/* ---- Selected user: packages + rate limit ---------------------- */}
      {selectedUserId ? (
        <>
          <Card className="flex flex-col gap-4 p-5">
            <h2 className="text-[13px] font-bold uppercase tracking-wide text-ink-400">
              Packages — read-only (docs/ADMIN.md §2.2)
            </h2>
            {selectedPackages.length === 0 ? (
              <p className="text-sm text-ink-400">No packages for this user.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {selectedPackages.map((p) => (
                  <div
                    key={p.id}
                    className="flex flex-col gap-1 rounded-radius-lg border border-line-light p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-semibold text-ink-900">{p.targetJobTitle}</span>
                      <span className="text-[12px] text-ink-400">
                        {p.targetCountry ?? 'No country'} · created {fmtDate(p.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Pill variant={p.status} label={p.status.replace(/_/g, ' ')} />
                      <Pill variant={p.isPaid ? 'offer' : 'risk'} label={p.isPaid ? 'Paid' : 'Unpaid'} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* ---- Manual credit grant (docs/ADMIN.md §2.3) ---------------- */}
          <Card className="flex flex-col gap-4 p-5">
            <h2 className="text-[13px] font-bold uppercase tracking-wide text-ink-400">
              Grant a free optimization (docs/ADMIN.md §2.3)
            </h2>
            <p className="text-[12px] text-ink-400">
              The fix for &ldquo;I paid but something broke&rdquo;. One grant = one free
              optimization; it is applied automatically the next time this user optimizes.
              Every grant is logged with your admin ID, the reason, and the timestamp.
            </p>
            <form action={grantCreditAction} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="userId" value={selectedUserId} />
              <input type="hidden" name="q" value={q ?? ''} />
              <Input name="reason" label="Reason (required)" required className="flex-1" />
              <Button type="submit" variant="secondary">
                Grant credit
              </Button>
            </form>

            {selectedCredits.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                  Grant history
                </div>
                {selectedCredits.map((c) => (
                  <div
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-radius-md border border-line-light px-3 py-2 text-[12px]"
                  >
                    <span className="text-ink-700">
                      {c.grantedAt.slice(0, 10)} · {c.reason}
                    </span>
                    <Pill
                      variant={c.consumedAt ? 'applied' : 'shortlisted'}
                      label={c.consumedAt ? `Used ${c.consumedAt.slice(0, 10)}` : 'Available'}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[12px] text-ink-400">No credits granted to this user yet.</p>
            )}
          </Card>

          <Card className="flex flex-col gap-4 p-5">
            <h2 className="text-[13px] font-bold uppercase tracking-wide text-ink-400">
              Rate-limit override (docs/ADMIN.md §2.4) — today only
            </h2>
            <div className="flex flex-col gap-4">
              {selectedRateLimits.map((rl) => (
                <form
                  key={rl.action}
                  action={overrideRateLimitAction}
                  className="flex flex-col gap-2 rounded-radius-lg border border-line-light p-3"
                >
                  <input type="hidden" name="userId" value={selectedUserId} />
                  <input type="hidden" name="action" value={rl.action} />
                  <input type="hidden" name="q" value={q ?? ''} />
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-ink-900">
                      {rl.action.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[12px] text-ink-400">
                      {rl.count} used today
                      {rl.limitOverride != null ? ` · override: ${rl.limitOverride}` : ' · default limit'}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-end gap-2">
                    <Input
                      name="override"
                      type="number"
                      min={0}
                      label="New limit for today (blank = clear override)"
                      className="max-w-[220px]"
                    />
                    <Input name="reason" label="Reason (required)" required className="flex-1" />
                    <Button type="submit" variant="secondary">
                      Save
                    </Button>
                  </div>
                </form>
              ))}
            </div>
          </Card>
        </>
      ) : null}
    </main>
  )
}
