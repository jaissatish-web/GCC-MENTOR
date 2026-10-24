import { hasUnknownEmploymentEnd } from '@/lib/employmentStatus'
import { ChevronDownIcon } from '@heroicons/react/24/outline'
import { workDateLabel } from '@/lib/profileWorkNavigation'
import { cn } from '@/lib/utils'

export function WorkExperienceItem({ role, number, open, onToggle, children }: {
  role: { key: string; role: string; company: string; start_date: string; end_date: string; end_date_unconfirmed?: boolean }
  number: number; open: boolean; onToggle: () => void; children: React.ReactNode
}) {
  const current = Boolean(role.start_date.trim() && !role.end_date.trim() && !hasUnknownEmploymentEnd(role))
  const panelId = `work-role-${role.key}`
  return <article className="min-w-0 overflow-hidden rounded-card border border-line bg-white">
    <h3><button type="button" aria-expanded={open} aria-controls={panelId} onClick={onToggle} className="flex min-h-20 w-full items-start gap-3 p-3 text-left hover:bg-teal-soft/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal sm:p-4">
      <span aria-hidden="true" className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-teal-soft type-helper font-semibold text-teal">{number}</span>
      <span className="min-w-0 flex-1">
        <span className="block break-words type-card font-semibold text-ink">{role.role.trim() || 'New role'}</span>
        <span className="mt-1 block break-words type-helper text-ink-soft">{role.company.trim() || 'Add company name'}</span>
        <span className="mt-1 flex flex-wrap items-center gap-2 type-helper text-ink-soft"><span>{workDateLabel(role.start_date)}{role.start_date || role.end_date ? ` – ${role.end_date ? workDateLabel(role.end_date) : current ? 'Present' : hasUnknownEmploymentEnd(role) ? 'End date not provided' : 'End date not added'}` : ''}</span>{current ? <span className="rounded-full bg-teal-soft px-2 py-0.5 type-caption font-medium text-teal">Current role</span> : null}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-2 type-helper font-semibold text-teal"><ChevronDownIcon aria-hidden="true" className={cn('size-5 transition-transform', open && 'rotate-180')} /><span>{open ? 'Close' : 'Edit role'}</span></span>
    </button></h3>
    <div id={panelId} hidden={!open} className="border-t border-line p-3 sm:p-4"><div className="flex flex-col gap-3">{children}</div></div>
  </article>
}
