import { DeleteDataSection } from '@/components/settings/DeleteDataSection'

/**
 * Settings (TASK-037). Data deletion is the one settings action currently
 * specified (docs/RULES.md §3) — nothing else in docs/TASKS.md builds
 * further settings content yet, so this page stays scoped to that.
 *
 * NOTE: like /profile, /optimize/*, /package/* and every other route besides
 * /dashboard itself, this page is not wrapped in the Sidebar/MobileBottomNav
 * shell — TASK-004 only wired that shell to app/dashboard/layout.tsx. That
 * is a pre-existing gap across all of these routes, not something specific
 * to this ticket to silently fix.
 */
export default function SettingsPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-6 py-16">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink-warm">/settings</p>
        <h1 className="mt-3 text-4xl text-midnight">Settings</h1>
      </div>
      <DeleteDataSection />
    </main>
  )
}
