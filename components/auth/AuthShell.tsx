import Link from 'next/link'
import { FileCheck2, Globe2, ShieldCheck } from 'lucide-react'

const POINTS = [
  { icon: FileCheck2, title: 'ATS-ready for every job', body: 'A CV and cover letter tailored to each vacancy.' },
  { icon: ShieldCheck, title: 'Never invents experience', body: 'Written only from your own Career Profile.' },
  { icon: Globe2, title: 'All six GCC countries', body: 'Saudi Arabia, UAE, Qatar, Oman, Kuwait, Bahrain.' },
] as const

/**
 * AUTH SHELL — sign in, sign up, forgot password, set new password
 * (redesigned 2026-09-30 to match landing v3).
 *
 * Same brand as the home page: the teal "G" mark and wordmark, Inter
 * throughout, bold sans headings, gold for the one action. Desktop splits into
 * a teal brand panel (why GCC MENTOR) and the form; phones get the form first,
 * with a short line of reassurance under it — nobody should scroll past
 * marketing to reach a password box.
 *
 * Exactly ONE <h1> per page: the card's title (AuthCard). The panel's line is
 * a <p>; before this redesign every auth page had two h1s.
 */
export function AuthShell({
  panelTitle,
  panelBody,
  aside,
  children,
}: {
  /** Desktop brand panel headline. */
  panelTitle: string
  panelBody: string
  /** Top-right link, e.g. { prompt: 'New here?', label: 'Create account', href: '/signup' }. */
  aside?: { prompt: string; label: string; href: string }
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas font-redesign-sans text-ink">
      <header className="border-b border-line/80 bg-canvas/90">
        <div className="mx-auto flex h-16 w-full max-w-[1120px] items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/" className="flex shrink-0 items-center gap-2 rounded-ctl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2">
            <span className="grid size-9 place-items-center rounded-ctl bg-teal text-[16px] font-bold text-white">G</span>
            <span className="text-[15px] font-bold tracking-[-0.01em] text-ink max-[359px]:sr-only sm:text-[16px]">GCC MENTOR</span>
          </Link>
          {aside ? (
            <p className="flex items-center gap-1 text-[13.5px] text-ink-muted">
              <span className="hidden sm:inline">{aside.prompt}</span>
              <Link
                href={aside.href}
                className="inline-flex min-h-11 items-center rounded-ctl px-2 font-semibold text-teal hover:bg-teal-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
              >
                {aside.label}
              </Link>
            </p>
          ) : null}
        </div>
      </header>

      <main className="page-gutter mx-auto grid w-full max-w-[1120px] flex-1 items-center gap-8 py-6 sm:py-12 lg:grid-cols-[1fr_minmax(0,460px)] lg:gap-14 lg:py-16">
        {/* Brand panel — desktop only */}
        <aside className="relative hidden overflow-hidden rounded-[28px] bg-teal p-10 text-white lg:flex lg:min-h-[560px] lg:flex-col">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_85%_0%,rgba(201,150,46,0.28),transparent_70%)]" aria-hidden="true" />
          <p className="relative text-[12px] font-semibold uppercase tracking-[0.1em] text-gold-soft">Built by a 15-year Gulf EPC &amp; PMC professional</p>
          <p className="relative mt-4 text-[34px] font-bold leading-[1.12] tracking-[-0.03em]">{panelTitle}</p>
          <p className="relative mt-3 max-w-[420px] text-[16px] leading-relaxed text-white/80">{panelBody}</p>
          <ul className="relative mt-auto space-y-3 pt-10">
            {POINTS.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-3 rounded-[16px] bg-white/[0.08] p-3.5 ring-1 ring-white/10">
                <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-gold text-ink">
                  <Icon className="size-[18px]" aria-hidden="true" />
                </span>
                <span className="leading-snug">
                  <b className="block text-[15px] font-semibold">{title}</b>
                  <span className="text-[13.5px] text-white/75">{body}</span>
                </span>
              </li>
            ))}
          </ul>
        </aside>

        {/* Form column */}
        <div className="mx-auto w-full max-w-[460px]">
          {children}
          {/* Phones: one line of reassurance under the form, not a panel above it. */}
          <ul className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-[13px] text-ink-muted lg:hidden" aria-label="Why GCC MENTOR">
            {POINTS.map(({ icon: Icon, title }) => (
              <li key={title} className="flex items-center gap-1.5">
                <Icon className="size-4 text-teal" aria-hidden="true" /> {title}
              </li>
            ))}
          </ul>
        </div>
      </main>

      <footer className="border-t border-line/80">
        <div className="mx-auto flex w-full max-w-[1120px] flex-wrap items-center justify-between gap-2 px-4 py-4 text-[12.5px] text-ink-muted sm:px-6">
          <span>© {new Date().getFullYear()} GCC MENTOR</span>
          <a href="mailto:jaissatish@gmail.com" className="font-semibold text-teal hover:underline">
            Help: jaissatish@gmail.com
          </a>
        </div>
      </footer>
    </div>
  )
}

/** The white form card. Its title is the page's only <h1>. */
export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="ui-surface rounded-card border border-line bg-white p-4 sm:rounded-[22px] sm:p-8">
      <h1 className="type-title text-ink">{title}</h1>
      {subtitle ? <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{subtitle}</p> : null}
      <div className="mt-6">{children}</div>
    </section>
  )
}
