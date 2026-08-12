import Link from 'next/link'
import { Reveal } from '@/components/ui/Reveal'

const STORY_TRUST = [
  'Nothing invented — ever',
  'Passport & visa data encrypted',
  'Your experience stays yours',
]

/**
 * Auth page shell — light centered-card redesign (TASK-081, per
 * docs/redesign/PAGE_SPECS.md §A: "centered card, max-width 420px, on a
 * light or subtly-tinted --bg ... not the dark hero treatment — this is a
 * utility screen").
 *
 * Single centered column on the paper `--bg`, a faint gold radial glow for
 * brand warmth, logo mark, the per-page headline/body, the form card, and
 * the shared trust lines + grounding tagline (kept verbatim — never
 * re-worded per page).
 *
 * `headline`/`body` are per-page (login vs signup use different copy) so
 * this one shell serves both.
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
    <div className="relative min-h-screen overflow-hidden bg-bg">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-glow-radial" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[420px] flex-col items-center justify-center px-5 py-12 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="font-serif flex h-9 w-9 items-center justify-center rounded-radius-lg bg-redesign-gold text-[15px] text-forest-deep shadow-redesign-cta-glow">
            G
          </span>
          <span className="text-[15px] font-bold text-ink-900">GCC MENTOR</span>
        </Link>

        <div className="mt-7 inline-flex w-fit items-center gap-2 rounded-full border border-redesign-gold/40 bg-redesign-gold-tint px-3.5 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-redesign-gold" />
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-gold-text">
            Saudi · UAE · Qatar · Oman · Kuwait · Bahrain
          </span>
        </div>

        <h1 className="mt-6 text-center font-serif text-[32px] leading-[1.12] text-ink-900">{headline}</h1>
        <p className="mt-3 text-center text-[15px] leading-relaxed text-ink-700">{body}</p>

        <div className="mt-8 w-full">
          <Reveal>{children}</Reveal>
        </div>

        <div className="mt-9 flex flex-col items-center gap-2.5 border-t border-line-light pt-6">
          {STORY_TRUST.map((t) => (
            <div key={t} className="flex items-center gap-2 text-[12.5px] font-medium text-ink-400">
              <span className="text-gold-text">◈</span> {t}
            </div>
          ))}
        </div>

        <p className="mt-7 text-center text-[11.5px] leading-relaxed text-ink-400">
          Only facts already in your profile are used anywhere in this product.
          Nothing is invented — ever.
        </p>
      </div>
    </div>
  )
}
