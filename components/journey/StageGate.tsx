'use client'

import Link from 'next/link'
import { buttonVariants } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { StageRail } from './JourneyStepper'
import { stageById, stageStates } from './stages'
import { useCurrentStage } from './useCurrentStage'

/**
 * What a step-3 page (cover letter, Q&A, mock) shows before its inputs exist
 * (2026-09-25). It used to say "Add a target job first" — even to someone
 * with no profile, who would then be bounced to the profile from there. Now it
 * shows the same three-step map as the dashboard and sends the user to the
 * step they are actually on.
 */
export function StageGate({ what }: { /** e.g. "Your cover letter" */ what: string }) {
  const snap = useCurrentStage()
  // Until the check lands, assume the common case (profile done, no job) so the
  // button is never wrong by more than one step.
  const facts = snap?.facts ?? { profileDone: true, cvDone: false, applyDone: false }
  const onProfile = !facts.profileDone
  const states = stageStates(onProfile ? 'profile' : 'cv', facts)
  const target = stageById(onProfile ? 'profile' : 'cv')

  return (
    <div className="flex flex-col items-center gap-5 px-2 py-6 text-center">
      <StageRail states={states} className="w-full max-w-[460px]" />
      <div className="flex max-w-[48ch] flex-col gap-2">
        <h2 className="font-display text-[20px] font-semibold leading-snug text-ink">{what} comes in step 3</h2>
        <p className="text-[14px] leading-relaxed text-ink-soft">
          It is written for one target job, from the CV we tailor for that job.{' '}
          {onProfile ? 'Start with step 1: your profile.' : 'First, add the job you want in step 2.'}
        </p>
      </div>
      <Link href={onProfile ? '/profile?import=upload' : target.href} className={cn(buttonVariants({ variant: 'primary' }), 'text-[14px]')}>
        {onProfile ? 'Start step 1: add your CV' : 'Go to step 2: add a target job'}
      </Link>
    </div>
  )
}
