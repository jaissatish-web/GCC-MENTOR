import { AppShell } from '@/components/layout/AppShell'

/**
 * The app frame for the cover letter screen, created on the SERVER.
 *
 * WHY THIS FILE EXISTS. `AppShell` renders `AppFooter`, which is an async
 * server component: it reads the founder-written footer copy and the published
 * legal pages through the service-role client. When a page marked
 * `'use client'` renders `<AppShell>` itself, every module in that subtree —
 * AppShell and AppFooter with it — is compiled for the browser. AppFooter then
 * ran client-side, `createServiceRoleClient` hit its own browser guard and
 * threw, and the thrown promise took hydration down with it:
 *
 *   Error: createServiceRoleClient must never be called in a browser context
 *   Warning: async/await is not yet supported in Client Components
 *   Warning: An error occurred during hydration
 *
 * That broke nine signed-in screens at once, which is what "many pages showing
 * error after login" was. A layout is a server component, so building the
 * shell here puts the boundary in the right place: the shell and its footer
 * stay on the server, and the page below is still free to be a client
 * component.
 *
 * `app/dashboard/layout.tsx` had always done it this way, which is exactly why
 * the dashboard was the one signed-in screen that never broke.
 *
 * THE SERVICE-ROLE KEY WAS NEVER EXPOSED. `SUPABASE_SERVICE_ROLE_KEY` has no
 * `NEXT_PUBLIC_` prefix, so Next never inlines it into a browser bundle, and
 * the guard in `lib/supabase/serviceAdmin.ts` threw before any client was
 * built. The bug was a crash, not a leak.
 */
export default function CoverLetterLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>
}
