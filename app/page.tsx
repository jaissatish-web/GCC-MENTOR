import type { Metadata } from 'next'
import { LandingPage } from '@/components/landing-v3/LandingPage'

/**
 * What a Gulf job seeker reads in a search result. The title leads with what
 * they get (56 characters); the description answers "why no calls?" and ends
 * on the free first step (under 160). No guarantee of a job — see RULES.
 */
const TITLE = 'ATS-Ready Gulf CV & Interview Prep | GCC MENTOR'
const DESCRIPTION =
  'Prepare an ATS-ready Gulf CV, tailored cover letters and interview practice using your real experience. Start with GCC MENTOR’s free Gulf Readiness score.'

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
