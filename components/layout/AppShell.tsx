import { Sidebar } from '@/components/layout/Sidebar'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { AppHeader } from '@/components/layout/AppHeader'
import { AppFooter } from '@/components/layout/AppFooter'

/** Server-owned shell preserves published footer content and document boundaries. */
export function AppShell({ children, hideNav = false }: { children: React.ReactNode; hideNav?: boolean }) {
  return <div className="app-type internal-ui career-studio flex min-h-screen bg-canvas">
    {hideNav ? null : <Sidebar />}
    <div className={hideNav ? 'flex min-h-screen min-w-0 flex-1 flex-col' : 'studio-main-column flex min-h-screen min-w-0 flex-1 flex-col'}>
      {hideNav ? null : <AppHeader />}
      <div className="studio-content min-w-0 flex-1">{children}</div>
      {hideNav ? null : <AppFooter variant="compact" />}
    </div>
    {hideNav ? null : <MobileBottomNav />}
  </div>
}
