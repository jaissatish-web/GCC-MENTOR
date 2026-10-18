import Link from 'next/link'
import { SparklesIcon } from '@heroicons/react/24/outline'
import { NAV_ITEMS, navHref } from '@/components/layout/navItems'

const SERVICES = [
  { href: '/optimize', detail: 'Match your CV to a job.', action: 'Optimize my resume' },
  { href: '/templates', detail: 'Choose your resume’s look.', action: 'Explore templates' },
  { href: '/cover-letter', detail: 'Write a role-specific letter.', action: 'Prepare a cover letter' },
  { href: '/interview-qa', detail: 'Prepare relevant interview answers.', action: 'Prepare my answers' },
  { href: '/mock-interview', detail: 'Practise and review your answers.', action: 'Start practising' },
  { href: '/linkedin-optimization', detail: 'Strengthen your LinkedIn profile.', action: 'Improve LinkedIn' },
  { href: '/naukrigulf-optimization', detail: 'Improve your Gulf job profile.', action: 'Improve NaukriGulf' },
] as const

export default function ToolsPage() {
  return (
    <main className="ui-page ui-page-wide page-gutter mx-auto flex w-full flex-col gap-8 pb-12 font-redesign-sans">
      <section aria-labelledby="premium-services" className="min-w-0 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h1 id="premium-services" className="flex items-center gap-2 type-section font-semibold text-ink"><SparklesIcon className="size-5 text-gold-ink" aria-hidden="true" />Premium services</h1>
        </div>

        <div className="grid min-w-0 grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-4">
          {SERVICES.map((service) => {
            const item = NAV_ITEMS.find((entry) => entry.href === service.href)!
            const Icon = item.icon
            return (
              <Link
                key={service.href}
                href={navHref(item)}
                data-ui-service={service.href === '/optimize' ? 'tailor' : service.href === '/templates' ? 'templates' : service.href === '/cover-letter' ? 'letter' : service.href === '/interview-qa' ? 'qa' : service.href === '/mock-interview' ? 'mock' : service.href.includes('linkedin') ? 'linkedin' : 'naukrigulf'}
                className="tool-tile group flex min-w-0 flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-4"
              >
                <span className="tool-tile-box">
                  <span aria-hidden="true" className={`flex size-10 items-center justify-center rounded-xl bg-white/80 ${item.iconClass}`}><Icon className="size-6" /></span>
                  <span className="tool-tile-title">{item.label}</span>
                </span>
                <span className="mt-2 px-1 type-helper leading-relaxed text-ink-soft">{service.detail}</span>
              </Link>
            )
          })}
        </div>
      </section>

      <section aria-labelledby="free-services" className="min-w-0 rounded-card border border-dashed border-line-strong bg-white/60 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="free-services" className="type-section font-semibold text-ink">Free services</h2>
          <span className="rounded-full bg-canvas px-2.5 py-1 type-caption font-medium text-ink-muted">Coming later</span>
        </div>
        <p className="mt-2 type-helper text-ink-soft">New free tools will appear here as they become available.</p>
      </section>
    </main>
  )
}
