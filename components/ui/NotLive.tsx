import { cn } from '@/lib/utils'

/**
 * "This is not built yet" — in red, everywhere, in one shape.
 *
 * FOUNDER REQUEST 2026-09-09: mark everything that is not ready in red, so the
 * pre-launch pass is a matter of scanning the product rather than remembering
 * what was left. Before this, the same idea was written eleven different ways —
 * a grey "Planned" badge, a dimmed sidebar heading, a gold "Soon" pill, plain
 * sentences in the footer and on Settings — so nothing could be counted.
 *
 * THE TRADE-OFF, STATED. Red normally means "something went wrong". Used for
 * "not built yet" it will read to some users as a fault rather than a roadmap,
 * which is why the wording beside it always has to say which one it is. That is
 * a deliberate cost, accepted because a founder who can see every gap at a
 * glance before launch is worth more right now than the nuance — and it is one
 * token change to soften later.
 *
 * WHAT IT MUST NEVER BECOME. Not a link, and never attached to something that
 * does look usable. `01_PRODUCT.md` §3: this audience is actively targeted by
 * placement scams. A control that appears live and goes nowhere is precisely
 * the experience they have been burned by, so a marked thing is either inert or
 * it does not appear at all.
 *
 * Measured: `alert` on `alert-soft` is 5.62, and on white 6.78 — both pass at
 * this size, which matters because the badge is 10px.
 */

export function NotLive({
  children = 'Not built yet',
  className,
}: {
  children?: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-alert/35 bg-alert-soft px-2 py-1 text-[10px] font-bold uppercase tracking-[0.09em] text-alert',
        className,
      )}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-alert" />
      {children}
    </span>
  )
}

/**
 * The same meaning inside a sentence, where a badge would be too loud.
 *
 * Bold rather than only coloured: colour alone is not a signal for a colour-
 * blind reader, and this is the one label in the product that must not be
 * missed.
 */
export function NotLiveText({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <strong className={cn('font-semibold text-alert', className)}>{children}</strong>
}
