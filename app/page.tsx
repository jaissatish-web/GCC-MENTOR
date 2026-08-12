import Image from 'next/image'
import Link from 'next/link'
import { cn, GULF_COUNTRIES } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { LockedTile } from '@/components/ui/LockedTile'
import { SiteNav } from '@/components/marketing/SiteNav'

const photos = {
  worker: 'https://images.unsplash.com/photo-1672748341520-6a839e6c05bb?auto=format&fit=crop&w=800&q=80',
  skyline: 'https://images.unsplash.com/photo-1652707228067-25672fa0b082?auto=format&fit=crop&w=1600&q=80',
  blueprint: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=800&q=80',
}

const liveServices = [
  ['Resume Builder', 'Build your Career Profile once — upload, paste, or start from scratch.', '/onboarding'],
  ['Resume Optimizer', 'Reframe your CV for one target Gulf role using only your facts.', '/onboarding'],
  ['Resume Library', 'Keep every application version and its status in one place.', '/dashboard/library'],
  ['Career Profile', 'Your real experience, skills and certifications, ready to reuse.', '/profile'],
] as const

const comingSoon = [
  ['Mock Interview', 'Practice technical, HR and communication answers with guided AI feedback.'],
  ['Question Paper Generator', 'Prepare role-specific technical questions before you walk in.'],
  ['Gulf Career Guidance', 'Understand country, role and hiring expectations in one place.'],
  ['AI Career Assistant', 'Ask a career question and receive grounded guidance.'],
] as const

const faq = [
  ['Will GCC MENTOR invent anything on my CV?', 'No. The optimizer uses only facts in your Career Profile. It improves framing, never your history.'],
  ['Which Gulf countries are supported?', 'Resume building and optimization currently support Saudi Arabia, UAE, Qatar, Oman, Kuwait and Bahrain.'],
  ['Are all tools available today?', 'No. Live tools are clearly marked. Interview preparation, guidance and the assistant are previews until built.'],
  ['Can I see changes before paying?', 'Yes. The current flow shows the changes before payment so you can review what was generated.'],
]

const failurePatterns = [
  ['01', 'More applications, no response', 'Volume cannot fix a CV that is not landing clearly.'],
  ['02', 'Western CV used for a Gulf role', 'The format and context do not match what the market expects.'],
  ['03', 'One generic resume everywhere', 'A single version misses the role, country and employer signal.'],
  ['04', 'Weak JD alignment', 'Good experience gets buried when the relevant language is missing.'],
  ['05', 'Interview preparation starts too late', 'A polished CV is only one part of being ready.'],
  ['06', 'No structured feedback', 'Without a clear review loop, the same gaps repeat.'],
] as const

const ecosystemSteps = [
  ['Career Profile', 'Your grounded facts', true],
  ['Job Matching', 'Find the right target', true],
  ['Resume Optimization', 'Reframe your application', true],
  ['Cover Letter', 'Connect your story', true],
  ['Q&A Prep', 'Prepare your answers', false],
  ['Mock Interview', 'Practice the conversation', false],
  ['Evaluation', 'See where to improve', false],
  ['Improvement', 'Build the next version', false],
] as const

const comparisonRows = [
  ['Starting point', 'Generic advice', 'Your real career profile'],
  ['Format', 'Western templates', 'Gulf-focused presentation'],
  ['Relevance', 'One resume for every role', 'Job-specific framing'],
  ['Safety', 'May embellish claims', 'Nothing invented — ever'],
  ['Direction', 'Output without context', 'A connected preparation journey'],
] as const

const showcasePanels = [
  ['Gulf Readiness Score', '75%', 'Complete your contact, target and career details'],
  ['Target Role', 'I&C Commissioning Engineer', 'Saudi Arabia · Target company'],
  ['Job Match', 'Preview', 'Role-specific alignment is coming soon'],
  ['Resume status', 'Ready to review', 'Before and after lines remain in your control'],
  ['Interview Readiness', 'Coming soon', 'Practice and evaluation will follow'],
] as const

function Kicker({ children, onDark = false }: { children: React.ReactNode; onDark?: boolean }) {
  return (
    <p className={cn('text-[11px] font-bold uppercase tracking-[0.2em]', onDark ? 'text-gold-text-dark' : 'text-gold-text')}>
      {children}
    </p>
  )
}

function LiveBadge({ onDark = false }: { onDark?: boolean }) {
  return (
    <span
      className={cn(
        'rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider',
        onDark ? 'border-forest-dark/40 bg-forest-tint-dark text-forest-dark' : 'border-forest/40 bg-forest-tint text-forest'
      )}
    >
      Live
    </span>
  )
}

function SoonBadge({ onDark = false }: { onDark?: boolean }) {
  return (
    <span
      className={cn(
        'rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider',
        onDark ? 'border-redesign-gold-dark/40 bg-redesign-gold-tint-dark text-gold-text-dark' : 'border-redesign-gold/40 bg-redesign-gold-tint text-gold-text'
      )}
    >
      Coming Soon
    </span>
  )
}

function FailureSection() {
  return (
    <section id="problem" className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
      <div className="max-w-3xl">
        <Kicker>The problem</Kicker>
        <h2 className="mt-4 font-serif text-4xl leading-tight text-ink-900 sm:text-5xl">Applying more isn&apos;t always the answer.</h2>
        <p className="mt-5 text-lg leading-relaxed text-ink-700">When the preparation is disconnected, more applications often create more noise — not more opportunity.</p>
      </div>
      <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {failurePatterns.map(([number, title, description]) => (
          <Card key={number} tone="light" className="flex gap-4 p-5">
            <span className="font-mono text-xs text-terra">{number}</span>
            <div><h3 className="font-serif text-xl text-ink-900">{title}</h3><p className="mt-2 text-sm leading-relaxed text-ink-700">{description}</p></div>
          </Card>
        ))}
      </div>
    </section>
  )
}

function EcosystemSection() {
  return (
    <section id="ecosystem" className="border-y border-line-dark bg-forest-deep text-ink-900-dark">
      <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
        <div className="max-w-3xl"><Kicker onDark>One connected system</Kicker><h2 className="mt-4 font-serif text-4xl leading-tight sm:text-5xl">One Career Profile. Multiple ways to prepare.</h2><p className="mt-5 text-lg leading-relaxed text-ink-900-dark/70">Your facts should not be re-entered for every step. Start with one grounded profile, then add preparation as each tool becomes available.</p></div>
        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ecosystemSteps.map(([title, description, live], index) => (
            <div key={title} className="relative rounded-radius-lg border border-ink-900-dark/20 bg-ink-900-dark/10 p-5">
              <div className="flex items-start justify-between gap-2"><span className="font-mono text-xs text-redesign-gold-dark">{String(index + 1).padStart(2, '0')}</span>{live ? <LiveBadge onDark /> : <SoonBadge onDark />}</div>
              <h3 className="mt-7 font-serif text-xl text-ink-900-dark">{title}</h3><p className="mt-2 text-sm text-ink-900-dark/65">{description}</p>
              {index < ecosystemSteps.length - 1 ? <span aria-hidden className="absolute -right-3 top-1/2 z-10 hidden text-gold-text-dark lg:block">→</span> : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function ShowcaseSection() {
  return (
    <section id="showcase" className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
      <div className="max-w-3xl"><Kicker>Inside GCC MENTOR</Kicker><h2 className="mt-4 font-serif text-4xl leading-tight text-ink-900 sm:text-5xl">See the concepts before you use them.</h2><p className="mt-5 text-lg leading-relaxed text-ink-700">A visual preview should clarify the journey, not pretend a future feature is live.</p></div>
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {showcasePanels.map(([title, value, description], index) => (
          <Card key={title} tone="light" className="p-5">
            <span className="text-xs font-bold uppercase tracking-wider text-gold-text">{index === 0 || index === 1 || index === 3 ? 'Live concept' : 'Preview'}</span>
            <h3 className="mt-5 font-serif text-xl text-ink-900">{title}</h3>
            <p className="mt-3 text-lg font-bold text-forest">{value}</p>
            <p className="mt-2 text-sm leading-relaxed text-ink-700">{description}</p>
          </Card>
        ))}
      </div>
    </section>
  )
}

function ComparisonSection() {
  return (
    <section id="comparison" className="border-y border-line-light bg-surface-2-light">
      <div className="mx-auto max-w-[1100px] px-5 py-20 sm:px-8 lg:py-24"><div className="max-w-3xl"><Kicker>The difference</Kicker><h2 className="mt-4 font-serif text-4xl leading-tight text-ink-900 sm:text-5xl">Generic AI tools vs. GCC MENTOR.</h2><p className="mt-5 text-lg text-ink-700">The distinction is grounded in what you need to prepare for a Gulf opportunity.</p></div>
        <div className="mt-10 overflow-x-auto rounded-radius-lg border border-line-light bg-surface-light"><table className="w-full min-w-[680px] border-collapse text-left"><thead><tr className="border-b border-line-light"><th className="p-5 text-xs uppercase tracking-wider text-ink-400">Area</th><th className="p-5 text-sm font-bold text-ink-400">Generic AI tools</th><th className="bg-redesign-gold-tint p-5 text-sm font-bold text-ink-900">GCC MENTOR</th></tr></thead><tbody>{comparisonRows.map(([area, generic, gcc]) => <tr key={area} className="border-b border-line-light last:border-0"><th className="p-5 text-sm font-bold text-ink-900">{area}</th><td className="p-5 text-sm text-ink-700">{generic}</td><td className="bg-redesign-gold-tint/60 p-5 text-sm font-semibold text-forest">{gcc}</td></tr>)}</tbody></table></div>
      </div>
    </section>
  )
}

function InterviewDemoSection() {
  return (
    <section id="interview-demo" className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28"><div className="flex flex-wrap items-end justify-between gap-5"><div className="max-w-3xl"><Kicker>Interview preparation</Kicker><h2 className="mt-4 font-serif text-4xl leading-tight text-ink-900 sm:text-5xl">Practice before the real conversation.</h2><p className="mt-5 text-lg text-ink-700">A visual preview of the guided mock interview experience planned for GCC MENTOR.</p></div><SoonBadge /></div>
      <div className="mt-10 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]"><div className="rounded-radius-lg border border-line-dark bg-forest-deep p-6 text-ink-900-dark sm:p-8"><div className="flex items-center gap-3"><span className="rounded-full bg-redesign-gold px-3 py-2 text-xs font-bold text-forest-deep">DEMO</span><span className="text-xs uppercase tracking-wider text-ink-900-dark/50">Mock Interview preview</span></div><div className="mt-8 rounded-radius-lg bg-surface-2-dark p-5"><p className="text-xs font-bold uppercase tracking-wider text-gold-text-dark">Question</p><p className="mt-3 font-serif text-2xl text-ink-900-dark">Tell me about your commissioning experience.</p></div><div className="mt-4 rounded-radius-lg border border-ink-900-dark/20 p-5 text-sm text-ink-900-dark/55">Your spoken or typed answer will appear here.</div></div><div className="grid grid-cols-2 gap-3">{['Technical', 'Communication', 'Relevance', 'Confidence'].map(label => <Card key={label} tone="light" className="p-5"><span className="text-xs font-bold uppercase tracking-wider text-ink-400">{label}</span><div className="mt-7 h-2 rounded-full bg-surface-2-light"><div className="h-2 w-2/3 rounded-full bg-redesign-gold" /></div><p className="mt-3 text-xs text-ink-400">Preview score</p></Card>)}<Card tone="light" className="col-span-2 border-dashed p-5"><h3 className="font-serif text-xl text-ink-900">Strengths and areas to improve</h3><p className="mt-2 text-sm text-ink-700">Evaluation feedback will be generated when this feature is built.</p></Card></div></div>
    </section>
  )
}

function TestimonialsSection() {
  const placeholders = ['Your story could go here.', 'A verified professional experience will appear here.', 'Real outcomes, shared with permission.']
  return (
    <section id="testimonials" className="border-y border-line-light bg-surface-2-light"><div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 lg:px-12 lg:py-24"><div className="max-w-3xl"><Kicker>Real voices, when earned</Kicker><h2 className="mt-4 font-serif text-4xl leading-tight text-ink-900 sm:text-5xl">No invented testimonials.</h2><p className="mt-5 text-lg text-ink-700">This space is ready for verified stories from Gulf professionals. We will add them when real users choose to share them.</p></div><div className="mt-10 grid gap-4 md:grid-cols-3">{placeholders.map(text => <div key={text} className="min-h-[170px] rounded-radius-lg border border-dashed border-line-light-strong bg-surface-light p-6"><span className="text-2xl text-gold-text">“</span><p className="mt-4 text-sm leading-relaxed text-ink-400">{text}</p><div className="mt-6 h-2 w-24 rounded-full bg-surface-2-light" /><div className="mt-2 h-2 w-16 rounded-full bg-surface-2-light" /></div>)}</div></div></section>
  )
}

export default function Home() {
  return (
    <div className="w-full overflow-x-clip bg-bg text-ink-900">
      <SiteNav />
      <main>
        <section className="relative overflow-hidden border-b border-line-dark bg-forest-deep"><div className="mx-auto grid max-w-[1280px] items-center gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1fr_0.9fr] lg:px-12 lg:py-28"><div className="relative z-10 flex flex-col gap-6"><Kicker onDark>Built for the Gulf career journey</Kicker><h1 className="max-w-[11ch] font-serif text-5xl leading-[0.98] tracking-tight text-ink-900-dark sm:text-7xl">Your experience. <span className="text-forest-dark">Your next Gulf opportunity.</span></h1><p className="max-w-[55ch] text-[17px] leading-relaxed text-ink-900-dark/70 sm:text-lg">GCC MENTOR helps professionals build a stronger CV, prepare for the next step and make better-informed career decisions across the Gulf.</p><div className="flex flex-col gap-3 sm:flex-row"><Link href="/onboarding" className={cn(buttonVariants({ variant: 'purchase' }))}>Build your Career Profile</Link><a href="#platform" className={cn(buttonVariants({ variant: 'ghost' }))}>Explore the platform</a></div><div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-line-dark pt-5 text-[12px] font-semibold text-ink-900-dark/60"><span>✓ Nothing invented</span><span>✓ Gulf-focused</span><span>✓ You stay in control</span></div></div><div className="relative min-h-[380px] overflow-hidden rounded-radius-xl border border-line-dark-strong p-5 shadow-redesign-lg sm:min-h-[470px]"><Image src={photos.skyline} alt="City skyline at night." fill priority className="object-cover opacity-35" /><div className="absolute inset-0 bg-gradient-to-t from-forest-deep via-forest-deep/65 to-transparent" /><div className="relative flex h-full flex-col justify-end gap-4 text-ink-900-dark"><span className="w-fit rounded-full bg-redesign-gold px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-forest-deep">One profile → many possibilities</span><h2 className="max-w-[10ch] font-serif text-4xl leading-tight">Prepare with clarity. Apply with confidence.</h2><div className="rounded-radius-lg border border-ink-900-dark/20 bg-ink-900-dark/10 p-4 text-sm text-ink-900-dark/80 backdrop-blur-sm">Career Profile <span className="float-right text-forest-dark">75% ready</span><div className="mt-3 h-2 rounded-full bg-ink-900-dark/20"><div className="h-2 w-3/4 rounded-full bg-redesign-gold" /></div></div></div></div></div></section>
        <section id="platform" className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28"><div className="max-w-2xl"><Kicker>The platform</Kicker><h2 className="mt-4 font-serif text-4xl leading-tight text-ink-900 sm:text-5xl">Everything you need to move forward in the Gulf.</h2><p className="mt-5 text-lg leading-relaxed text-ink-700">Start with the tools that are live today. See what is coming next without confusing a preview for a promise.</p></div><div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{liveServices.map(([title, desc, href]) => <Link href={href} key={title} className="group"><Card tone="light" className="flex min-h-[250px] flex-col gap-4 p-6 transition hover:-translate-y-1 hover:border-redesign-gold"><LiveBadge /><h3 className="font-serif text-2xl text-ink-900">{title}</h3><p className="text-sm leading-relaxed text-ink-700">{desc}</p><span className="mt-auto text-sm font-bold text-forest group-hover:text-gold-text">Open →</span></Card></Link>)}</div><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{comingSoon.map(([title, desc]) => <div key={title} id={title === 'Mock Interview' ? 'mock-interview' : title === 'Question Paper Generator' ? 'question-papers' : title === 'Gulf Career Guidance' ? 'gulf-guidance' : 'ai-assistant'} className="flex"><LockedTile title={title} description={desc} note={`${title} — planned for a future release.`} className="h-full w-full min-h-[220px]" /></div>)}</div></section>
        <section id="ats-scan" className="border-y border-line-light bg-surface-2-light"><div className="mx-auto flex max-w-[1280px] flex-col items-start gap-6 px-5 py-16 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-12"><div className="max-w-2xl"><Kicker>Free tool</Kicker><h2 className="mt-3 font-serif text-3xl text-ink-900 sm:text-4xl">See how Gulf-ready your CV is.</h2><p className="mt-3 text-ink-700">Get a free ATS and Gulf-readiness scan before you build your full Career Profile.</p></div><Link href="/ats-scan" className={cn(buttonVariants({ variant: 'primary' }))}>Scan my CV for free →</Link></div></section>
        <section id="how-it-works" className="border-y border-line-light bg-surface-2-light"><div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 lg:px-12 lg:py-24"><div className="max-w-2xl"><Kicker>How it works</Kicker><h2 className="mt-4 font-serif text-4xl text-ink-900 sm:text-5xl">One clear path from experience to application.</h2></div><div className="mt-12 grid gap-8 md:grid-cols-4">{[['01','Capture','Upload, paste or build your Career Profile.'],['02','Clarify','Choose your Gulf country, target role and company.'],['03','Prepare','Review the changes and strengthen your application.'],['04','Apply','Download, save and reuse your profile for the next target.']].map(([n,t,d]) => <div key={n} className="flex flex-col gap-3"><span className="font-mono text-sm text-gold-text">{n}</span><h3 className="font-serif text-2xl text-ink-900">{t}</h3><p className="text-sm leading-relaxed text-ink-700">{d}</p></div>)}</div></div></section>
        <FailureSection />
        <EcosystemSection />
        <ShowcaseSection />
        <ComparisonSection />
        <InterviewDemoSection />
        <TestimonialsSection />
        <section id="professionals" className="mx-auto grid max-w-[1280px] gap-12 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:px-12 lg:py-28"><div className="relative min-h-[360px] overflow-hidden rounded-radius-xl"><Image src={photos.worker} alt="Industrial worker wearing a hard hat." fill className="object-cover" /><div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-forest-deep/85 to-transparent p-7 pt-24 text-ink-900-dark"><p className="font-serif text-2xl">Your work deserves to be understood.</p></div></div><div className="flex flex-col justify-center gap-5"><Kicker>For professionals</Kicker><h2 className="font-serif text-4xl leading-tight text-ink-900 sm:text-5xl">Your facts stay fixed. Your story gets clearer.</h2><p className="text-lg leading-relaxed text-ink-700">A Gulf application is more than a list of duties. GCC MENTOR helps you present your real experience in a way that is relevant, readable and ready for the role you want.</p><div className="grid gap-3 sm:grid-cols-2">{['Experience stays yours','No invented numbers','Country-aware formatting','Edit every generated line'].map(x => <Card key={x} tone="light" className="p-4 text-sm font-bold text-ink-900">✓ {x}</Card>)}</div></div></section>
        <section id="industries" className="border-y border-line-dark bg-forest-deep text-ink-900-dark"><div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 lg:px-12 lg:py-24"><Kicker onDark>Industries</Kicker><h2 className="mt-4 max-w-2xl font-serif text-4xl leading-tight sm:text-5xl">Built around the careers that move the Gulf.</h2><p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-900-dark/70">Engineering, construction, technical operations, healthcare, IT and management — start with your real background and target the next role.</p><div className="mt-10 flex flex-wrap gap-3">{['Engineering & commissioning','Construction & site operations','Healthcare','IT & technology','Quality & safety','Project & people management'].map(x => <span key={x} className="rounded-full border border-ink-900-dark/20 bg-ink-900-dark/10 px-4 py-3 text-sm font-semibold">{x}</span>)}</div></div></section>
        <section className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28"><div className="grid gap-12 lg:grid-cols-2"><div><Kicker>Gulf visual identity</Kicker><h2 className="mt-4 font-serif text-4xl leading-tight text-ink-900 sm:text-5xl">One profile. A target for every Gulf country.</h2><p className="mt-5 text-lg leading-relaxed text-ink-700">Choose a target and build from the same trusted career history. Country guides are coming soon; CV support is live today.</p><div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">{GULF_COUNTRIES.slice(0,6).map(c => <Link href="/onboarding" key={c.value} className="group"><Card tone="light" className="p-4 text-sm font-bold text-ink-900 transition hover:border-redesign-gold">{c.label} <span className="block pt-1 text-xs font-medium text-forest">CV support live</span></Card></Link>)}</div></div><div className="relative min-h-[360px] overflow-hidden rounded-radius-xl"><Image src={photos.blueprint} alt="Hands drafting on a blueprint with pencil and ruler." fill className="object-cover" /></div></div></section>
        <section className="border-y border-line-light bg-surface-2-light"><div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 lg:px-12"><Kicker>What changes — and what never does</Kicker><div className="mt-8 grid gap-4 md:grid-cols-3">{[['Reframed','Summary and experience bullets are rewritten for relevance.'],['Reordered','Skills move by relevance; their facts do not change.'],['Never touched','Employers, titles, dates, education and certifications stay grounded.']].map(([t,d]) => <Card key={t} tone="light" className="p-6"><h3 className="font-serif text-2xl text-forest">{t}</h3><p className="mt-3 text-sm leading-relaxed text-ink-700">{d}</p></Card>)}</div></div></section>
        <section id="pricing" className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28"><div className="max-w-2xl"><Kicker>Simple, transparent pricing</Kicker><h2 className="mt-4 font-serif text-4xl leading-tight text-ink-900 sm:text-5xl">Choose the level of support you need.</h2><p className="mt-5 text-lg text-ink-700">These are the planned GCC MENTOR packages. Current checkout remains the existing single resume flow while tier support is being built.</p></div><div className="mt-12 grid gap-5 lg:grid-cols-3">{[['Essential','₹399','Start with a stronger CV','One optimized target resume'],['Professional','₹1,499','Prepare more completely','Resume optimization plus preparation tools'],['Mentor','₹2,499','Build an ongoing career system','Full platform access as features arrive']].map(([name,price,tag,desc], i) => <Card key={name} tone="light" className={`flex flex-col gap-5 p-7 ${i===1 ? 'border-redesign-gold shadow-redesign-cta-glow' : 'border-line-light'}`}><div className="flex items-center justify-between"><h3 className="font-serif text-2xl text-ink-900">{name}</h3>{i===1 ? <span className="rounded-full bg-redesign-gold px-2.5 py-1 text-[10px] font-bold uppercase text-forest-deep">Popular</span> : null}</div><p className="text-sm font-semibold text-forest">{tag}</p><p className="font-mono text-4xl text-ink-900">{price}</p><p className="text-sm leading-relaxed text-ink-700">{desc}. Exact features will be shown before purchase.</p><Link href="/onboarding" className={cn(buttonVariants({ variant: i === 1 ? 'purchase' : 'primary' }), 'mt-auto')}>Get Started</Link></Card>)}</div></section>
        <section id="resources" className="border-y border-line-dark bg-forest-deep text-ink-900-dark"><div className="mx-auto max-w-[900px] px-5 py-20 text-center sm:px-8 lg:py-24"><Kicker onDark>Start with what you have</Kicker><h2 className="mt-4 font-serif text-4xl leading-tight sm:text-5xl">Your next move starts with your real experience.</h2><p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-ink-900-dark/70">No perfect CV required. No inflated claims. Just a clearer path to prepare, apply and grow.</p><Link href="/onboarding" className={cn(buttonVariants({ variant: 'purchase' }), 'mt-8')}>Build your Career Profile</Link></div></section>
        <section className="mx-auto max-w-[900px] px-5 py-20 sm:px-8 lg:py-24"><Kicker>Questions</Kicker><h2 className="mt-4 font-serif text-4xl text-ink-900">Good questions deserve clear answers.</h2><div className="mt-8 divide-y divide-line-light rounded-radius-lg border border-line-light bg-surface-light px-6">{faq.map(([q,a]) => <details key={q} className="group py-5"><summary className="cursor-pointer list-none pr-8 text-base font-bold text-ink-900 marker:hidden">{q}<span className="float-right text-gold-text group-open:rotate-45">＋</span></summary><p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-700">{a}</p></details>)}</div></section>
      </main>
      <footer className="border-t border-line-light bg-surface-2-light"><div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-5 py-10 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-12"><div className="flex items-center gap-2.5"><span className="font-serif flex h-8 w-8 items-center justify-center rounded-radius-lg bg-forest-deep text-lg text-gold-text-dark">G</span><span className="font-bold text-ink-900">GCC MENTOR</span></div><p className="text-sm text-ink-400">Built for Gulf professionals · Privacy · Terms · Refunds</p><Link href="/login" className="text-sm font-bold text-forest">Log in</Link></div></footer>
    </div>
  )
}
