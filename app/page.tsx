/**
 * PLACEHOLDER — scaffold verification page.
 *
 * This is NOT the landing page. The real landing page is built in TASK-003
 * from design-reference/Landing Page.dc.html.
 *
 * This page exists only to prove the scaffold boots and the design tokens,
 * fonts and Tailwind config all resolve correctly. Replace it in TASK-003.
 */
export default function ScaffoldCheck() {
  const tokens = [
    { name: 'midnight', cls: 'bg-midnight', hex: '#0A1A2F' },
    { name: 'deep-navy', cls: 'bg-deep-navy', hex: '#12283F' },
    { name: 'emerald', cls: 'bg-emerald', hex: '#0E5C4A' },
    { name: 'gold', cls: 'bg-gold', hex: '#C79A3C' },
    { name: 'sand', cls: 'bg-sand', hex: '#EDE3D2' },
    { name: 'marble', cls: 'bg-marble border border-line', hex: '#FBF9F5' },
    { name: 'terracotta', cls: 'bg-terracotta', hex: '#A0562F' },
  ]

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink-warm">
        Scaffold check
      </p>

      <h1 className="mt-3 text-5xl leading-tight text-midnight">
        The scaffold is running.
      </h1>

      <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-body">
        This placeholder confirms Next.js, Tailwind, the design tokens and all
        three fonts resolve correctly. It is replaced by the real landing page in
        TASK-003.
      </p>

      <section className="mt-12">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-ink-warm">
          Typography
        </h2>
        <div className="mt-4 space-y-2 rounded-2xl border border-line bg-white p-6">
          <p className="font-serif text-3xl text-midnight">
            Instrument Serif — headlines
          </p>
          <p className="font-sans text-base font-medium text-midnight">
            Plus Jakarta Sans — UI and body text
          </p>
          <p className="font-mono text-base text-emerald">
            IBM Plex Mono — 499 · 75% · 90–100%
          </p>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-ink-warm">
          Colour tokens
        </h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {tokens.map((t) => (
            <div key={t.name} className="flex flex-col gap-2">
              <div className={`h-14 w-24 rounded-lg ${t.cls}`} />
              <div className="leading-tight">
                <div className="text-xs font-semibold text-midnight">{t.name}</div>
                <div className="font-mono text-[10px] text-ink-warm">{t.hex}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="mt-14 border-t border-line pt-6 text-sm text-ink-muted">
        Next step: <span className="font-mono text-emerald">TASK-001</span> in{' '}
        <span className="font-mono">docs/TASKS.md</span>
      </footer>
    </main>
  )
}
