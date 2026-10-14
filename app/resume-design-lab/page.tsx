import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ResumeDesignLab } from './ResumeDesignLab'

export const metadata: Metadata = { title: 'Resume design review · GCC Mentor', robots: { index: false, follow: false } }
export default function ResumeDesignReviewPage() {
  // A review surface for the feature branch, not a production navigation item.
  if (process.env.VERCEL_ENV === 'production') notFound()
  return <ResumeDesignLab />
}
