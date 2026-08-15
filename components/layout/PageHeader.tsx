import { cn } from '@/lib/utils'

/**
 * PageHeader — the single page-title treatment for every authenticated page.
 *
 * Extracted rather than invented: this is the exact heading pattern
 * /job-match, /cover-letter and /gcc-readiness already used inline
 * (serif 28/32px on ink-900-dark, 13px ink-400-dark subtitle). Pulling it
 * into one component is what stops the next page from drifting a few pixels
 * or a shade off, which is how /settings ended up on text-4xl/py-16 while
 * its siblings sat on text-[28px]/py-8.
 *
 * `actions` renders to the right of the title on desktop and wraps beneath
 * it on mobile, so a page-level button never overflows a narrow viewport.
 */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6',
        className
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="font-serif text-[28px] leading-tight text-ink-900-dark sm:text-[32px]">
          {title}
        </h1>
        {description ? (
          <p className="max-w-[62ch] text-[13px] leading-relaxed text-ink-400-dark">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2.5">{actions}</div> : null}
    </div>
  )
}

/**
 * PageContainer — the matching content column.
 *
 * `width="normal"` (900px) is the reading-width default every form and report
 * page uses. `width="wide"` (1180px) is for the grid/listing pages (Dashboard,
 * Resume Library) that genuinely need the extra columns.
 */
export function PageContainer({
  children,
  width = 'normal',
  className,
}: {
  children: React.ReactNode
  width?: 'normal' | 'wide'
  className?: string
}) {
  return (
    <main
      className={cn(
        'mx-auto w-full px-5 py-8 font-redesign-sans sm:px-8 lg:px-10',
        width === 'wide' ? 'max-w-[1180px]' : 'max-w-[900px]',
        className
      )}
    >
      {children}
    </main>
  )
}

/**
 * SectionCard — a titled block inside a page, with optional guidance text.
 *
 * The `helper` line is the piece the Career Profile redesign needs most: a
 * short instruction sitting directly under the section title, on ink-400-dark
 * (a real token, contrast-checked against surface-dark) rather than a dimmed
 * body colour that disappears into the card.
 */
export function SectionCard({
  title,
  helper,
  actions,
  children,
  className,
  id,
}: {
  title: string
  helper?: string
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
  id?: string
}) {
  return (
    <section
      id={id}
      className={cn(
        'rounded-radius-lg border border-line-dark bg-surface-dark p-5 shadow-redesign-md sm:p-6',
        className
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-5">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-[16px] font-bold leading-snug text-ink-900-dark">{title}</h2>
          {helper ? (
            <p className="max-w-[70ch] text-[12.5px] leading-relaxed text-ink-400-dark">{helper}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  )
}
