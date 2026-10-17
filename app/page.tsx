import type { Metadata } from 'next'
import { PremiumLanding } from '@/components/landing-premium/PremiumLanding'

/**
 * What a Gulf job seeker reads in a search result. The title leads with what
 * they get (56 characters); the description answers "why no calls?" and ends
 * on the free first step (under 160). No guarantee of a job — see RULES.
 */
const TITLE = 'Gulf Career Preparation & Interview Coaching | GCC MENTOR'
const DESCRIPTION =
  'One profile for job-specific resumes, cover letters and voice interview practice. Prepare for Gulf opportunities. Start with your free GCC readiness assessment.'

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: { title: TITLE, description: DESCRIPTION, url: '/' },
  twitter: { title: TITLE, description: DESCRIPTION },
}

/** The single public landing page; shared animations remain in landing-v3. */
export default function Home() {
  return <PremiumLanding />
}
