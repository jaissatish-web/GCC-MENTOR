import { cn } from '@/lib/utils'

/**
 * The frame every signed-in page sits in.
 *
 * WHY THIS EXISTS. Each page had been building its own header: eight different
 * max-widths, five heading sizes, page padding that changed between screens, and
 * subtitles that sometimes appeared above the title and sometimes below. Nothing
 * was individually wrong, which is exactly why it never got fixed — but moving
 * between pages felt like moving between products, and no amount of polishing a
 * single screen fixes that.
 *
 * Consistency by convention does not hold; a codebase this size drifts within
 * weeks. So the frame is a COMPONENT: one width, one rhythm, one type scale,
 * and pages provide content rather than layout.
 *
 * WIDTHS are deliberate, not arbitrary:
 *   'document' 1240px — a screen showing an A4 page (794px) plus a rail. Any
 *                       narrower and the page is scaled down for no reason.
 *   'wide'      1120px — grids and galleries.
 *   'default'    980px — lists and dashboards.
 *   'form'       760px — anything read and typed top to bottom. Beyond roughly
 *                       75 characters a line gets measurably harder to track,
 *                       which is why a form should not span a 27-inch monitor.
 */

export type ShellWidth = 'form' | 'default' | 'wide' | 'document'

const WIDTH: Record<ShellWidth, string> = {
  form: 'max-w-[760px]',
  default: 'max-w-[980px]',
  wide: 'max-w-[1120px]',
  document: 'max-w-[1240px]',
}

export function PageShell({
  title,
  subtitle,
  actions,
  width = 'default',
  children,
  className,
}: {
  title: string
  /** One line explaining what the page is for. Optional, never a paragraph. */
  subtitle?: string
  /** Page-level controls, right-aligned on desktop and stacked on mobile. */
  actions?: React.ReactNode
  width?: ShellWidth
  children: React.ReactNode
  className?: string
}) {
  return (
    <main className={cn('mx-auto flex w-full flex-col gap-6 px-5 pb-12 pt-4 sm:px-6', WIDTH[width], className)}>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h1 className="font-serif text-[26px] leading-tight text-ink-900 sm:text-[30px]">
            {title}
          </h1>
          {subtitle ? (
            // ~70 characters: long enough for a real sentence, short enough to
            // stay comfortably readable on a wide screen.
            <p className="max-w-[70ch] text-[13.5px] leading-relaxed text-ink-700">{subtitle}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">{actions}</div>
        ) : null}
      </header>

      {/* A hairline under the header on every page — the cheapest way to make
          screens feel like one product rather than several. */}
      <div className="h-px w-full bg-line-light" />

      {children}
    </main>
  )
}
