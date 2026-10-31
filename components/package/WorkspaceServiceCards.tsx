import { NAMES } from '@/lib/serviceLabels'
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
    { label: NAMES.interviewQa, count: counts.qaSets, unit: 'Q&A sets generated', icon: QuestionMarkCircleIcon, href: `/interview-qa?package=${id}` },
    { label: 'Mock interviews', count: counts.mockInterviews, unit: 'sessions started', icon: ChatBubbleLeftRightIcon, href: `/mock-interview?package=${id}` },
  ]
  return <section aria-label="Services for this workspace" className="studio-workspace-services">
    <h2>Preparation for this resume</h2>
    <div className="studio-service-list">{services.map(service => <Link key={service.label} href={service.href} aria-label={`${service.label}: ${service.count} for this workspace`} className="studio-service-row"><service.icon aria-hidden="true" /><span><strong>{service.label}</strong><span>{service.count} {service.unit}</span></span><ArrowUpRightIcon aria-hidden="true" /></Link>)}</div>
  </section>
}
