import type { Metadata } from 'next'
import { AppShell } from '@/components/layout/AppShell'

export const metadata: Metadata = { robots: { index: false, follow: false } }

/**
 * Auth parity with linkedin-optimization (2026-11-17).
 *
 * This layout used to run its own `getUser()` check and redirect with a
 * hardcoded `redirectTo=/naukrigulf-optimization`. Two problems:
 *
 *   1. NaukriGulf was absent from the middleware matcher (middleware.ts) while
 *      its twin, /linkedin-optimization, was present. middleware.ts calls itself
 *      "the first of the two independent checks", so this feature area had only
 *      one check where every other signed-in family has two.
 *   2. The hardcoded redirectTo always dropped the real destination. A user
 *      heading to /naukrigulf-optimization/workspace was sent to
 *      /login?redirectTo=/naukrigulf-optimization and landed on the parent page
 *      after signing in. The LinkedIn equivalent keeps its full path.
 *
 * The matcher now covers this family, and middleware preserves
 * `pathname + search` (see middleware.ts), so this layout matches
 * linkedin-optimization exactly: no local auth check, no lost destination.
 */
export default function NaukrigulfOptimizationLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>
}
