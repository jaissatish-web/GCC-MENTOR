import type { Metadata } from 'next'
import { LandingPage } from '@/components/landing-v3/LandingPage'

/**
 * What a Gulf job seeker reads in a search result. The title leads with what
 * they get (56 characters); the description answers "why no calls?" and ends
 * on the free first step (under 160). No guarantee of a job — see RULES.
 */
const TITLE = 'Gulf Career Preparation & Interview Coaching | GCC MENTOR'
const DESCRIPTION =
  'One profile for job-specific CVs, cover letters and voice interview practice. Prepare for Gulf opportunities. Start with your free GCC readiness assessment.'

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
