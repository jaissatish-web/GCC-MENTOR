import { requireAdmin } from '@/lib/admin/adminAuth'
import { listPiiAccessLog } from '@/lib/admin/adminData'
import { Card } from '@/components/ui/Card'

/**
 * Admin · PII access log (TASK-075 split — moved verbatim from the old
 * monolithic /admin page). Shows when and by whom a user's sensitive profile
 * data was viewed (docs/ADMIN.md §2.5). Same read-only 50-row query as
 * before — TASK-098 restyles it (forest/gold light) and adds the §D mobile
 * stacked-card fallback (desktop/tablet table; mobile card-per-row, labeled
 * rows — the same treatment as the Library's mobile fallback). The mono IDs
 * are kept (§D: mono for every ID/config value).
 */
export default async function AccessLogPage() {
  const admin = await requireAdmin()
  const recentAccessLog = await listPiiAccessLog(50)

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-5 py-8 font-redesign-sans">
      <div>
        <h1 className="font-serif text-2xl text-ink-900">PII access log</h1>
        <p className="text-sm text-ink-400">Signed in as {admin.email ?? admin.id}</p>
      </div>

      <Card className="flex flex-col gap-4 p-5">
        <h2 className="text-[13px] font-bold uppercase tracking-wide text-ink-400">
          PII access log — most recent
        </h2>
        {recentAccessLog.length === 0 ? (
          <p className="text-sm text-ink-400">No access recorded yet.</p>
        ) : (
          <>
            {/* Mobile: stacked card-per-row, labeled rows (§D / Library fallback) */}
            <div className="flex flex-col gap-2 lg:hidden">
              {recentAccessLog.map((row) => (
                <div
                  key={row.id}
                  className="flex flex-col gap-1 rounded-radius-lg border border-line-light p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12px] font-semibold text-ink-900">
                      {row.accessedAt.slice(0, 19).replace('T', ' ')}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 text-[12px]">
                    <span className="text-ink-400">
                      Admin: <span className="font-mono text-ink-700">{row.adminUserId.slice(0, 8)}</span>
                    </span>
                    <span className="text-ink-400">
                      Target: <span className="font-mono text-ink-700">{row.targetUserId.slice(0, 8)}</span>
                    </span>
                    <span className="text-ink-400">
                      Resource:{' '}
                      <span className="text-ink-700">
                        {row.resource} · <span className="font-mono">{row.resourceId.slice(0, 8)}</span>
                      </span>
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop/tablet: table with its own overflow-x container */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-left text-[12px]">
                <thead>
                  <tr className="text-ink-400">
                    <th className="py-1 pr-3 font-semibold">When</th>
                    <th className="py-1 pr-3 font-semibold">Admin</th>
                    <th className="py-1 pr-3 font-semibold">Target user</th>
                    <th className="py-1 pr-3 font-semibold">Resource</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAccessLog.map((row) => (
                    <tr key={row.id} className="border-t border-line-light">
                      <td className="py-1.5 pr-3 text-ink-700">{row.accessedAt.slice(0, 19).replace('T', ' ')}</td>
                      <td className="py-1.5 pr-3 font-mono text-ink-400">{row.adminUserId.slice(0, 8)}</td>
                      <td className="py-1.5 pr-3 font-mono text-ink-400">{row.targetUserId.slice(0, 8)}</td>
                      <td className="py-1.5 pr-3 text-ink-700">
                        {row.resource} · {row.resourceId.slice(0, 8)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </main>
  )
}