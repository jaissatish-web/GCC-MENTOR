'use client'

import {INTAKE_KEY,type CareerIntake,applyIntakeAnswers} from '@/lib/careerIntake/shared'
import {CAREER_PROFILE_DRAFT_KEY,CAREER_PROFILE_PARSE_NOTES_KEY,CLAIMED_RESUME_TEXT_KEY} from '@/lib/onboardingDraft'
import { PageSkeleton } from '@/components/ui/Skeleton'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ScorecardResult } from '@/components/gulfReadiness/ScorecardResult'
import { CLAIMED_READINESS_RESULT_KEY } from '@/lib/onboardingDraft'
import type { GulfReadinessResult } from '@/lib/gulfReadiness/types'

/**
 * The full Gulf Readiness report, revealed the moment a user signs up
 * (2026-08-18: signup-restore of the full report).
 *
 * The anonymous scorecard shows a subset behind an honest gate whose CTA
 * promises "create a free account to unlock the full breakdown". This page keeps
 * that promise: it re-renders the SAME computed result the visitor already saw,
 * now with `locked={false}` — every dimension, the full ranked plan, no gate.
 *
 * It is deliberately shown BEFORE profile extraction. The score is arithmetic
 * and already computed, so the reward is instant (no AI call, no wait); the ~20s
 * extraction that builds the Career Profile follows on the CTA, as the second
 * payoff rather than a barrier in front of the first.
 *
 * The result is handed over by /onboarding via CLAIMED_READINESS_RESULT_KEY. No
 * handoff (a refresh after the tab lost it, or a direct visit) is not an error:
 * the user is signed in, so we send them to their dashboard rather than strand
 * them. The resume text and answers travel separately and are consumed by the
 * extraction screen and the profile's live readiness respectively.
 */
export default function OnboardingReportPage() {
  const router = useRouter()
  const [result, setResult] = useState<GulfReadinessResult | null>(null)
  const [checked, setChecked] = useState(false)
  const [opening,setOpening]=useState(false)
  const [openError,setOpenError]=useState('')
  const openProfile=async()=>{
    if(opening)return
    let intake:CareerIntake|null=null
    try{intake=JSON.parse(sessionStorage.getItem(INTAKE_KEY)??'null')}catch{/* Old scan uses the existing extraction path. */}
    if(!intake?.draft){router.push('/onboarding/extracting?path=claimed');return}
    setOpening(true);setOpenError('')
    try{
      const res=await fetch('/api/career-intake/claim',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...intake,draft:applyIntakeAnswers(intake.draft,intake.context)})})
      const body=await res.json()
      if(res.status===409){router.push('/onboarding/extracting?path=claimed');return}
      if(!res.ok)throw new Error(body.error||'Could not open your career details.')
      sessionStorage.removeItem(CLAIMED_RESUME_TEXT_KEY)
      sessionStorage.setItem(CAREER_PROFILE_DRAFT_KEY,JSON.stringify(body.draft))
      sessionStorage.setItem(CAREER_PROFILE_PARSE_NOTES_KEY,JSON.stringify(body.report?.warnings??[]))
      router.push('/profile/review')
    }catch(error){setOpenError(error instanceof Error?error.message:'Could not open the profile.');setOpening(false)}
  }

  useEffect(() => {
    let parsed: GulfReadinessResult | null = null
    try {
      const raw = window.sessionStorage.getItem(CLAIMED_READINESS_RESULT_KEY)
      if (raw) {
        const candidate = JSON.parse(raw) as GulfReadinessResult
        if (candidate && typeof candidate.finalScore === 'number' && candidate.band) {
          parsed = candidate
        }
      }
    } catch {
      parsed = null
    }
    if (!parsed) {
      // Nothing to show — they're already signed in, so the dashboard is the
      // honest destination, not an error screen.
      router.replace('/dashboard')
      return
    }
    setResult(parsed)
    setChecked(true)
  }, [router])

  if (!checked || !result) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-canvas font-redesign-sans">
        <PageSkeleton label="Loading your report" />
      </main>
    )
  }

  return (
    <main className="min-h-dvh bg-canvas text-ink">
      <header className="border-b border-line bg-canvas/95">
        <div className="mx-auto flex h-[72px] max-w-[1100px] items-center justify-between px-3 sm:px-8">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <span className="font-display flex h-9 w-9 items-center justify-center rounded-ctl bg-teal text-lg text-white">G</span>
            <span className="font-bold tracking-wide">GCC MENTOR</span>
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-[820px] px-3 py-12 sm:px-8 lg:py-16">
        <div className="mb-6 text-center">
          <p className="type-helper font-bold uppercase tracking-[0.2em] text-teal">Your full Gulf readiness report</p>
          <h1 className="mt-3 type-title">Unlocked — here&rsquo;s everything we found</h1>
          <p className="mx-auto mt-3 max-w-md type-body leading-relaxed text-ink-soft">
            Every dimension, and your ranked action plan. Next we build your Career Profile so you can act on it.
          </p>
        </div>

        <section className="mb-5 rounded-card border border-teal/30 bg-white p-5"><h2 className="type-card font-semibold text-ink">Your career details are ready to review</h2><p className="mt-2 text-sm text-ink-soft">We reuse your reading and answers. Check important details, then save your Career Profile.</p><Button onClick={openProfile} busy={opening} busyLabel="Opening…" className="mt-4">Review & create my Career Profile</Button>{openError?<p role="alert" className="mt-3 text-sm text-alert">{openError}</p>:null}</section>
        <ScorecardResult result={result} locked={false} />

        <div className="mt-8 rounded-card border border-teal/40 bg-gold-soft/40 p-6 text-center sm:p-8">
          <h2 className="font-display text-2xl text-ink">Now let&rsquo;s build your Career Profile</h2>
          <p className="mx-auto mt-2 max-w-md type-helper leading-relaxed text-ink-soft">
            We already have your resume and answers. Review and correct your details before creating your saved profile.
          </p>
          <div className="mt-5">
            <Button
              variant="purchase"
              onClick={openProfile} busy={opening} busyLabel="Opening your career details…"
            >
              Build my Career Profile
            </Button>
          </div>
        </div>
      </div>
    </main>
  )
}
