import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/adminAuth'
import {
  searchUsers,
  listPackages,
  getTodayRateLimits,
  listPiiAccessLog,
} from '@/lib/admin/adminData'
import { overrideRateLimitAction } from '@/app/admin/actions'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Pill } from '@/components/ui/Pill'

/**
 * Admin panel — TASK-040. ONE screen (docs/ADMIN.md §1: "deliberately
 * minimal... operational tooling, not a second product"). No mockup exists
 * for this screen (not part of design-reference/) — styled with the
 * existing UI primitives and Tailwind tokens rather than a pixel spec.
 *
 * Server-rendered, GET-param-driven search (?q=, ?user=) — no client JS
 * needed for the read paths, matching the "single, minimal screen" intent
 * and keeping "search must not leak" trivially true (nothing is fetched
 * client-side to filter).
 *
 * Scope is exactly the four features TASK-025's entry lists (docs/TASKS.md):
 * users list, read-only payments/packages view, rate-limit override, PII
 * access log viewer. Manual credit grant (docs/ADMIN.md §2.3) is a separate,
 * still-blocked ticket (TASK-045) — not built here.
 */

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return iso.slice(0, 10)
}

function readableCategory(cat: string | null): string {
  if (!cat) return '—'
  return cat.replace(/_/g, ' ')
}

export default async function AdminPage({
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
  const recentAccessLog = await listPiiAccessLog(50)

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-5 py-8">
      <div>
        <h1 className="font-serif text-2xl text-midnight">Admin</h1>
        <p className="text-sm text-ink-muted">Signed in as {admin.email ?? admin.id}</p>
      </div>

      {/* ---- Users list (docs/ADMIN.md §2.1) --------------------------- */}
      <Card className="flex flex-col gap-4 p-5">
        <h2 className="text-[13px] font-bold uppercase tracking-wide text-ink-warm">
          Find a user
        </h2>
        <form method="get" action="/admin" className="flex gap-2">
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
            <p className="text-sm text-ink-muted">No matches for &ldquo;{q}&rdquo;.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {results.map((r) => (
                <div
                  key={r.userId}
                  className="flex flex-col gap-2 rounded-xl border border-line p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-midnight">
                      {r.fullName || 'Unnamed profile'}
                    </span>
                    <span className="text-[12px] text-ink-muted">
                      {r.phone || '—'} · {r.email || '—'}
                    </span>
                    <span className="text-[12px] text-ink-faint">
                      Readiness: {r.readinessScore ?? '—'} ({readableCategory(r.readinessCategory)}) ·
                      Signed up {fmtDate(r.signupDate)}
                    </span>
                  </div>
                  <Link
                    href={`/admin?${new URLSearchParams({ q: q ?? '', user: r.userId }).toString()}`}
                    className="text-[12px] font-semibold text-emerald"
                  >
                    View packages →
                  </Link>
                </div>
              ))}
            </div>
          )
        ) : (
          <p className="text-sm text-ink-muted">
            Search for a user to view their packages or override their rate limit.
          </p>
        )}
      </Card>

      {/* ---- Selected user: packages + rate limit ---------------------- */}
      {selectedUserId ? (
        <>
          <Card className="flex flex-col gap-4 p-5">
            <h2 className="text-[13px] font-bold uppercase tracking-wide text-ink-warm">
              Packages — read-only (docs/ADMIN.md §2.2)
            </h2>
            {selectedPackages.length === 0 ? (
              <p className="text-sm text-ink-muted">No packages for this user.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {selectedPackages.map((p) => (
                  <div
                    key={p.id}
                    className="flex flex-col gap-1 rounded-xl border border-line p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-semibold text-midnight">{p.targetJobTitle}</span>
                      <span className="text-[12px] text-ink-muted">
                        {p.targetCountry} · created {fmtDate(p.createdAt)}
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

          <Card className="flex flex-col gap-4 p-5">
            <h2 className="text-[13px] font-bold uppercase tracking-wide text-ink-warm">
              Rate-limit override (docs/ADMIN.md §2.4) — today only
            </h2>
            <div className="flex flex-col gap-4">
              {selectedRateLimits.map((rl) => (
                <form
                  key={rl.action}
                  action={overrideRateLimitAction}
                  className="flex flex-col gap-2 rounded-xl border border-line p-3"
                >
                  <input type="hidden" name="userId" value={selectedUserId} />
                  <input type="hidden" name="action" value={rl.action} />
                  <input type="hidden" name="q" value={q ?? ''} />
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-midnight">
                      {rl.action.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[12px] text-ink-muted">
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

      {/* ---- PII access log viewer (docs/ADMIN.md §2.5) ---------------- */}
      <Card className="flex flex-col gap-4 p-5">
        <h2 className="text-[13px] font-bold uppercase tracking-wide text-ink-warm">
          PII access log — most recent
        </h2>
        {recentAccessLog.length === 0 ? (
          <p className="text-sm text-ink-muted">No access recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12px]">
              <thead>
                <tr className="text-ink-muted">
                  <th className="py-1 pr-3 font-semibold">When</th>
                  <th className="py-1 pr-3 font-semibold">Admin</th>
                  <th className="py-1 pr-3 font-semibold">Target user</th>
                  <th className="py-1 pr-3 font-semibold">Resource</th>
                </tr>
              </thead>
              <tbody>
                {recentAccessLog.map((row) => (
                  <tr key={row.id} className="border-t border-line">
                    <td className="py-1.5 pr-3 text-ink-body">{row.accessedAt.slice(0, 19).replace('T', ' ')}</td>
                    <td className="py-1.5 pr-3 font-mono text-ink-muted">{row.adminUserId.slice(0, 8)}</td>
                    <td className="py-1.5 pr-3 font-mono text-ink-muted">{row.targetUserId.slice(0, 8)}</td>
                    <td className="py-1.5 pr-3 text-ink-body">
                      {row.resource} · {row.resourceId.slice(0, 8)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </main>
  )
}
