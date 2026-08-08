import { AppShell } from '@/components/layout/AppShell'

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
    <AppShell>{children}</AppShell>
  )
}
