import { AppShell } from '@/components/layout/AppShell'

export default function SettingsLoading() {
  return <AppShell>
    <main className="mx-auto w-full max-w-[1260px] px-4 py-6 sm:px-6" aria-busy="true">
      <p role="status" className="text-sm text-ink-muted">Loading Settings…</p>
      <div aria-hidden="true" className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {['bg-[#e7f5f3]', 'bg-[#edf3ff]', 'bg-[#fff4e5]', 'bg-[#f2eeff]'].map(color =>
          <div key={color} className={`h-16 rounded-xl md:h-24 ${color}`} />)}
      </div>
      <div aria-hidden="true" className="mt-5 grid gap-2">
        {[1, 2, 3, 4, 5].map(row => <div key={row} className="h-14 rounded-xl border border-line bg-[#f8fafc]" />)}
      </div>
    </main>
  </AppShell>
}
