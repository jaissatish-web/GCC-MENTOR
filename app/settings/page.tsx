import { DeleteDataSection } from '@/components/settings/DeleteDataSection'
import { AppShell } from '@/components/layout/AppShell'

/**
 * Settings (TASK-037). Data deletion is the one settings action currently
 * specified (docs/RULES.md §3) — nothing else in docs/TASKS.md builds
 * further settings content yet, so this page stays scoped to that.
 *
 * Dark visual system redesign (2026-08-07), matching app/dashboard/page.tsx.
 * Wrapped in AppShell (TASK-053) — previously this page (like /profile,
 * /optimize/*, /package/*) had no Sidebar/MobileBottomNav shell at all,
 * since TASK-004 only ever wired it to app/dashboard/layout.tsx.
 */
export default function SettingsPage() {
  return (
    <AppShell>
      <div className="px-6 py-16 md:px-8 lg:px-12">
        <div className="mx-auto w-full max-w-2xl space-y-8">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-marble/40">
              /settings
            </p>
            <h1 className="mt-3 font-serif text-4xl leading-tight text-marble sm:text-[40px]">
              Settings
            </h1>
          </div>
          <DeleteDataSection />
        </div>
      </div>
    </AppShell>
  )
}
