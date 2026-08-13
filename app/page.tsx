import Image from 'next/image'
import Link from 'next/link'
import { GULF_COUNTRIES } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SiteNav } from '@/components/marketing/SiteNav'

const skyline = 'https://images.unsplash.com/photo-1652707228067-25672fa0b082?auto=format&fit=crop&w=1800&q=85'
const professional = 'https://images.unsplash.com/photo-1672748341520-6a839e6c05bb?auto=format&fit=crop&w=1000&q=85'

const painPoints = [
  ['01', 'You apply everywhere but hear nothing', 'More applications do not fix a CV that is unclear, generic or poorly aligned.'],
  ['02', 'Your CV is not built for the Gulf', 'A strong career can still be presented in the wrong format or context for GCC hiring.'],
  ['03', 'You use one resume for every job', 'Different roles need different evidence, keywords and priorities.'],
  ['04', 'You do not know what to fix first', 'Without a clear score and diagnosis, every application becomes guesswork.'],
  ['05', 'You write generic AI applications', 'Generic output sounds polished but can miss your real experience and the actual job.'],
  ['06', 'Interview preparation starts too late', 'The resume is only the first step in being ready for a better opportunity.'],
] as const

const services = [
  ['GCC Readiness', 'See how prepared your resume is for the Gulf market.', 'Free', '/ats-scan'],
  ['ATS & Job Match', 'Check your resume against the exact job description and see where you align.', 'Live', '/ats-scan'],
  ['Resume Optimization', 'Reframe your real experience for one target role without inventing facts.', 'Live', '/optimize'],
  ['Career Profile', 'Build one trusted profile that powers your future applications.', 'Live', '/onboarding'],
  ['Resume Library', 'Keep versions and application documents organized in one place.', 'Live', '/dashboard/library'],
  ['Cover Letter', 'Create a role-specific letter grounded in your actual experience.', 'Live', '/cover-letter'],
  ['Job Match', 'Turn a job description into a clear fit diagnosis and next actions.', 'Live', '/job-match'],
  ['Interview Preparation', 'Practice technical, HR and communication answers.', 'Coming soon', '#coming-soon'],
] as const

const scoreCards = [
  ['GCC READINESS', '78', 'Market positioning'],
  ['ATS SCORE', '92', 'For this job'],
  ['JOB MATCH', '88', 'Experience fit'],
] as const

const comparisonRows = [
  ['Starting point', 'Generic prompt', 'Your real Career Profile'],
  ['Resume review', 'One-size-fits-all', 'GCC + job-specific'],
  ['Optimization', 'May embellish', 'Grounded in your facts'],
  ['Application', 'Resume only', 'Resume + Job Match + Cover Letter'],
  ['Direction', 'Isolated outputs', 'One connected career journey'],
] as const

const faq = [
  ['Do I need an account to check my resume?', 'No. The free GCC readiness scan works without login. You can upload a PDF or Word document, or paste your resume text.'],
  ['Can I check my resume against a specific job?', 'Yes. Paste the job description with your resume and GCC MENTOR can show job-specific alignment and match categories.'],
  ['Will GCC MENTOR invent achievements?', 'No. Resume optimization is designed around your Career Profile and grounded facts. It improves framing rather than inventing employers, dates, titles or achievements.'],
  ['Which GCC countries are supported?', 'Saudi Arabia, UAE, Qatar, Oman, Kuwait and Bahrain are supported for the current resume and optimization experience.'],
  ['Are interview tools live?', 'Not yet. Interview preparation is clearly marked as coming soon so the landing page never promises a feature that is not available.'],
]

function Kicker({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return <p className={`text-[11px] font-bold uppercase tracking-[0.2em] ${dark ? 'text-gold-text-dark' : 'text-gold-text'}`}>{children}</p>
}

function ScoreCard({ label, value, caption }: { label: string; value: string; caption: string }) {
  return <div className="rounded-radius-lg border border-line-light bg-surface-light/95 p-4 shadow-redesign-sm backdrop-blur"><p className="text-[10px] font-bold tracking-[0.16em] text-ink-400">{label}</p><p className="mt-2 font-mono text-3xl font-bold text-forest">{value}<span className="text-sm">/100</span></p><p className="mt-1 text-xs text-ink-700">{caption}</p></div>
}

function ResumeVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[650px]">
      <div className="absolute -inset-5 rounded-[2rem] bg-redesign-gold/10 blur-2xl" />
      <div className="relative overflow-hidden rounded-radius-xl border border-white/15 bg-forest-deep/90 p-3 shadow-redesign-xl">
        <div className="relative overflow-hidden rounded-radius-lg border border-white/10 bg-surface-light">
          <Image src={skyline} alt="Dubai skyline at dusk" fill className="absolute inset-0 h-full w-full object-cover opacity-[0.08]" priority />
          <div className="relative p-5 sm:p-7">
            <div className="flex items-center justify-between border-b border-line-light pb-4">
              <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-forest">GCC MENTOR</p><p className="mt-1 text-[11px] text-ink-400">Target application analysis</p></div>
              <span className="rounded-full bg-forest-tint px-3 py-1 text-[10px] font-bold text-forest">LIVE CHECK</span>
            </div>
            <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-radius-lg border border-line-light bg-white/90 p-5 shadow-redesign-sm">
                <div className="flex items-start justify-between gap-3"><div><p className="font-serif text-xl text-ink-900">Ahmed Khan</p><p className="mt-1 text-xs font-semibold text-forest">Senior Project Manager · Dubai, UAE</p></div><span className="rounded bg-surface-2-light px-2 py-1 text-[9px] font-bold text-ink-400">CV.pdf</span></div>
                <div className="mt-5 space-y-4">
                  <div><p className="text-[9px] font-bold uppercase tracking-wider text-ink-400">Professional Summary</p><div className="mt-2 space-y-1.5"><span className="block h-2 w-[92%] rounded bg-ink-200" /><span className="block h-2 w-[82%] rounded bg-ink-200" /><span className="block h-2 w-[68%] rounded bg-ink-200" /></div></div>
                  <div><p className="text-[9px] font-bold uppercase tracking-wider text-ink-400">Experience</p><div className="mt-2 space-y-1.5"><span className="block h-2 w-[96%] rounded bg-ink-200" /><span className="block h-2 w-[88%] rounded bg-ink-200" /><span className="block h-2 w-[74%] rounded bg-ink-200" /></div></div>
                  <div><p className="text-[9px] font-bold uppercase tracking-wider text-ink-400">Skills</p><div className="mt-2 flex flex-wrap gap-1.5"><span className="rounded bg-forest-tint px-2 py-1 text-[9px] font-bold text-forest">PMP</span><span className="rounded bg-forest-tint px-2 py-1 text-[9px] font-bold text-forest">Agile</span><span className="rounded bg-forest-tint px-2 py-1 text-[9px] font-bold text-forest">SAP</span><span className="rounded bg-forest-tint px-2 py-1 text-[9px] font-bold text-forest">Leadership</span></div></div>
                </div>
              </div>
              <div className="space-y-3">
                {scoreCards.map(([label, value, caption]) => <ScoreCard key={label} label={label} value={value} caption={caption} />)}
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-radius-lg border border-redesign-gold/40 bg-redesign-gold-tint p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-gold-text">3 priority improvements</p><p className="mt-2 text-sm font-semibold text-ink-900">Missing role keywords · weak impact language · GCC positioning</p></div>
              <div className="rounded-radius-lg border border-forest/15 bg-forest-tint p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-forest">Next action</p><p className="mt-2 text-sm font-semibold text-ink-900">Optimize this resume for the target job</p></div>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute -bottom-5 -left-2 hidden w-44 sm:block"><ScoreCard label="GULF POSITIONING" value="84" caption="Country-aware" /></div>
      <div className="absolute -right-3 top-10 hidden w-48 lg:block"><ScoreCard label="ROLE TARGET" value="88" caption="Senior PM · Dubai" /></div>
    </div>
  )
}

function PainSection() {
  return <section id="problem" className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28"><div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-end"><div><Kicker>The problem</Kicker><h2 className="mt-4 font-serif text-4xl leading-tight text-ink-900 sm:text-5xl">You do not need more applications. You need a better application strategy.</h2></div><p className="max-w-2xl text-lg leading-relaxed text-ink-700">If you are experienced but still struggling to land a well-paid GCC role, the problem is often not your career. It is how your experience is positioned, matched and prepared for the job.</p></div><div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{painPoints.map(([number, title, description]) => <Card key={number} tone="light" className="flex gap-4 p-5"><span className="font-mono text-xs text-terra">{number}</span><div><h3 className="font-serif text-xl text-ink-900">{title}</h3><p className="mt-2 text-sm leading-relaxed text-ink-700">{description}</p></div></Card>)}</div></section>
}

function HowItWorks() {
  const steps = [['01', 'Upload your resume', 'PDF, Word or pasted text.'], ['02', 'Add the job description', 'Tell us exactly what you are targeting.'], ['03', 'Get your scores', 'GCC Readiness, ATS and Job Match.'], ['04', 'Fix what matters', 'Optimize the resume and create the cover letter.']] as const
  return <section id="how-it-works" className="border-y border-line-dark bg-forest-deep text-ink-900-dark"><div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 lg:px-12 lg:py-24"><div className="max-w-3xl"><Kicker dark>How it works</Kicker><h2 className="mt-4 font-serif text-4xl leading-tight sm:text-5xl">From “Why am I not getting interviews?” to a clearer next move.</h2><p className="mt-5 text-lg leading-relaxed text-ink-900-dark/70">GCC MENTOR turns your existing experience into a job-specific preparation loop.</p></div><div className="mt-12 grid gap-3 md:grid-cols-2 lg:grid-cols-4">{steps.map(([number, title, description]) => <div key={number} className="rounded-radius-lg border border-ink-900-dark/20 bg-ink-900-dark/10 p-6"><span className="font-mono text-xs text-redesign-gold-dark">{number}</span><h3 className="mt-8 font-serif text-2xl">{title}</h3><p className="mt-2 text-sm leading-relaxed text-ink-900-dark/65">{description}</p></div>)}</div><div className="mt-10"><Link href="/ats-scan" className={buttonVariants({ variant: 'purchase' })}>Check my GCC readiness free</Link></div></div></section>
}

function ScoringSection() {
  return <section id="platform" className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28"><div className="grid gap-12 lg:grid-cols-[0.75fr_1.25fr] lg:items-center"><div><Kicker>Know before you apply</Kicker><h2 className="mt-4 font-serif text-4xl leading-tight text-ink-900 sm:text-5xl">Your resume is not just a document. It is your application signal.</h2><p className="mt-5 text-lg leading-relaxed text-ink-700">GCC MENTOR checks your resume against Gulf-readiness factors and, when you provide a job description, gives you a job-specific match diagnosis.</p><div className="mt-8 space-y-3"><div className="rounded-radius-lg border border-line-light bg-surface-2-light p-5"><p className="font-serif text-xl text-ink-900">GCC Readiness</p><p className="mt-2 text-sm leading-relaxed text-ink-700">Are your structure, clarity and Gulf-market positioning ready?</p></div><div className="rounded-radius-lg border border-line-light bg-surface-2-light p-5"><p className="font-serif text-xl text-ink-900">ATS Score</p><p className="mt-2 text-sm leading-relaxed text-ink-700">Is your resume readable and aligned for the application?</p></div><div className="rounded-radius-lg border border-redesign-gold/50 bg-redesign-gold-tint p-5"><p className="font-serif text-xl text-ink-900">Job Match</p><p className="mt-2 text-sm leading-relaxed text-ink-700">Does your actual experience match the requirements of this particular job?</p></div></div></div><div><ResumeVisual /></div></div></section>
}

function ServicesSection() {
  return <section id="services" className="border-y border-line-light bg-surface-2-light"><div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28"><div className="max-w-3xl"><Kicker>Everything in one career system</Kicker><h2 className="mt-4 font-serif text-4xl leading-tight text-ink-900 sm:text-5xl">Every tool has one job: move you closer to a better-fit opportunity.</h2><p className="mt-5 text-lg leading-relaxed text-ink-700">Start free, then use the live tools you need. Future tools stay clearly marked so you always know what is real today.</p></div><div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{services.map(([title, description, status, href]) => <Card key={title} tone="light" className="flex min-h-[230px] flex-col p-6"><div className="flex items-start justify-between gap-3"><span className="rounded-full border border-line-light px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-400">{status}</span><span className="text-gold-text">→</span></div><h3 className="mt-6 font-serif text-2xl text-ink-900">{title}</h3><p className="mt-2 text-sm leading-relaxed text-ink-700">{description}</p>{href.startsWith('/') ? <Link href={href} className="mt-auto pt-6 text-sm font-bold text-forest underline underline-offset-4">Explore {title}</Link> : <span className="mt-auto pt-6 text-sm font-bold text-ink-400">Planned</span>}</Card>)}</div></div></section>
}

function OptimizationSection() {
  return <section id="optimization" className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28"><div className="grid gap-10 lg:grid-cols-2 lg:items-center"><div className="relative min-h-[420px] overflow-hidden rounded-radius-xl bg-forest-deep p-5 shadow-redesign-lg"><Image src={professional} alt="Professional working in the Gulf" fill className="absolute inset-0 h-full w-full object-cover opacity-20" /><div className="relative flex h-full flex-col justify-center gap-4"><div className="rounded-radius-lg bg-surface-light p-5 shadow-redesign-md"><p className="text-[10px] font-bold uppercase tracking-wider text-ink-400">Before</p><p className="mt-3 text-sm text-ink-700">Responsible for managing projects and coordinating teams.</p></div><div className="mx-auto text-2xl text-gold-text-dark">↓</div><div className="rounded-radius-lg border border-redesign-gold/40 bg-surface-light p-5 shadow-redesign-md"><div className="flex items-center justify-between"><p className="text-[10px] font-bold uppercase tracking-wider text-gold-text">Optimized for target role</p><span className="rounded-full bg-forest-tint px-2 py-1 text-[9px] font-bold text-forest">GROUNDED</span></div><p className="mt-3 text-sm font-semibold leading-relaxed text-ink-900">Reframed to emphasize the relevant delivery, leadership and project evidence already present in your Career Profile.</p></div></div></div><div><Kicker>Resume optimization</Kicker><h2 className="mt-4 font-serif text-4xl leading-tight text-ink-900 sm:text-5xl">Stronger positioning. Same truth.</h2><p className="mt-5 text-lg leading-relaxed text-ink-700">GCC MENTOR can reframe summaries and experience bullets for a target Gulf role while keeping your real employers, titles, dates, education and certifications grounded.</p><div className="mt-8 grid gap-3 sm:grid-cols-2"><Card tone="light" className="p-5"><p className="font-bold text-forest">Reframed</p><p className="mt-2 text-sm text-ink-700">Make relevant experience easier to see.</p></Card><Card tone="light" className="p-5"><p className="font-bold text-forest">Reordered</p><p className="mt-2 text-sm text-ink-700">Prioritize skills by the target role.</p></Card><Card tone="light" className="p-5"><p className="font-bold text-forest">Grounded</p><p className="mt-2 text-sm text-ink-700">No invented claims or fake achievements.</p></Card><Card tone="light" className="p-5"><p className="font-bold text-forest">Reviewable</p><p className="mt-2 text-sm text-ink-700">You stay in control of the final version.</p></Card></div><Link href="/optimize" className="mt-8 inline-flex font-bold text-forest underline underline-offset-4">See resume optimization →</Link></div></div></section>
}

function ApplicationSection() {
  return <section className="border-y border-line-dark bg-forest-deep text-ink-900-dark"><div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 lg:px-12 lg:py-24"><div className="max-w-3xl"><Kicker dark>One application, not five disconnected tools</Kicker><h2 className="mt-4 font-serif text-4xl leading-tight sm:text-5xl">Build the application around the job you actually want.</h2><p className="mt-5 text-lg leading-relaxed text-ink-900-dark/70">Check the fit. Optimize the resume. Create the cover letter. Keep your career story consistent from the first click to the interview.</p></div><div className="mt-12 grid gap-3 md:grid-cols-4"><Link href="/job-match" className="rounded-radius-lg border border-ink-900-dark/20 bg-ink-900-dark/10 p-6 transition hover:border-redesign-gold-dark/50"><span className="font-mono text-xs text-redesign-gold-dark">01</span><h3 className="mt-7 font-serif text-2xl">Job Match</h3><p className="mt-2 text-sm text-ink-900-dark/65">Understand the fit before spending time applying.</p></Link><Link href="/optimize" className="rounded-radius-lg border border-ink-900-dark/20 bg-ink-900-dark/10 p-6 transition hover:border-redesign-gold-dark/50"><span className="font-mono text-xs text-redesign-gold-dark">02</span><h3 className="mt-7 font-serif text-2xl">Optimize</h3><p className="mt-2 text-sm text-ink-900-dark/65">Make the relevant evidence easier to find.</p></Link><Link href="/cover-letter" className="rounded-radius-lg border border-ink-900-dark/20 bg-ink-900-dark/10 p-6 transition hover:border-redesign-gold-dark/50"><span className="font-mono text-xs text-redesign-gold-dark">03</span><h3 className="mt-7 font-serif text-2xl">Cover Letter</h3><p className="mt-2 text-sm text-ink-900-dark/65">Connect your story to the employer and role.</p></Link><div className="rounded-radius-lg border border-ink-900-dark/20 bg-ink-900-dark/10 p-6"><span className="font-mono text-xs text-redesign-gold-dark">04</span><h3 className="mt-7 font-serif text-2xl">Interview</h3><p className="mt-2 text-sm text-ink-900-dark/65">Preparation is coming next.</p><span className="mt-5 inline-flex rounded-full border border-redesign-gold-dark/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-text-dark">Coming soon</span></div></div></div></section>
}

function CountriesSection() {
  return <section id="industries" className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28"><div className="grid gap-10 lg:grid-cols-2 lg:items-center"><div><Kicker>Built for the Gulf</Kicker><h2 className="mt-4 font-serif text-4xl leading-tight text-ink-900 sm:text-5xl">One trusted career story. A target for every GCC market.</h2><p className="mt-5 text-lg leading-relaxed text-ink-700">Start with your real experience, then choose the country and role you want to target. The current experience supports the six GCC markets below.</p><div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">{GULF_COUNTRIES.slice(0, 6).map(country => <Link href="/onboarding" key={country.value}><Card tone="light" className="p-4 transition hover:border-redesign-gold"><p className="font-bold text-ink-900">{country.label}</p><p className="mt-1 text-xs text-forest">CV support live</p></Card></Link>)}</div></div><div className="relative min-h-[420px] overflow-hidden rounded-radius-xl bg-forest-deep"><Image src={skyline} alt="Gulf skyline" fill className="object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-forest-deep via-forest-deep/20 to-transparent" /><div className="absolute bottom-0 left-0 right-0 p-7 text-ink-900-dark"><Kicker dark>Middle East career focus</Kicker><p className="mt-3 max-w-md font-serif text-3xl">From India and beyond to the Gulf opportunity you are targeting.</p></div></div></div></section>
}

function TrustSection() {
  return <section className="border-y border-line-light bg-surface-2-light"><div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 lg:px-12 lg:py-24"><div className="grid gap-4 md:grid-cols-3"><Card tone="light" className="p-6"><p className="font-serif text-2xl text-forest">No invented achievements</p><p className="mt-3 text-sm leading-relaxed text-ink-700">Your career history stays grounded in the information you provide.</p></Card><Card tone="light" className="p-6"><p className="font-serif text-2xl text-forest">See the diagnosis first</p><p className="mt-3 text-sm leading-relaxed text-ink-700">Start with a free scan before deciding whether you need the deeper workflow.</p></Card><Card tone="light" className="p-6"><p className="font-serif text-2xl text-forest">You stay in control</p><p className="mt-3 text-sm leading-relaxed text-ink-700">Generated changes are reviewable. Your final application is still your decision.</p></Card></div></div></section>
}

function PricingSection() {
  const plans = [['Essential', '₹399', 'Start with one stronger target resume'], ['Professional', '₹1,499', 'Prepare more completely for applications'], ['Mentor', '₹2,499', 'Build an ongoing GCC career system']] as const
  return <section id="pricing" className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28"><div className="max-w-3xl"><Kicker>Simple, transparent pricing</Kicker><h2 className="mt-4 font-serif text-4xl leading-tight text-ink-900 sm:text-5xl">Start with proof. Upgrade when you need more.</h2><p className="mt-5 text-lg leading-relaxed text-ink-700">Use the free readiness check first. Paid packages are shown clearly before purchase, while future package features remain marked as planned.</p></div><div className="mt-12 grid gap-5 lg:grid-cols-3">{plans.map(([name, price, description], index) => <Card key={name} tone="light" className={`flex flex-col p-7 ${index === 1 ? 'border-redesign-gold shadow-redesign-cta-glow' : ''}`}><div className="flex items-center justify-between"><h3 className="font-serif text-2xl text-ink-900">{name}</h3>{index === 1 ? <span className="rounded-full bg-redesign-gold px-2.5 py-1 text-[10px] font-bold uppercase text-forest-deep">Popular</span> : null}</div><p className="mt-6 font-mono text-4xl text-ink-900">{price}</p><p className="mt-3 text-sm leading-relaxed text-ink-700">{description}.</p><Link href="/onboarding" className={cn(buttonVariants({ variant: index === 1 ? 'purchase' : 'primary' }), 'mt-7')}>Get started</Link></Card>)}</div></section>
}

function FAQSection() {
  return <section id="resources" className="border-t border-line-light bg-surface-2-light"><div className="mx-auto max-w-[900px] px-5 py-20 sm:px-8 lg:py-24"><Kicker>Questions</Kicker><h2 className="mt-4 font-serif text-4xl leading-tight text-ink-900 sm:text-5xl">Clear answers before you trust a career tool.</h2><div className="mt-10 divide-y divide-line-light rounded-radius-lg border border-line-light bg-surface-light px-6">{faq.map(([question, answer]) => <details key={question} className="group py-5"><summary className="cursor-pointer list-none pr-8 text-base font-bold text-ink-900">{question}<span className="float-right text-gold-text transition group-open:rotate-45">＋</span></summary><p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-700">{answer}</p></details>)}</div></div></section>
}

export default function Home() {
  return <div className="w-full overflow-x-clip bg-bg text-ink-900"><SiteNav /><main>
    <section className="relative overflow-hidden border-b border-line-dark bg-forest-deep text-ink-900-dark"><Image src={skyline} alt="Dubai skyline" fill priority className="absolute inset-0 object-cover opacity-20" /><div className="absolute inset-0 bg-gradient-to-r from-forest-deep via-forest-deep/95 to-forest-deep/65" /><div className="relative mx-auto grid max-w-[1280px] gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-12 lg:py-24"><div><Kicker dark>Built for GCC job seekers</Kicker><h1 className="mt-5 max-w-3xl font-serif text-5xl leading-[1.02] sm:text-6xl lg:text-7xl">Stop applying blindly. <span className="text-gold-text-dark">Know why your resume is not getting noticed.</span></h1><p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-900-dark/75 sm:text-xl">Upload your resume, add the job you want, and see your <strong className="text-ink-900-dark">GCC Readiness, ATS Score and Job Match</strong> before you spend another application.</p><div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link href="/ats-scan" className={buttonVariants({ variant: 'purchase' })}>Check my GCC readiness — free</Link><Link href="/onboarding" className="inline-flex min-h-11 items-center justify-center rounded-radius-md border border-ink-900-dark/25 px-6 py-3 text-sm font-bold text-ink-900-dark transition hover:border-redesign-gold-dark/60">Build my Career Profile</Link></div><p className="mt-4 text-xs text-ink-900-dark/50">No login required for the first scan · PDF / Word supported · Start free</p><div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-xs font-semibold text-ink-900-dark/55"><span>Saudi Arabia</span><span>UAE</span><span>Qatar</span><span>Kuwait</span><span>Oman</span><span>Bahrain</span></div></div><ResumeVisual /></div></section>
    <PainSection />
    <HowItWorks />
    <ScoringSection />
    <ServicesSection />
    <OptimizationSection />
    <ApplicationSection />
    <CountriesSection />
    <TrustSection />
    <PricingSection />
    <FAQSection />
    <section id="coming-soon" className="border-t border-line-dark bg-forest-deep text-center text-ink-900-dark"><div className="mx-auto max-w-[900px] px-5 py-20 sm:px-8 lg:py-24"><Kicker dark>What is next</Kicker><h2 className="mt-4 font-serif text-4xl leading-tight sm:text-5xl">Interview preparation is coming.</h2><p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-ink-900-dark/70">Mock interviews, role-specific Q&A and evaluation are planned. We will not label them live until they are ready.</p><Link href="/ats-scan" className={buttonVariants({ variant: 'purchase' })}>Start with the tools that are live</Link></div></section>
  </main><footer className="border-t border-line-light bg-surface-2-light"><div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-5 py-10 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-12"><div><div className="flex items-center gap-2.5"><span className="font-serif flex h-8 w-8 items-center justify-center rounded-radius-lg bg-forest-deep text-lg text-gold-text-dark">G</span><span className="font-bold text-ink-900">GCC MENTOR</span></div><p className="mt-2 text-xs text-ink-400">Built for Gulf professionals who want a better-fit opportunity.</p></div><div className="flex flex-wrap gap-4 text-sm font-semibold text-ink-700"><Link href="/login">Log in</Link><Link href="/onboarding">Get started</Link><Link href="/ats-scan">Free CV scan</Link><a href="#pricing">Pricing</a><a href="#resources">FAQ</a></div></div></footer></div>
}
