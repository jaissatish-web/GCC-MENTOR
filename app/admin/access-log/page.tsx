import { requireAdmin } from '@/lib/admin/adminAuth'
import { listPiiAccessLog } from '@/lib/admin/adminData'
import { Card } from '@/components/ui/Card'

/**
 * Admin · PII access log (TASK-075 split — moved verbatim from the old
 * monolithic /admin page). Shows when and by whom a user's sensitive profile
 * data was viewed (docs/ADMIN.md §2.5). Same read-only table as before —
 * this is a navigation restructure only.
 */
export default async function AccessLogPage() {
  const admin = await requireAdmin()
  const recentAccessLog = await listPiiAccessLog(50)

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-5 py-8">
      <div>
        <h1 className="font-serif text-2xl text-midnight">PII access log</h1>
        <p className="text-sm text-ink-muted">Signed in as {admin.email ?? admin.id}</p>
      </div>

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
