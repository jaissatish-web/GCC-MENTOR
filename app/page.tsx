import type { Metadata } from 'next'
import { LandingPage } from '@/components/landing-v3/LandingPage'

/**
 * What a Gulf job seeker reads in a search result. The title leads with what
 * they get (56 characters); the description answers "why no calls?" and ends
 * on the free first step (under 160). No guarantee of a job — see RULES.
 */
const TITLE = 'GCC MENTOR — ATS-Ready CV, Cover Letter & Interview Prep'
const DESCRIPTION =
  'Applying to Gulf jobs but getting no calls? GCC MENTOR tailors your CV and cover letter to each job’s ATS screen and prepares you for the interview. Free readiness score.'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: { title: TITLE, description: DESCRIPTION, url: '/' },
  twitter: { title: TITLE, description: DESCRIPTION },
}

/**
 * The home page — landing v3 (components/landing-v3/LandingPage.tsx).
 * Metadata comes from app/layout.tsx. Landing v2 is kept unrouted in
 * components/landing-v2/ for rollback.
 */
export default function Home() {
  return <LandingPage />
}
