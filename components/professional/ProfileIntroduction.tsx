import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { PROFESSIONAL_PLATFORMS, type ProfessionalPlatform } from '@/lib/professionalProfiles/config'

const content = {
  linkedin: {
    title: 'Your LinkedIn profile. Ready to copy.',
    description: 'Get a clear headline, About section and job descriptions for your Gulf job search. Built from your real experience.',
    purpose: 'Help recruiters understand your fit before they contact you.',
    reason: 'Recruiters use job titles, skills, locations and keywords to find candidates. A clear profile gives them useful information about you.',
    outputs: [['3 headline options', 'Choose one → paste into Headline'], ['Your About section', 'Review → paste into About'], ['Job descriptions', 'Copy each → the matching Experience'], ['Relevant skills', 'Add individually → Skills']],
    tips: [['Use the right job words', 'Check a suitable job advert. Use its skill names only when you actually have those skills.'], ['Set your job-search direction', 'Review Open to Work roles and locations. Pick visibility carefully; recruiters-only cannot guarantee complete privacy.'], ['Show work, not just titles', 'Describe what you did. Keep your real employer, job title and dates consistent with your resume.']],
    daily: 'Check messages and suitable jobs. Make a useful comment in your field. Correct one outdated detail if needed.',
    source: 'https://business.linkedin.com/hire/resources/talent-acquisition/how-to-use-linkedin-recruiter',
  },
  naukrigulf: {
    title: 'Your NaukriGulf profile. Ready to copy.',
    description: 'Get a focused resume headline, profile summary and employment descriptions. Make your Gulf job profile easier to understand.',
    purpose: 'Put your experience and Gulf job preferences in one clear profile.',
    reason: 'NaukriGulf is focused on Gulf vacancies. Keep your profile, key skills and uploaded resume consistent so employers can assess your background.',
    outputs: [['3 resume headline options', 'Choose one → paste into resume headline'], ['Your profile summary', 'Review → paste into Profile summary'], ['Employment descriptions', 'Copy each → the matching Employment'], ['Relevant key skills', 'Add individually → Key skills']],
    tips: [['Choose accurate categories', 'Select the industry and functional area that fit your work. Add the key skills you really use.'], ['Keep availability correct', 'Check your actual location, notice period and preferred Gulf locations. Do not present a preferred location as your current one.'], ['Keep your resume in sync', 'Attach your latest resume. Check employment dates, contact details and qualifications against your profile.']],
    daily: 'Check recruiter messages and job alerts. Apply to suitable jobs. Update your availability or resume when something changes.',
    source: 'https://www.naukrigulf.com/jobseeker/faq?locale=en',
  },
} as const

export function ProfileIntroduction({ platform }: { platform: ProfessionalPlatform }) {
  const config = PROFESSIONAL_PLATFORMS[platform]
  const copy = content[platform]
  const other = PROFESSIONAL_PLATFORMS[platform === 'linkedin' ? 'naukrigulf' : 'linkedin']
  const cta = <Link href={`${config.home}/workspace`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-ctl bg-teal px-5 py-3 text-sm font-semibold text-white hover:bg-teal-dark">Get my {config.name} content<ArrowRight size={18} /></Link>
  return <PageShell title={`${config.name} Optimization`} subtitle={copy.description} width="wide" actions={cta}>
    <section aria-labelledby="profile-outputs" className="rounded-card border border-line bg-white p-5">
      <h2 id="profile-outputs" className="type-section text-ink">What you get — and where it goes</h2>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2">
        {copy.outputs.map(([title, detail]) => <li key={title}><h3 className="font-semibold text-ink">{title}</h3><p className="mt-1 text-sm leading-6 text-ink-soft">{detail}</p></li>)}
      </ul>
      <p className="mt-4 border-t border-line pt-4 text-sm leading-6 text-ink-muted">Use your saved Career Profile, choose your target roles, then review and copy each section. Your employer, job title and dates must match your experience. Start a new draft or continue your saved result.</p>
    </section>
    <details className="rounded-card border border-line bg-white p-5">
      <summary className="min-h-11 cursor-pointer content-center font-semibold text-ink">Profile update guidance</summary>
      <div className="mt-3 space-y-4 text-sm leading-6 text-ink-soft">
        {copy.tips.map(([title, detail]) => <p key={title}><strong className="text-ink">{title}.</strong> {detail}</p>)}
        <p>{copy.daily}</p>
        <a href={copy.source} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center text-teal underline">Official platform guidance ↗</a>
      </div>
    </details>
    <div className="flex flex-col gap-2 text-sm text-ink-muted">
      <Link href={other.home} className="inline-flex min-h-11 items-center font-semibold text-teal">Prepare my {other.name} profile →</Link>
      <p>Review your content before publishing it on {config.name}. You publish changes yourself; recruiter responses and rankings are not guaranteed.</p>
    </div>
  </PageShell>
}
