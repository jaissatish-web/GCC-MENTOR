import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Check, ShieldCheck, Search, RefreshCw, MapPin, BriefcaseBusiness, Sparkles, CircleUserRound } from 'lucide-react'
import { IdentificationIcon } from '@heroicons/react/24/outline'
import { PageShell } from '@/components/layout/PageShell'
import { PROFESSIONAL_PLATFORMS, type ProfessionalPlatform } from '@/lib/professionalProfiles/config'

const content = {
  linkedin: {
    eyebrow: 'YOUR PROFESSIONAL STORY',
    title: 'Let your profile speak before your interview.',
    description: 'Show Gulf recruiters what you do, where you add value and the direction you want to take. Build a LinkedIn profile that sounds like you.',
    why: 'Your CV supports an application. LinkedIn also supports discovery and professional connections.',
    reasons: [
      ['Be easier to understand', 'A clear headline and relevant saved skills give recruiters context for your professional field.'],
      ['Build a credible story', 'Your About, employment history and qualifications should tell the same story as your CV.'],
      ['Connect with your field', 'Follow relevant employers, contribute useful comments and build genuine professional relationships.'],
    ],
    remarks: [
      ['Use Open to Work thoughtfully', 'Set the roles and locations you are actually considering. Choose the visibility setting that suits you; recruiters-only is not a guarantee of complete privacy.'],
      ['Make real updates', 'Add a completed course, a genuine responsibility or a work sample you are allowed to share. Save when details change. Daily cosmetic edits are not a verified ranking shortcut.'],
      ['Make keywords honest', 'Use the names of skills you really have. A target job title is a career direction, not an already-held position.'],
    ],
    routine: ['Check relevant jobs and messages.', 'Engage with one useful post in your field.', 'Review one profile section; save a meaningful correction when needed.'],
    fields: [['Headline', 'Your professional identity and supported strengths.'], ['About', 'A readable, first-person story with real evidence.'], ['Experience', 'Actual employers, titles, dates and contributions.'], ['Skills & qualifications', 'Relevant saved skills, education and certifications.'], ['Photo & visibility', 'A clear recent photo, suitable banner and intentional visibility settings.']],
    sources: [{ title: 'LinkedIn: Open to Work and visibility', url: 'https://www.linkedin.com/help/linkedin/answer/a507508/let-recruiters-know-you-re-open-to-opportunities' }, { title: 'LinkedIn: how recruiter search works', url: 'https://business.linkedin.com/hire/resources/talent-acquisition/how-to-use-linkedin-recruiter' }],
  },
  naukrigulf: {
    eyebrow: 'YOUR GULF JOBSEEKER PROFILE',
    title: 'Make your Gulf job profile clear, current and ready.',
    description: 'Turn your career facts into a focused NaukriGulf profile. Help recruiters understand your skills, experience and the opportunities you are considering.',
    why: 'A complete job-portal profile gives Gulf employers more context than an uploaded CV alone.',
    reasons: [
      ['Explain your fit', 'A focused CV headline, profile summary and accurate key skills help explain your professional strengths.'],
      ['Keep details consistent', 'Match your employment and qualifications to your latest CV. Correct conflicting dates and outdated details.'],
      ['Set a useful direction', 'Review preferred roles, industry and locations, then use job alerts and relevant applications.'],
    ],
    remarks: [
      ['Keep your profile current', 'Review availability, notice period, location and CV when they change. Focus on meaningful updates; a daily edit does not guarantee priority in recruiter searches.'],
      ['Complete the matching fields', 'Use accurate key skills, employment, qualifications and job preferences. Choose portal categories that describe your actual background.'],
      ['Keep your latest CV attached', 'Upload the version you intend employers to read and confirm it opens correctly. Check contact and visibility settings inside NaukriGulf.'],
    ],
    routine: ['Check job alerts and recruiter messages.', 'Apply to roles that match your actual experience.', 'Review one section and save a real update when something changes.'],
    fields: [['CV headline', 'A concise description of your real professional strengths.'], ['Profile summary', 'A clear overview grounded in your saved career facts.'], ['Employment & key skills', 'Actual job details, supported responsibilities and exact skill names.'], ['Education & qualifications', 'Saved degrees, institutions and certifications.'], ['Preferences & uploaded CV', 'Preferred roles and locations, current availability and a consistent CV.']],
    sources: [{ title: 'NaukriGulf: jobseeker profile FAQs', url: 'https://www.naukrigulf.com/jobseeker/faq?locale=en' }, { title: 'NaukriGulf: profile guidance', url: 'https://www.naukrigulf.com/career-tips/10-ways-to-make-your-online-profile-look-attractive-to-recruiters/' }],
  },
} as const

export function ProfileIntroduction({ platform }: { platform: ProfessionalPlatform }) {
  const config = PROFESSIONAL_PLATFORMS[platform]
  const copy = content[platform]
  const other = PROFESSIONAL_PLATFORMS[platform === 'linkedin' ? 'naukrigulf' : 'linkedin']
  return <PageShell title={`${config.name} profile`} subtitle="Your professional presence, prepared with GCC Mentor." icon={IdentificationIcon} width="wide">
    <Link href="/professional-profile" className="inline-flex min-h-11 items-center text-sm font-semibold text-teal">← Professional profiles</Link>
    <section className="professional-hero grid overflow-hidden rounded-[24px] border border-line bg-[#102d36] lg:grid-cols-2">
      <div className="flex flex-col justify-center p-6 sm:p-9 lg:p-10">
        <span className="w-fit rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm font-semibold text-white">{config.name} · GCC Mentor</span>
        <p className="mt-6 text-xs font-semibold tracking-[0.13em] text-[#8edacf]">{copy.eyebrow}</p>
        <h2 className="mt-3 max-w-xl text-[30px] font-semibold leading-[1.12] tracking-tight text-white sm:text-[40px]">{copy.title}</h2>
        <p className="mt-5 max-w-xl text-base leading-7 text-white/80">{copy.description}</p>
        <div className="mt-6 flex flex-wrap gap-x-5 gap-y-3 text-sm text-white/90"><span className="flex items-center gap-2"><ShieldCheck size={18} className="text-[#8edacf]" />Real facts only</span><span className="flex items-center gap-2"><CircleUserRound size={18} className="text-[#8edacf]" />For every profession</span></div>
      </div>
      <div className="relative min-h-[275px] sm:min-h-[340px]">
        <Image src="/professional/profile-hero-v1.webp" alt="Illustrative professionals preparing a career profile in a Gulf office" fill priority sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover object-[65%_center]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#102d36]/90 via-transparent to-transparent" />
        <div className="professional-story-card absolute bottom-7 left-5 right-5 rounded-2xl border border-white/30 bg-white/95 p-4 shadow-lg sm:left-8 sm:right-8">
          <p className="text-xs font-semibold tracking-wider text-teal">ONE CAREER PROFILE</p>
          <div className="mt-2 flex items-center gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-teal-soft text-teal"><BriefcaseBusiness size={20} /></span><div><p className="font-semibold text-ink">Your real experience</p><p className="text-sm text-ink-muted">A clearer {config.name} profile</p></div><ArrowRight className="ml-auto shrink-0 text-teal" size={20} /></div>
        </div>
        <span className="absolute bottom-1.5 right-4 text-xs text-white/90">Illustrative artwork</span>
      </div>
    </section>
    <section className="rounded-card border border-line bg-white p-5 sm:p-8">
      <p className="text-sm font-semibold text-teal">WHY {config.name.toUpperCase()} MATTERS</p><h2 className="mt-2 max-w-3xl type-section text-ink">{copy.why}</h2>
      <div className="mt-6 grid gap-5 md:grid-cols-3">{copy.reasons.map(([title, detail], i) => { const Icon = [Search, ShieldCheck, MapPin][i]; return <article key={title} className="min-w-0"><span className="flex size-11 items-center justify-center rounded-xl bg-teal-soft text-teal"><Icon size={21} /></span><h3 className="mt-3 font-semibold text-ink">{title}</h3><p className="mt-2 text-sm leading-6 text-ink-soft">{detail}</p></article> })}</div>
    </section>
    <section className="rounded-card border border-[#eadab9] bg-[#fffbf1] p-5 sm:p-8">
      <div className="flex items-center gap-3"><RefreshCw size={22} className="shrink-0 text-[#92701e]" /><h2 className="type-section text-ink">The habits that support a credible profile</h2></div>
      <div className="mt-5 space-y-5">{copy.remarks.map(([title, detail]) => <article key={title}><h3 className="font-semibold text-ink">{title}</h3><p className="mt-1 text-sm leading-6 text-ink-soft">{detail}</p></article>)}</div>
      <div className="mt-6 rounded-xl border border-[#eadab9] bg-white/70 p-4"><p className="font-semibold text-ink">A useful daily check-in</p><ul className="mt-3 space-y-2">{copy.routine.map(item => <li key={item} className="flex gap-2 text-sm leading-6 text-ink-soft"><Check size={17} className="mt-1 shrink-0 text-teal" />{item}</li>)}</ul><p className="mt-3 text-xs leading-5 text-ink-muted">This is a suggested routine, not a platform ranking rule. Updating here prepares a draft; you save the changes on {config.name} yourself.</p></div>
    </section>
    <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
      <section className="rounded-card border border-line bg-white p-5 sm:p-8"><h2 className="type-section text-ink">What your profile needs</h2><div className="mt-5 divide-y divide-line">{copy.fields.map(([title, detail]) => <article key={title} className="py-3 first:pt-0"><h3 className="text-sm font-semibold text-ink">{title}</h3><p className="mt-1 text-sm leading-6 text-ink-soft">{detail}</p></article>)}</div></section>
      <section className="rounded-card border border-line bg-teal-soft/40 p-5 sm:p-8"><Sparkles size={24} className="text-teal" /><h2 className="mt-3 type-section text-ink">How GCC Mentor helps</h2><ol className="mt-5 space-y-4">{['Start with your saved Career Profile.', 'Choose your audience and relevant experience.', 'Review fact-checked writing in a profile preview.', `Copy it to ${config.name} and track your updates.`].map((item, i) => <li key={item} className="flex gap-3 text-sm leading-6 text-ink-soft"><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white font-semibold text-teal">{i + 1}</span>{item}</li>)}</ol><p className="mt-6 text-sm leading-6 text-ink-muted">You keep control. No {config.name} password, automatic publishing or promised recruiter response. GCC Mentor is an independent preparation tool.</p></section>
    </div>
    <section className="flex flex-col gap-5 rounded-card border border-line bg-white p-5 sm:p-8 md:flex-row md:items-center md:justify-between"><div><h2 className="type-section text-ink">Ready to prepare your profile?</h2><p className="mt-2 text-sm leading-6 text-ink-soft">Start a new draft or continue your saved content. You can return to this guide anytime.</p></div><Link href={`${config.home}/workspace`} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-ctl bg-teal px-5 py-3 text-sm font-semibold text-white hover:bg-teal-dark">Optimize my {config.name} profile<ArrowRight size={18} /></Link></section>
    <div className="flex flex-wrap justify-between gap-4 text-sm"><Link href={other.home} className="inline-flex min-h-11 items-center font-semibold text-teal">Explore {other.name} preparation →</Link><div className="flex flex-col gap-2">{copy.sources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="min-h-11 content-center text-xs text-ink-muted underline">{source.title} ↗</a>)}</div></div>
  </PageShell>
}
