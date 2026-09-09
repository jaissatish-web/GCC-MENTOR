import { AppShell } from '@/components/layout/AppShell'
import { PackageScreen } from './PackageScreen'

/**
 * Results & download — route /package/[id].
 *
 * SPLIT FROM ONE FILE 2026-09-09, to put the client boundary in the right
 * place. The whole screen was a single `'use client'` module that rendered
 * `<AppShell>` itself, which dragged `AppFooter` — an async server component
 * that reads site content through the service-role client — into the browser
 * bundle. It threw on its own guard and took hydration with it.
 *
 * Every other signed-in screen was fixed by moving the shell into a sibling
 * `layout.tsx`. THIS ONE COULD NOT BE. A layout at `app/package/[id]/` also
 * wraps `app/package/[id]/edit`, and the editor deliberately renders the shell
 * with `hideNav` so an in-progress edit is not one tap from "Dashboard" with
 * unsaved changes open (2026-08-19, founder-directed). A parent layout would
 * have handed the sidebar straight back and silently undone that.
 *
 * So the route file is a server component that owns the shell, and the screen
 * itself stays a client component in `PackageScreen.tsx`. The editor is
 * untouched and stays safe on its own terms: `hideNav` renders no footer at
 * all, so it never had the bug.
 */
export default function PackagePage({ params }: { params: { id: string } }) {
  return (
    <AppShell>
      <PackageScreen id={params.id} />
    </AppShell>
  )
}
