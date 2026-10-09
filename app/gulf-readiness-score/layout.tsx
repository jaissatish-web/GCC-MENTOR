import type { Metadata } from 'next'

const title = 'Free Gulf Readiness Score'
const description = 'Check your readiness for Gulf jobs using your resume and two short questions. See your strengths and next steps with GCC MENTOR. No signup needed.'

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/gulf-readiness-score' },
  openGraph: { title: `${title} — GCC MENTOR`, description, url: '/gulf-readiness-score' },
  twitter: { title: `${title} — GCC MENTOR`, description },
}

export default function GulfReadinessLayout({ children }: { children: React.ReactNode }) {
  return children
}
