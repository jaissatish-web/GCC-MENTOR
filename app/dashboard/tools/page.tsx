import Link from 'next/link'
import { ArrowUpRightIcon, SparklesIcon, Squares2X2Icon } from '@heroicons/react/24/outline'
import { PageShell } from '@/components/layout/PageShell'
import { NAV_ITEMS, navHref } from '@/components/layout/navItems'

const SERVICES = [
  { href: '/optimize', detail: 'Prepare a job-matched CV using your Career Profile and a target opening.', action: 'Optimize my resume' },
  { href: '/templates', detail: 'Find a Gulf-ready design and preview it with your resume.', action: 'Explore templates' },
  { href: '/cover-letter', detail: 'Introduce your experience with a letter tailored to the role.', action: 'Prepare a cover letter' },
  { href: '/interview-qa', detail: 'Prepare answers to questions relevant to your experience and target job.', action: 'Prepare my answers' },
  { href: '/mock-interview', detail: 'Practise a text interview and review feedback on your answers.', action: 'Start practising' },
  { href: '/linkedin-optimization', detail: 'Improve your headline, About section and experience for your next move.', action: 'Improve LinkedIn' },
  { href: '/naukrigulf-optimization', detail: 'Prepare clearer profile content for your Gulf job search.', action: 'Improve NaukriGulf' },
] as const

export default function ToolsPage() {
  return (
    <PageShell
      title="Tools"
      eyebrow="Your Gulf career toolkit"
      subtitle="Choose what you want to prepare next. Each service opens in your existing workspace."
      icon={Squares2X2Icon}
      width="wide"
    >
      <section aria-labelledby="premium-services" className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 type-caption font-semibold text-ink">
              <SparklesIcon aria-hidden="true" className="size-4" /> Made for your next Gulf move
            </div>
            <h2 id="premium-services" className="type-section font-semibold text-ink">Premium Services</h2>
            <p className="mt-1 type-helper text-ink-soft">From a job-matched application to interview preparation.</p>
          </div>
          <span className="rounded-full bg-teal-soft px-3 py-1 type-caption font-semibold text-teal">{SERVICES.length} services</span>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {SERVICES.map((service) => {
            const item = NAV_ITEMS.find((entry) => entry.href === service.href)!
            const Icon = item.icon
            return (
              <Link
                key={service.href}
                href={navHref(item)}
                className="group flex min-w-0 flex-col rounded-card border border-line bg-white p-5 shadow-sm transition duration-200 hover:border-teal/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 motion-reduce:transition-none"
              >
                <span aria-hidden="true" className={`mb-4 flex size-11 items-center justify-center rounded-ctl ${item.iconClass}`}><Icon className="size-6" /></span>
                <h3 className="type-body font-semibold text-ink">{item.label}</h3>
                <p className="mb-5 mt-2 type-helper text-ink-soft">{service.detail}</p>
                <span className="mt-auto flex min-h-11 items-center justify-between gap-3 border-t border-line/60 pt-3 type-caption font-semibold text-teal">
                  {service.action}<ArrowUpRightIcon aria-hidden="true" className="size-4 shrink-0" />
                </span>
              </Link>
            )
          })}
        </div>
      </section>

      <section aria-labelledby="free-services" className="mt-8 min-w-0 rounded-card border border-dashed border-line-strong bg-white/60 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="free-services" className="type-section font-semibold text-ink">Free Services</h2>
          <span className="rounded-full bg-canvas px-2.5 py-1 type-caption font-medium text-ink-muted">Coming later</span>
        </div>
        <p className="mt-2 type-helper text-ink-soft">New free tools will appear here as they become available.</p>
      </section>
    </PageShell>
  )
}
