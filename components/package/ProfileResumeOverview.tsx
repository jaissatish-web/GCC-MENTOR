import Link from 'next/link'
import { DocumentTextIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'
import { buttonVariants } from '@/components/ui/Button'

/** The base resume shares the workspace, without implying job optimization. */
export function ProfileResumeOverview({ improving = false }: { improving?: boolean }) {
  return (
    <section aria-label="About your base resume" className="grid gap-3 lg:grid-cols-2">
      <div className="rounded-card border border-gold/40 bg-gold-soft/40 p-4 sm:p-5">
        <p className="flex items-center gap-2 type-helper font-semibold text-gold-ink"><DocumentTextIcon className="size-5" aria-hidden="true" />Your base resume</p>
        <h2 className="mt-3 type-card font-semibold text-ink">{improving ? 'Improve your original details' : 'Your original Career Profile details'}</h2>
        <p className="mt-2 type-body text-ink-soft">Your saved details, presented in a clean resume format. No job-specific optimization has been applied.</p>
        <p className="mt-2 type-helper text-ink-soft">For wording or grammar corrections, edit your Career Profile. Your roles, dates and experience remain your own.</p>
        <Link href="/profile?view=details" className={`${buttonVariants({ variant: 'secondary', size: 'sm' })} mt-4`}>Edit Career Profile</Link>
      </div>
      <div className="rounded-card border border-teal/25 bg-teal-soft/40 p-4 sm:p-5">
        <p className="flex items-center gap-2 type-helper font-semibold text-teal"><ShieldCheckIcon className="size-5" aria-hidden="true" />Ready for your next step</p>
        <h2 className="mt-3 type-card font-semibold text-ink">Use this resume for your preparation</h2>
        <p className="mt-2 type-body text-ink-soft">Prepare cover letters, interview Q&A and mock interviews using this resume and your saved Career Profile.</p>
        <p className="mt-2 type-helper text-ink-soft">Choose Resume design to change its appearance. To tailor a separate resume to a job, start with that job’s title and description.</p>
        <Link href="/profile?view=settings" className="mt-3 inline-flex min-h-11 items-center type-helper font-semibold text-teal underline underline-offset-4">Choose visible fields</Link>
      </div>
    </section>
  )
}
