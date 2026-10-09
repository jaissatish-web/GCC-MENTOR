import { ChevronDown, Lightbulb } from 'lucide-react'

/** Preview the action; expansion preserves the saved wording and its reasons. */
export function CoachingCards({ items, title = 'Practise next' }: { items: string[]; title?: string }) {
  if (!items.length) return null
  return <section className="space-y-3" aria-label={title}>
    <h3 className="type-card">{title}</h3>
    <div className="grid gap-3 sm:grid-cols-2">{items.map((item, index) => {
      const preview = item.replace(/^Action:\s*/i, '').split(/Why it matters:|Success check:/i)[0].trim()
      return <details key={index} className="group min-w-0 rounded-xl border border-gold/30 bg-gold-soft/40">
        <summary className="flex min-h-14 cursor-pointer list-none items-start gap-3 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal [&::-webkit-details-marker]:hidden">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white text-gold-text"><Lightbulb size={17} aria-hidden="true" /></span>
          <span className="min-w-0 flex-1"><span className="block text-xs text-gold-text">Practice {index + 1}</span><span className="mt-1 block line-clamp-2 text-sm text-ink">{preview}</span></span>
          <ChevronDown size={16} className="mt-2 shrink-0 text-gold-text transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
        </summary>
        <div className="border-t border-gold/20 px-4 pb-4 pt-3"><p className="whitespace-pre-wrap text-ink-soft">{item}</p></div>
      </details>
    })}</div>
  </section>
}
