import Link from 'next/link'
import { ArrowRightIcon } from '@heroicons/react/24/outline'
import { buttonVariants } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

/**
 * "What happens next" — the card at the foot of a service page.
 *
 * No service should end in a dead end: after a cover letter comes interview
 * preparation, after Q&A comes practice, after practice the application
 * itself. This card is that hand-off, drawn the same way on every screen so a
 * user learns to look for it.
 *
 * It uses the teal `progress` button, never gold: gold is the page's own main
 * action, and the next step is a way forward, not a competing primary.
 * Links only — this card never starts a generation by itself.
 */
export function NextStep({
  title,
  body,
  href,
  cta,
  secondary,
  className,
}: {
  title: string
  body: string
  href: string
  cta: string
  secondary?: { href: string; label: string }
  className?: string
}) {
  return (
    <aside
      aria-label="What happens next"
      className={cn(
        'flex flex-col gap-4 rounded-card border border-teal/25 bg-teal-soft/60 p-5 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-[12px] font-bold uppercase tracking-[0.12em] text-teal">What happens next</span>
        <p className="font-display text-[18px] font-semibold leading-snug text-ink">{title}</p>
        <p className="max-w-[60ch] text-[13.5px] leading-relaxed text-ink-soft">{body}</p>
      </div>
      <div className="flex shrink-0 flex-col gap-2 sm:items-end">
        <Link href={href} className={cn(buttonVariants({ variant: 'progress' }), 'w-full sm:w-auto')}>
          {cta}
          <ArrowRightIcon className="size-4" aria-hidden="true" />
        </Link>
        {secondary ? (
          <Link
            href={secondary.href}
            className="inline-flex min-h-11 items-center justify-center px-2 text-[13px] font-semibold text-teal underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
          >
            {secondary.label}
          </Link>
        ) : null}
      </div>
    </aside>
  )
}
