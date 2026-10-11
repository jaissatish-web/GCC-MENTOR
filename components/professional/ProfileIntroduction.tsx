import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Check, Copy, MapPin, BriefcaseBusiness, Sparkles } from 'lucide-react'
import { IdentificationIcon } from '@heroicons/react/24/outline'
import { PageShell } from '@/components/layout/PageShell'
import { PROFESSIONAL_PLATFORMS, type ProfessionalPlatform } from '@/lib/professionalProfiles/config'

const content = {
  linkedin: {
    title: 'Your LinkedIn profile. Ready to copy.',
    description: 'Get a clear headline, About section and job descriptions for your Gulf job search. Built from your real experience.',
    purpose: 'Help recruiters understand your fit before they contact you.',
    reason: 'Recruiters use job titles, skills, locations and keywords to find candidates. A clear profile gives them useful information about you.',
    outputs: [['3 headline options', 'Choose one → paste into Headline'], ['Your About section', 'Review → paste into About'], ['Job descriptions', 'Copy each → the matching Experience'], ['Relevant skills', 'Add individually → Skills']],
    tips: [['Use the right job words', 'Check a suitable job advert. Use its skill names only when you actually have those skills.'], ['Set your job-search direction', 'Review Open to Work roles and locations. Pick visibility carefully; recruiters-only cannot guarantee complete privacy.'], ['Show work, not just titles', 'Describe what you did. Keep your real employer, job title and dates consistent with your CV.']],
    daily: 'Check messages and suitable jobs. Make a useful comment in your field. Correct one outdated detail if needed.',
    source: 'https://business.linkedin.com/hire/resources/talent-acquisition/how-to-use-linkedin-recruiter',
  },
  naukrigulf: {
    title: 'Your NaukriGulf profile. Ready to copy.',
    description: 'Get a focused CV headline, profile summary and employment descriptions. Make your Gulf job profile easier to understand.',
    purpose: 'Put your experience and Gulf job preferences in one clear profile.',
    reason: 'NaukriGulf is focused on Gulf vacancies. Keep your profile, key skills and uploaded CV consistent so employers can assess your background.',
    outputs: [['3 CV headline options', 'Choose one → paste into CV headline'], ['Your profile summary', 'Review → paste into Profile summary'], ['Employment descriptions', 'Copy each → the matching Employment'], ['Relevant key skills', 'Add individually → Key skills']],
    tips: [['Choose accurate categories', 'Select the industry and functional area that fit your work. Add the key skills you really use.'], ['Keep availability correct', 'Check your actual location, notice period and preferred Gulf locations. Do not present a preferred location as your current one.'], ['Keep your CV in sync', 'Attach your latest CV. Check employment dates, contact details and qualifications against your profile.']],
    daily: 'Check recruiter messages and job alerts. Apply to suitable jobs. Update your availability or CV when something changes.',
    source: 'https://www.naukrigulf.com/jobseeker/faq?locale=en',
  },
} as const

export function ProfileIntroduction({ platform }: { platform: ProfessionalPlatform }) {
  const config = PROFESSIONAL_PLATFORMS[platform]
  const copy = content[platform]
  const other = PROFESSIONAL_PLATFORMS[platform === 'linkedin' ? 'naukrigulf' : 'linkedin']
  const cta = <Link href={`${config.home}/workspace`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-ctl bg-teal px-5 py-3 text-sm font-semibold text-white hover:bg-teal-dark">Get my {config.name} content<ArrowRight size={18} /></Link>
  return <PageShell title={`${config.name} Optimization`} subtitle="Better profile writing. Clear steps. Ready to use." icon={IdentificationIcon} width="wide">
    <section className="professional-hero ui-hero grid overflow-hidden border border-line lg:grid-cols-[1.2fr_1fr]">
      <div className="flex flex-col justify-center p-6 sm:p-9">
        <span className="text-sm font-semibold text-[#8edacf]">FOR YOUR GULF JOB SEARCH</span>
        <h2 className="mt-3 max-w-xl ui-hero-title text-white">{copy.title}</h2>
        <p className="mt-4 max-w-xl text-base leading-7 text-white/80">{copy.description}</p>
        <div className="mt-5">{cta}</div>
        <p className="mt-3 text-sm text-white/75">Start a new draft or continue your saved result.</p>
      </div>
      <div className="relative min-h-[235px] sm:min-h-[300px]">
        <Image src="/professional/profile-hero-v1.webp" alt="Illustrative professionals preparing their Gulf job profiles" fill priority sizes="(min-width: 1024px) 45vw, 100vw" className="object-cover object-[65%_center]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#102d36]/90 via-transparent to-transparent" />
        <div className="professional-story-card absolute bottom-7 left-5 right-5 rounded-2xl border border-white/30 bg-white/95 p-4 shadow-lg">
          <p className="text-xs font-semibold tracking-wider text-teal">YOUR RESULT</p>
          <div className="mt-2 flex items-center gap-3"><Copy className="shrink-0 text-teal" size={24}/><div><p className="font-semibold text-ink">Review → Copy → Paste</p><p className="text-sm text-ink-muted">Your words, ready for {config.name}</p></div></div>
        </div>
        <span className="absolute bottom-1.5 right-4 text-xs text-white/90">Illustrative artwork</span>
      </div>
    </section>
    <section><h2 className="type-section text-ink">What you get — and where it goes</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{copy.outputs.map(([title, detail]) => <article key={title} className="rounded-card border border-line bg-white p-5"><Copy size={21} className="text-teal"/><h3 className="mt-3 font-semibold text-ink">{title}</h3><p className="mt-2 text-sm leading-6 text-ink-soft">{detail}</p></article>)}</div><p className="mt-3 text-sm text-ink-muted">Also included: a profile preview, personal tips and a saved update checklist. Employers, titles, qualifications and dates stay factual.</p></section>
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="ui-section"><MapPin className="text-teal" size={23}/><h2 className="mt-3 type-section text-ink">Why use {config.name} for Gulf jobs?</h2><p className="mt-3 font-semibold text-ink">{copy.purpose}</p><p className="mt-2 text-sm leading-6 text-ink-soft">{copy.reason}</p><a href={copy.source} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-11 items-center text-sm text-teal underline">Official platform guidance ↗</a></section>
      <section className="ui-section"><BriefcaseBusiness className="text-teal" size={23}/><h2 className="mt-3 type-section text-ink">Why prepare it with GCC Mentor?</h2><ul className="mt-4 space-y-3">{['One saved Career Profile — no need to type your history again.', 'Choose target roles and Gulf countries to guide the writing.', 'Get checked content you can edit and copy section by section.'].map(item=><li key={item} className="flex gap-2 text-sm leading-6 text-ink-soft"><Check className="mt-1 shrink-0 text-teal" size={17}/>{item}</li>)}</ul></section>
    </div>
    <section><h2 className="type-section text-ink">Three steps. Your profile is in your control.</h2><ol className="mt-4 grid gap-3 md:grid-cols-3">{[['Choose your direction', 'Use your Career Profile. Select target roles, countries and the experience to include.'], ['Review your result', 'Choose a headline. Check the summary, job descriptions and real employment dates.'], ['Copy and update', `Paste each section on ${config.name}. Save there, then tick your checklist here.`]].map(([title, detail],i)=><li key={title} className="rounded-card border border-line bg-white p-5"><span className="flex size-9 items-center justify-center rounded-full bg-teal-soft font-semibold text-teal">{i+1}</span><h3 className="mt-3 font-semibold text-ink">{title}</h3><p className="mt-2 text-sm leading-6 text-ink-soft">{detail}</p></li>)}</ol></section>
    <section><div className="flex items-center gap-2"><Sparkles size={22} className="text-teal"/><h2 className="type-section text-ink">Small changes worth trying</h2></div><p className="mt-2 text-sm text-ink-muted">Practical suggestions — results vary by role and employer.</p><div className="mt-4 grid gap-3 md:grid-cols-3">{copy.tips.map(([title,detail])=><article key={title} className="ui-section"><h3 className="font-semibold text-ink">{title}</h3><p className="mt-2 text-sm leading-6 text-ink-soft">{detail}</p></article>)}</div><div className="mt-3 rounded-card border border-[#eadab9] bg-[#fffbf1] p-5"><h3 className="font-semibold text-ink">Your useful daily check-in</h3><p className="mt-2 text-sm leading-6 text-ink-soft">{copy.daily}</p><p className="mt-3 text-sm leading-6 text-ink-muted"><strong>Tip to treat with caution:</strong> editing and saving every day to move higher in searches. This is unverified; a cosmetic edit does not guarantee a ranking boost.</p></div></section>
    <section className="flex flex-col gap-4 ui-section md:flex-row md:items-center md:justify-between"><div><h2 className="type-section text-ink">Get your copy-ready profile content</h2><p className="mt-2 text-sm text-ink-soft">Return to this page anytime from your workspace.</p></div>{cta}</section>
    <div className="flex flex-col gap-2 text-sm text-ink-muted"><Link href={other.home} className="inline-flex min-h-11 items-center font-semibold text-teal">Prepare my {other.name} profile →</Link><p>GCC Mentor is an independent preparation tool. You publish changes yourself. No recruiter response or ranking is guaranteed.</p></div>
  </PageShell>
}
