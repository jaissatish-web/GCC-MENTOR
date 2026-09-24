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
  icon: Icon,
  eyebrow,
  uses,
  children,
  className,
}: {
  title: string
  /** One line explaining what the page is for. Optional, never a paragraph. */
  subtitle?: string
  /** Page-level controls, right-aligned on desktop and stacked on mobile. */
  actions?: React.ReactNode
  width?: ShellWidth
  /**
   * SERVICE HEADER (2026-09-23). A service page names its icon, where it sits
   * in the journey ("Step 5 · Apply") and what it is built from. The three are
   * optional so plain pages (admin, settings) keep the plain header.
   */
  icon?: React.ComponentType<{ className?: string }>
  eyebrow?: string
  /** What this service reads, e.g. ['Career Profile', 'Optimized CV', 'Target job']. */
  uses?: readonly string[]
  children: React.ReactNode
  className?: string
}) {
  return (
    // THE FRAME OWNS THE TYPEFACE. Among the first three adopters, two set
    // `font-redesign-sans` themselves and one did not — so `/templates`
    // rendered in a different face from `/cover-letter` and nobody noticed.
    // That is precisely the drift this component exists to prevent, and a page
    // cannot own its own font if the frame is meant to make pages feel like one
    // product.
    <main className={cn('mx-auto flex w-full flex-col gap-5 px-4 pb-12 pt-5 font-redesign-sans sm:px-6 lg:pt-8', WIDTH[width], className)}>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 gap-3.5">
          {Icon ? (
            <span
              aria-hidden="true"
              className="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-ctl bg-teal-soft text-teal sm:size-12"
            >
              <Icon className="size-6" />
            </span>
          ) : null}
          <div className="flex min-w-0 flex-col gap-1.5">
            {eyebrow ? (
              <span className="text-[12px] font-semibold uppercase tracking-[0.1em] text-teal">{eyebrow}</span>
            ) : null}
            <h1 className="font-display text-[24px] leading-tight text-ink sm:text-[30px]">
              {title}
            </h1>
            {subtitle ? (
              // ~70 characters: long enough for a real sentence, short enough to
              // stay comfortably readable on a wide screen.
              <p className="max-w-[70ch] text-[14px] leading-relaxed text-ink-soft">{subtitle}</p>
            ) : null}
            {uses && uses.length > 0 ? (
              // One quiet line, not a row of pill boxes (2026-09-24): the pills
              // read as buttons, and on a phone they took three rows.
              <p className="hidden text-[12.5px] text-ink-muted sm:block">Uses your {uses.join(' · ')}</p>
            ) : null}
          </div>
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">{actions}</div>
        ) : null}
      </header>

      {/* A hairline under the header on every page — the cheapest way to make
          screens feel like one product rather than several. */}
      <div className="h-px w-full bg-line" />

      {children}
    </main>
  )
}
