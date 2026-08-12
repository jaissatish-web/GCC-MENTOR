import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { buttonVariants } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

/**
 * PlaceholderPage — minimal shell for the navigable route skeleton (TASK-003).
 *
 * These are deliberately plain: screen title, the ticket that will later build
 * this screen, and a link to the next screen in the flow. No data, no forms,
 * no API calls. Uses the shared Card + Button styling only.
 */
export interface PlaceholderPageProps {
  /** Screen title, e.g. "Career Profile review". */
  title: string
  /** The ticket that will later build this screen, e.g. "TASK-024". */
  ticket: string
  /** The canonical route of this screen. */
  route: string
  /** Optional link to the next screen in the flow. Omitted on the last screen. */
  next?: { href: string; label: string }
}

export function PlaceholderPage({ title, ticket, route, next }: PlaceholderPageProps) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[560px] items-center justify-center px-6 py-16 font-redesign-sans">
      <Card className="w-full border-dashed p-8">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink-400">{route}</p>
        <h1 className="mt-3 text-4xl text-ink-900">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-700">
          Placeholder screen — wireframe only. Built in{' '}
          <span className="font-mono text-forest">{ticket}</span>.
        </p>
        <div className="mt-6">
          {next ? (
            <Link href={next.href} className={cn(buttonVariants({ variant: 'primary' }))}>
              {next.label} →
            </Link>
          ) : (
            <Link href="/" className={cn(buttonVariants({ variant: 'primary' }))}>
              ← Flow complete — back to landing
            </Link>
          )}
        </div>
      </Card>
    </main>
  )
}
