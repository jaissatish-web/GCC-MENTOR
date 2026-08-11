import { AdminNav } from './AdminNav'

/**
 * Shared shell for every /admin/* page (TASK-075). Renders the horizontal
 * tab nav above each page's own <main>. Deliberately does NOT call
 * requireAdmin() here — each admin page (and each Server Action in
 * app/admin/actions.ts) re-checks independently, per docs/ADMIN.md §1 and
 * the middleware's /admin/:path* gate which already covers page renders.
 * Admin stays visually separate from the authenticated-app AppShell (dark
 * sidebar) — it is operational tooling, not a second product.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-fill-subtle">
      <AdminNav />
      {children}
    </div>
  )
}
