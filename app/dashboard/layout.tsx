import { Sidebar } from '@/components/layout/Sidebar'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'

/**
 * App shell for the authenticated area (TASK-004).
 *
 * Desktop: fixed-width dark sidebar on the left (lg and up).
 * Mobile: pinned bottom nav (Home / Library / Profile) with the full-width
 * content above it. The dashboard/page child renders inside <main>.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-marble">
      <Sidebar />
      <main className="min-h-screen flex-1 pb-24 lg:pb-0">{children}</main>
      <MobileBottomNav />
    </div>
  )
}
