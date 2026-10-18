import { Fragment, useMemo } from 'react'
import { ArrowDownIcon, ArrowRightIcon } from '@heroicons/react/24/outline'
import { diffWordsWithSpace } from 'diff'
import type { ImportChange } from '@/lib/resumeParse/importReview'
import { cn } from '@/lib/utils'

/** Show exact text changes; all strings remain escaped React text nodes. */
export function ImportComparison({ change, applied, compact = false }: { change: ImportChange; applied: boolean; compact?: boolean }) {
  const display = (value: string) => compact && value.length > 420 ? value.slice(0, 420) + '…' : value
  const before = display(change.before), after = display(change.after)
  const parts = useMemo(() => diffWordsWithSpace(before, after), [before, after])
  return <figure aria-label={`Compare ${change.label}`} className="mt-3 grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-start">
    <div className="min-w-0 rounded-ctl border border-line bg-canvas p-3">
      <p className="type-helper font-semibold text-ink-soft">{change.kind === 'format' || change.kind === 'duplicate' ? 'Original import reading' : 'Original wording'}</p>
      <p className="mt-2 whitespace-pre-wrap break-words type-helper leading-relaxed text-ink">{before ? parts.filter(part => !part.added).map((part, i) => part.removed ? <del key={i} className="rounded bg-gold-soft px-0.5 decoration-gold-ink"><span className="sr-only">Removed text: </span>{part.value}</del> : <Fragment key={i}>{part.value}</Fragment>) : 'Not present'}</p>
    </div>
    <span aria-hidden="true" className="flex items-center justify-center self-center text-teal"><ArrowDownIcon className="size-5 sm:hidden" /><ArrowRightIcon className="hidden size-5 sm:block" /></span>
    <div className={cn('min-w-0 rounded-ctl border p-3', change.kind === 'check' ? 'border-gold/40 bg-gold-soft/30' : 'border-teal/30 bg-white')}>
      <p className="type-helper font-semibold text-teal">{change.kind === 'check' ? 'Import decision · verify' : change.suggested ? applied ? 'Current wording · matches suggestion' : 'Suggested wording' : change.kind === 'format' ? 'Imported value · formatted' : 'Imported wording'}</p>
      <p className="mt-2 whitespace-pre-wrap break-words type-helper leading-relaxed text-ink">{after ? parts.filter(part => !part.removed).map((part, i) => part.added ? <mark key={i} className="rounded bg-teal-soft px-0.5 font-medium text-ink underline decoration-teal underline-offset-2"><span className="sr-only">New text: </span>{part.value}</mark> : <Fragment key={i}>{part.value}</Fragment>) : 'Not included'}</p>
    </div>
  </figure>
}
