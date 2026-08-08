import { Sidebar } from '@/components/layout/Sidebar'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark-scope flex min-h-screen bg-void">
      <Sidebar />
      <main className="min-h-screen flex-1 pb-24 lg:pb-0">{children}</main>
      <MobileBottomNav />
    </div>
  )
}