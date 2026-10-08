import Link from 'next/link'
import { IdentificationIcon } from '@heroicons/react/24/outline'
import { PageShell } from '@/components/layout/PageShell'
import { buttonVariants } from '@/components/ui/Button'

export default function LinkedInOptimizationPage() {
  return (
    <PageShell title="LinkedIn Optimization" icon={IdentificationIcon} width="form">
      <section aria-labelledby="coming-soon-heading" className="flex flex-col items-start gap-4 rounded-card border border-line bg-white p-6 shadow-m-1 sm:p-8">
        <span className="rounded-full bg-blue-50 px-3 py-1 text-[13px] font-semibold text-blue-700">Coming soon</span>
        <h2 id="coming-soon-heading" className="type-section text-ink">LinkedIn Optimization is coming soon</h2>
        <p className="type-body text-ink-soft">This service is not available yet. You can continue working on your Career Profile and resumes while we prepare it.</p>
        <Link href="/dashboard" className={buttonVariants({ variant: 'secondary', size: 'sm' })}>Back to Dashboard</Link>
      </section>
    </PageShell>
  )
}
