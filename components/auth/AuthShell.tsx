import Link from 'next/link'
import { FileCheck2, Globe2, ShieldCheck } from 'lucide-react'

const POINTS = [
  { icon: FileCheck2, title: 'Job-specific preparation' },
  { icon: ShieldCheck, title: 'Only your real experience' },
  { icon: Globe2, title: 'All six GCC countries' },
] as const

/**
 * AUTH SHELL — sign in, sign up, forgot password, set new password
 * (redesigned 2026-09-30 to match landing v3).
 *
 * Soft indigo surfaces and the shared semantic palette match the workspace.
 * Desktop places a concise introduction beside the form; phones get the form first,
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
    <div className="auth-shell app-type flex min-h-dvh flex-col font-redesign-sans text-ink">
      <header className="auth-header">
        <div className="auth-header-content mx-auto flex min-h-16 w-full items-center justify-between gap-3 px-4 py-2 sm:px-6">
          <Link href="/" className="flex shrink-0 items-center gap-2 rounded-ctl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2">
            <span className="grid size-9 place-items-center rounded-ctl bg-teal text-[16px] font-bold text-white">G</span>
            <span className="text-[15px] font-bold tracking-[-0.01em] text-ink max-[359px]:sr-only sm:text-[16px]">GCC <span className="text-teal">MENTOR</span></span>
          </Link>
          {aside ? (
            <p className="flex min-w-0 flex-wrap items-center justify-end gap-1 text-ink-muted type-helper">
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

      <main className="auth-main grid w-full flex-1">
        {/* Brand panel — desktop only */}
        <aside className="auth-story hidden min-w-0 lg:flex">
          <div className="auth-story-content">
            <p className="type-label font-semibold text-teal">PREPARE WITH CONFIDENCE</p>
            <p className="auth-story-title type-title mt-4 text-ink">{panelTitle}</p>
            <p className="auth-story-body mt-5 max-w-[42ch] type-body text-ink-soft">{panelBody}</p>
            <ul className="auth-story-points mt-8 grid gap-4">
              {POINTS.map(({ icon: Icon, title }) => (
                <li key={title} className="flex items-center gap-3 type-label text-ink-soft">
                  <span className="auth-point-icon"><Icon className="size-5 shrink-0 text-teal" aria-hidden="true" /></span>
                  <span>{title}</span>
                </li>
              ))}
            </ul>
            <p className="mt-8 type-helper text-ink-muted">Built from 15 years of Gulf industry experience.</p>
          </div>
        </aside>

        {/* Form column */}
        <div className="auth-form-column min-w-0">
          <div className="auth-form-content mx-auto w-full max-w-[460px]">
            {children}
            {/* Phones: one line of reassurance under the form, not a panel above it. */}
            <ul className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-2 type-helper text-ink-muted lg:hidden" aria-label="Why GCC MENTOR">
              {POINTS.map(({ icon: Icon, title }) => (
                <li key={title} className="flex items-center gap-1.5">
                  <Icon className="size-4 text-teal" aria-hidden="true" /> {title}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </main>

      <footer className="auth-footer border-t border-line/80">
        <div className="auth-header-content mx-auto flex w-full flex-wrap items-center justify-between gap-2 px-4 py-4 type-caption text-ink-muted sm:px-6">
          <span>© {new Date().getFullYear()} GCC MENTOR</span>
          <a href="mailto:jaissatish@gmail.com" className="font-semibold text-teal hover:underline">
            Help: jaissatish@gmail.com
          </a>
        </div>
      </footer>
    </div>
  )
}

/** The near-white form card. Its title is the page's only <h1>. */
export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="auth-form-surface">
      <h1 className="type-title text-ink">{title}</h1>
      {subtitle ? <p className="mt-2 type-lead leading-relaxed text-ink-soft">{subtitle}</p> : null}
      <div className="mt-6">{children}</div>
    </section>
  )
}
