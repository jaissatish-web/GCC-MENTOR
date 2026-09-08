import { requireAdmin } from '@/lib/admin/adminAuth'
import { listPiiAccessLog } from '@/lib/admin/adminData'
import { Card } from '@/components/ui/Card'
import { PageShell } from '@/components/layout/PageShell'

/**
 * Admin · PII access log (TASK-075 split — moved verbatim from the old
 * monolithic /admin page). Shows when and by whom a user's sensitive profile
 * data was viewed (docs/ADMIN.md §2.5). Same read-only 50-row query as
 * before — TASK-098 restyles it (navy/gold light) and adds the §D mobile
 * stacked-card fallback (desktop/tablet table; mobile card-per-row, labeled
 * rows — the same treatment as the Library's mobile fallback). The mono IDs
 * are kept (§D: mono for every ID/config value).
 */
export default async function AccessLogPage() {
  const admin = await requireAdmin()
  const recentAccessLog = await listPiiAccessLog(50)

  return (
    <PageShell
      title="PII access log"
      subtitle={`Signed in as ${admin.email ?? admin.id}`}
    >

      <Card className="flex flex-col gap-4 p-5">
        <h2 className="text-[13px] font-bold uppercase tracking-wide text-slate">
          PII access log — most recent
        </h2>
        {recentAccessLog.length === 0 ? (
          <p className="text-sm text-slate">No access recorded yet.</p>
        ) : (
          <>
            {/* Mobile: stacked card-per-row, labeled rows (§D / Library fallback) */}
            <div className="flex flex-col gap-2 lg:hidden">
              {recentAccessLog.map((row) => (
                <div
                  key={row.id}
                  className="flex flex-col gap-1 rounded-bp-lg border border-edge p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12px] font-semibold text-graphite">
                      {row.accessedAt.slice(0, 19).replace('T', ' ')}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 text-[12px]">
                    <span className="text-slate">
                      Admin: <span className="font-mono text-graphite-soft">{row.adminUserId.slice(0, 8)}</span>
                    </span>
                    <span className="text-slate">
                      Target: <span className="font-mono text-graphite-soft">{row.targetUserId.slice(0, 8)}</span>
                    </span>
                    <span className="text-slate">
                      Resource:{' '}
                      <span className="text-graphite-soft">
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
                  <tr className="text-slate">
                    <th className="py-1 pr-3 font-semibold">When</th>
                    <th className="py-1 pr-3 font-semibold">Admin</th>
                    <th className="py-1 pr-3 font-semibold">Target user</th>
                    <th className="py-1 pr-3 font-semibold">Resource</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAccessLog.map((row) => (
                    <tr key={row.id} className="border-t border-edge">
                      <td className="py-1.5 pr-3 text-graphite-soft">{row.accessedAt.slice(0, 19).replace('T', ' ')}</td>
                      <td className="py-1.5 pr-3 font-mono text-slate">{row.adminUserId.slice(0, 8)}</td>
                      <td className="py-1.5 pr-3 font-mono text-slate">{row.targetUserId.slice(0, 8)}</td>
                      <td className="py-1.5 pr-3 text-graphite-soft">
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
    </PageShell>
  )
}