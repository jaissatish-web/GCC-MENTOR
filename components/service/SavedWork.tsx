import { ChevronDownIcon, CheckCircleIcon, PlusIcon } from '@heroicons/react/24/outline'

/** Shared reading-first hierarchy for saved preparation services. */
export function SavedWorkHeading({ title, count, children }: {
  title: string; count: number; children?: React.ReactNode
}) {
  return <div className="flex flex-col gap-2 border-b border-line pb-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="font-display type-section text-ink">{title}</h2>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-soft px-3 py-1 type-caption font-semibold text-teal">
        <CheckCircleIcon className="size-4" aria-hidden="true" />{count} saved
      </span>
    </div>
    {children ? <p className="max-w-[65ch] type-helper leading-relaxed text-ink-soft">{children}</p> : null}
  </div>
}

/** New users see setup open; returning users reach their saved output first. */
export function ServiceOptions({ title, description, hasSaved, busy, hasError = false, children }: {
  title: string; description: string; hasSaved: boolean; busy: boolean; hasError?: boolean; children: React.ReactNode
}) {
  return <details open={!hasSaved || busy || hasError} className="group mt-6 rounded-card border border-line bg-white">
    <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 rounded-card p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal sm:p-5 [&::-webkit-details-marker]:hidden">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-ctl bg-gold-soft text-gold-ink"><PlusIcon className="size-5" aria-hidden="true" /></span>
      <span className="min-w-0 flex-1"><span className="block type-label font-semibold text-ink">{title}</span><span className="mt-1 block type-caption leading-relaxed text-ink-soft">{description}</span></span>
      <ChevronDownIcon className="size-5 shrink-0 text-teal transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
    </summary>
    <div className="flex flex-col gap-4 border-t border-line p-4 sm:p-5">{children}</div>
  </details>
}
