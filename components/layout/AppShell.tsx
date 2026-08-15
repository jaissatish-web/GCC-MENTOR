import { Sidebar } from '@/components/layout/Sidebar'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'

/**
 * The authenticated app frame.
 *
 * Light content area, dark navy rail. This is the standard premium-SaaS
 * arrangement and it is chosen for a specific reason rather than taste: this
 * product is form-heavy and reading-heavy — long profiles, resume text, scan
 * reports — and light backgrounds are measurably easier for sustained reading
 * and data entry. Dark themes earn their place in media and code tools, not in
 * a document workflow.
 *
 * The rail stays dark because it is what carries the brand colour and gives the
 * page an anchor; keeping the whole screen white would read as unfinished.
 * `dark-scope` is scoped to the rail so the dark scrollbar styling follows it
 * instead of the content.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-bg">
      <div className="dark-scope contents">
        <Sidebar />
      </div>
      <main className="min-h-screen flex-1 pb-24 lg:pb-0">{children}</main>
      <div className="dark-scope contents">
        <MobileBottomNav />
      </div>
    </div>
  )
}
