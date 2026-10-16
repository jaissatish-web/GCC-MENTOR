import Link from 'next/link'
import { ArrowUpRightIcon, ChatBubbleLeftRightIcon, EnvelopeIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline'
import { workspaceServiceCounts } from '@/lib/workspaceServiceCounts'
import type { Package } from '@/types/package'

/** Every card opens its service with this workspace's resume already selected. */
export function WorkspaceServiceCards({ pkg }: { pkg: Package }) {
  const counts = workspaceServiceCounts(pkg)
  const id = encodeURIComponent(pkg.id)
  const services = [
    { label: 'Cover letters', count: counts.coverLetters, unit: 'letters generated', icon: EnvelopeIcon, href: `/cover-letter?package=${id}` },
    { label: 'Interview Q&A', count: counts.qaSets, unit: 'Q&A sets generated', icon: QuestionMarkCircleIcon, href: `/interview-qa?package=${id}` },
    { label: 'Mock interviews', count: counts.mockInterviews, unit: 'sessions started', icon: ChatBubbleLeftRightIcon, href: `/mock-interview?package=${id}` },
  ]
  return (
    <section aria-label="Services for this workspace" className="flex flex-col gap-3">
      <div>
        <h2 className="type-card font-semibold text-ink">Services for this workspace</h2>
        <p className="mt-1 type-helper text-ink-soft">Your usage for this resume. Select a service to open it.</p>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {services.map(service => (
          <Link
            key={service.label}
            href={service.href}
            aria-label={`${service.label}: ${service.count} for this workspace`}
            className="group flex min-w-0 flex-col gap-2 rounded-card border border-teal/30 bg-white p-3 shadow-m-1 transition-shadow hover:border-teal hover:shadow-m-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 sm:p-4"
          >
            <service.icon aria-hidden="true" className="size-5 text-teal" />
            <span className="min-h-10 break-words text-[13px] font-semibold leading-snug text-ink sm:text-[15px]">{service.label}</span>
            <span className="font-mono text-[30px] font-bold leading-none tabular-nums text-teal sm:text-[36px]">{service.count}</span>
            <span className="flex-1 text-[12px] leading-snug text-ink-muted">{service.count === 0 ? 'Not used yet' : service.unit}</span>
            <span className="mt-1 flex items-center gap-1 text-[12px] font-semibold text-teal">Open <ArrowUpRightIcon aria-hidden="true" className="size-3.5" /></span>
          </Link>
        ))}
      </div>
    </section>
  )
}
