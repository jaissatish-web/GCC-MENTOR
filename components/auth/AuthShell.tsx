import Link from 'next/link'
import { Reveal } from '@/components/ui/Reveal'

const STORY_TRUST = [
  'Nothing invented — ever',
  'Passport & visa data encrypted',
  'Your experience stays yours',
]

/**
 * Auth page shell — dark split-screen redesign (Phase 2, 2026-08-07).
 *
 * Desktop (lg+): two columns. Left is a brand/story panel — logo, a short
 * headline + body passed per page, and three trust lines reused verbatim
 * from the homepage's trust language (never re-worded per page, so the
 * promise stays identical everywhere it appears). Right is the form.
 *
 * Mobile: the story panel is NOT stacked above the form (explicitly ruled
 * out in the phase brief — "do not simply stack the desktop split-screen").
 * Below `lg` it collapses to a small logo mark only, so the form is reached
 * with no scrolling past marketing copy first.
 *
 * `headline`/`body` are per-page (login vs signup use different copy) so
 * this one shell serves both — no markup duplicated between the two pages.
 */
export function AuthShell({
  headline,
  body,
  children,
}: {
  headline: string
  body: string
  children: React.ReactNode
}) {
  return (
    <div className="dark-scope min-h-screen bg-void lg:grid lg:grid-cols-2">
      {/* Left — brand/story, desktop only */}
      <div className="relative hidden overflow-hidden border-r border-hairline/60 bg-void lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-glow-radial" />

        <Link href="/" className="relative flex items-center gap-2.5">
          <span className="font-serif flex h-8 w-8 items-center justify-center rounded-lg bg-gold text-[15px] text-midnight shadow-glow-gold">
            G
          </span>
          <span className="text-[14px] font-semibold text-marble">GCC MENTOR</span>
        </Link>

        <div className="relative flex max-w-[420px] flex-col gap-5">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-gold/30 bg-gold/[0.07] px-3.5 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-gold" />
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-gold-light">
              Saudi · UAE · Qatar · Oman · Kuwait · Bahrain
            </span>
          </div>
          <h1 className="font-serif text-[38px] leading-[1.08] text-marble">{headline}</h1>
          <p className="text-[15px] leading-relaxed text-marble/60">{body}</p>
        </div>

        <div className="relative flex flex-col gap-2.5 border-t border-hairline/60 pt-6">
          {STORY_TRUST.map((t) => (
            <div key={t} className="flex items-center gap-2 text-[12.5px] font-medium text-marble/55">
              <span className="text-gold">◈</span> {t}
            </div>
          ))}
        </div>
      </div>

      {/* Right — the form */}
      <div className="flex min-h-screen flex-col items-center justify-center px-5 py-12 sm:px-8">
        <Link href="/" className="mb-8 flex items-center gap-2.5 lg:hidden">
          <span className="font-serif flex h-7 w-7 items-center justify-center rounded-lg bg-gold text-base text-midnight shadow-glow-gold">
            G
          </span>
          <span className="text-sm font-semibold text-marble">GCC MENTOR</span>
        </Link>

        <Reveal className="w-full max-w-sm">{children}</Reveal>

        <p className="mt-8 max-w-sm text-center text-[11.5px] leading-relaxed text-marble/40">
          Only facts already in your profile are used anywhere in this product.
          Nothing is invented — ever.
        </p>
      </div>
    </div>
  )
}
