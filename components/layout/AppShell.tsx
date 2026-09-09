import { Sidebar } from '@/components/layout/Sidebar'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { AppHeader } from '@/components/layout/AppHeader'
import { AppFooter } from '@/components/layout/AppFooter'
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
 *
 * `hideNav` (2026-08-19): drops the rail and the mobile bar entirely, for a
 * screen that wants the full width and no way to wander off mid-task —
 * `/package/[id]/edit`, so an in-progress resume edit is not one tap from
 * "Dashboard" with unsaved changes still open. Every other caller is
 * unaffected: the prop defaults to false, so omitting it keeps today's shell
 * byte-for-byte.
 */
export function AppShell({
  children,
  hideNav = false,
}: {
  children: React.ReactNode
  hideNav?: boolean
}) {
  return (
    <div className="flex min-h-screen bg-canvas">
      {hideNav ? null : (
        <div className="dark-scope contents">
          <Sidebar />
        </div>
      )}
      {/*
        min-w-0 is load-bearing, not tidying.

        A flex item defaults to min-width:auto, so it refuses to shrink below
        its content. Without this the content column measured 784px inside a
        375px viewport — every authenticated page scrolled sideways and the user
        had to pan around to reach controls. One property, and it is the single
        biggest mobile defect in the app.
      */}
      {/* The header and footer are part of the SHELL, not of each page.
          They were missing entirely: below 1024px there was no logo, no way
          home from the top and no brand anywhere, and no signed-in page had a
          footer at all. Putting them here means a new screen cannot forget
          them — the same reason the nav lives here. */}
      <div className={hideNav ? 'flex min-h-screen min-w-0 flex-1 flex-col' : 'flex min-h-screen min-w-0 flex-1 flex-col pb-24 lg:pb-0'}>
        {hideNav ? null : <AppHeader />}
        <main className="min-w-0 flex-1">{children}</main>
        {hideNav ? null : <AppFooter />}
      </div>
      {hideNav ? null : (
        <div className="dark-scope contents">
          <MobileBottomNav />
        </div>
      )}
    </div>
  )
}
