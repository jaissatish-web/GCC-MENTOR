'use client'
import {contextFromProfile} from '@/lib/careerIntake/shared'

import { WorkspaceHome } from '@/components/studio/WorkspaceHome'
import { useCallback, useEffect, useRef, useState } from 'react'
import { type PackageSummary } from '@/lib/packageSummary'
import { fetchHomePackages } from '@/lib/homeFollowThrough'
import { dashboardNextAction, type DashboardOverview } from '@/lib/dashboardOverview'
import { calculateReadiness } from '@/lib/readiness'
import { computeNextAction } from '@/lib/nextAction'
import { answersFromReadinessCategory, scoreCareerPreparation as scoreProfileReadiness, scoringInputFromProfile } from '@/lib/gulfReadiness/fromProfile'
import type { CareerProfileFull } from '@/types/careerProfile'

/** Overall scores, saved totals and progress; individual resumes live in the Library. */
export default function DashboardPage() {
  const [clock, setClock] = useState(() => new Date())
  useEffect(() => {
    const update = () => setClock(new Date())
    const timer = window.setInterval(update, 60_000)
    window.addEventListener('focus', update)
    return () => { window.clearInterval(timer); window.removeEventListener('focus', update) }
  }, [])
  const [profile, setProfile] = useState<CareerProfileFull | null>(null)
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [profileError, setProfileError] = useState(false)
  const [packages, setPackages] = useState<PackageSummary[]>([])
  const [packagesLoaded, setPackagesLoaded] = useState(false)
  const [packagesError, setPackagesError] = useState(false)
  // A CV reading kept on the server until the user decides (migration 047).
  // When there is one, it is the next step above everything else.
  const [hasPendingDraft, setHasPendingDraft] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const didInit = useRef(false)
  const [overview, setOverview] = useState<DashboardOverview | null>(null)
  const [overviewLoading, setOverviewLoading] = useState(true)
  const [overviewError, setOverviewError] = useState(false)
  const loadOverview = useCallback(async () => {
    setOverviewLoading(true)
    setOverviewError(false)
    try {
      const res = await fetch('/api/dashboard/overview', { cache: 'no-store' })
      if (!res.ok) throw new Error('Could not load activity totals')
      setOverview(await res.json() as DashboardOverview)
    } catch {
      setOverviewError(true)
    } finally {
      setOverviewLoading(false)
    }
  }, [])

  useEffect(() => {
    if (didInit.current) return
    didInit.current = true
    void loadOverview()
    // Profile drives the ring, name, target line and "items left".
    fetch('/api/profile', { cache: 'no-store' })
      .then((res) => { if (res.status === 404) return null; if (!res.ok) throw new Error('Unable to load profile'); return res.json() })
      .then((data) => data && setProfile(data as CareerProfileFull))
      .catch(() => {
        setProfileError(true)
        setLoadError(true)
      })
      // Loaded flag so the "create your profile" nudge shows only after we KNOW
      // there is no profile — never a flash before the fetch resolves.
      .finally(() => setProfileLoaded(true))
    // Summaries choose the next destination; all-account totals use the aggregate RPC.
    fetchHomePackages()
      .then(setPackages)
      .catch(() => { setPackagesError(true); setLoadError(true) })
      .finally(() => setPackagesLoaded(true))
    // A CV reading waiting for a decision (migration 047). Best-effort: if it
    // cannot be read, the dashboard simply shows its usual next step.
    fetch('/api/profile/pending-draft', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json().catch(() => null) : null))
      .then((data) => setHasPendingDraft(Boolean(data?.pending)))
      .catch(() => {
        /* non-fatal */
      })
  }, [loadOverview])

  // Ring score: the stored readiness_score (recomputed on save) is authoritative;
  // "still needed" reuses the same field-level calc as /profile — same
  // function, same weights, nothing recomputed differently here.
  const readiness = profile
    ? calculateReadiness({
        currently_in_gulf: profile.currently_in_gulf,
        professional_summary:profile.professional_summary,
        career_stage:contextFromProfile(profile).careerStage,
        has_gulf_experience:contextFromProfile(profile).hasGulfExperience,
        no_formal_qualification:contextFromProfile(profile).noFormalQualification,
        full_name: profile.full_name,
        phone: profile.phone,
        email: profile.email,
        current_location: profile.current_location,
        target_job_title: profile.target_job_title,
        target_country: profile.target_country || undefined,
        target_industry: profile.target_industry,
        target_company: profile.target_company,
        visa_status: profile.visa_status,
        visa_transferable: profile.visa_transferable,
        notice_period: profile.notice_period,
        passport_validity_date: profile.passport_validity_date,
        work_experience: profile.work_experience,
        education: profile.education,
        certifications: profile.certifications,
        skills: profile.skills,
      })
    : null
  const score = readiness?.score ?? profile?.readiness_score ?? 0
  const missing = readiness?.missing ?? []
  // Gulf Readiness (the arithmetic market score, distinct from Profile Strength
  // above) now lives on the dashboard too — founder decision 2026-08-18. It needs
  // the funnel scenario, which the dashboard has no sessionStorage handoff for, so
  // it is reconstructed from the same category the completeness engine already
  // derived. Same engine, same number the user saw; shown only once a profile exists.
  const gulfAnswers = readiness ? answersFromReadinessCategory(readiness.category) : null
  // Same pure arithmetic the profile page runs — no network, no model call.
  const gulf = gulfAnswers && profile ? scoreProfileReadiness(scoringInputFromProfile(profile), gulfAnswers) : null

  // Next best action — one action, chosen from real state.
  //
  // The three-tier ternary that stood here could not see a half-finished job:
  // a user who set one up and stopped was told to "optimize your next
  // application", with no route back to the one they had already started. The
  // rules moved to lib/nextAction.ts, which reads only what these same two
  // fetches already returned.
  const nextAction = dashboardNextAction(computeNextAction(profile, packages, score, missing.length, hasPendingDraft))

  const ready = profileLoaded && packagesLoaded && !loadError
  return <WorkspaceHome profile={profile} profileLoaded={profileLoaded} profileError={profileError} score={score} missing={missing.map(item => item.label)} gulf={gulf} packages={packages} packagesLoaded={packagesLoaded} packagesError={packagesError} overview={overview} overviewLoading={overviewLoading} overviewError={overviewError} nextAction={nextAction} ready={ready} error={loadError} now={clock} onRetryOverview={() => void loadOverview()} />
}
