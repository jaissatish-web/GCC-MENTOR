import Image from 'next/image'
import Link from 'next/link'
import { SiteNav } from '@/components/marketing/SiteNav'
import { GULF_COUNTRIES } from '@/lib/utils'

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
  ['Job Matching', 'Find the right target', false],
  ['Resume Optimization', 'Reframe your application', true],
  ['Cover Letter', 'Connect your story', false],
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

function Kicker({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold">{children}</p>
}

function SoonBadge() {
  return <span className="rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-state-gold-text">Coming Soon</span>
}

function LiveBadge() {
  return <span className="rounded-full border border-state-emerald-line bg-state-emerald-bg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald">Live</span>
}

function FailureSection() {
  return (
    <section id="problem" className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
      <div className="max-w-3xl">
        <Kicker>The problem</Kicker>
        <h2 className="mt-4 font-serif text-4xl leading-tight sm:text-5xl">Applying more isn&apos;t always the answer.</h2>
        <p className="mt-5 text-lg leading-relaxed text-ink-body">When the preparation is disconnected, more applications often create more noise — not more opportunity.</p>
      </div>
      <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {failurePatterns.map(([number, title, description]) => (
          <div key={number} className="flex gap-4 rounded-2xl border border-line bg-white p-5">
            <span className="font-mono text-xs text-terracotta">{number}</span>
            <div><h3 className="font-serif text-xl">{title}</h3><p className="mt-2 text-sm leading-relaxed text-ink-body">{description}</p></div>
          </div>
        ))}
      </div>
    </section>
  )
}

function EcosystemSection() {
  return (
    <section id="ecosystem" className="border-y border-line bg-midnight text-marble">
      <div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
        <div className="max-w-3xl"><Kicker>One connected system</Kicker><h2 className="mt-4 font-serif text-4xl leading-tight sm:text-5xl">One Career Profile. Multiple ways to prepare.</h2><p className="mt-5 text-lg leading-relaxed text-marble/70">Your facts should not be re-entered for every step. Start with one grounded profile, then add preparation as each tool becomes available.</p></div>
        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ecosystemSteps.map(([title, description, live], index) => (
            <div key={title} className="relative rounded-2xl border border-marble/20 bg-marble/10 p-5">
              <div className="flex items-start justify-between gap-2"><span className="font-mono text-xs text-gold">{String(index + 1).padStart(2, '0')}</span>{live ? <LiveBadge /> : <SoonBadge />}</div>
              <h3 className="mt-7 font-serif text-xl">{title}</h3><p className="mt-2 text-sm text-marble/65">{description}</p>
              {index < ecosystemSteps.length - 1 ? <span aria-hidden className="absolute -right-3 top-1/2 z-10 hidden text-gold lg:block">→</span> : null}
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
      <div className="max-w-3xl"><Kicker>Inside GCC MENTOR</Kicker><h2 className="mt-4 font-serif text-4xl leading-tight sm:text-5xl">See the concepts before you use them.</h2><p className="mt-5 text-lg leading-relaxed text-ink-body">A visual preview should clarify the journey, not pretend a future feature is live.</p></div>
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {showcasePanels.map(([title, value, description], index) => (
          <div key={title} className="rounded-2xl border border-line bg-white p-5 shadow-elev-1"><span className="text-xs font-bold uppercase tracking-wider text-gold">{index === 0 || index === 1 || index === 3 ? 'Live concept' : 'Preview'}</span><h3 className="mt-5 font-serif text-xl">{title}</h3><p className="mt-3 text-lg font-bold text-emerald">{value}</p><p className="mt-2 text-sm leading-relaxed text-ink-body">{description}</p></div>
        ))}
      </div>
    </section>
  )
}

function ComparisonSection() {
  return (
    <section id="comparison" className="border-y border-line bg-sand/50">
      <div className="mx-auto max-w-[1100px] px-5 py-20 sm:px-8 lg:py-24"><div className="max-w-3xl"><Kicker>The difference</Kicker><h2 className="mt-4 font-serif text-4xl leading-tight sm:text-5xl">Generic AI tools vs. GCC MENTOR.</h2><p className="mt-5 text-lg text-ink-body">The distinction is grounded in what you need to prepare for a Gulf opportunity.</p></div>
        <div className="mt-10 overflow-x-auto rounded-2xl border border-line bg-white"><table className="w-full min-w-[680px] border-collapse text-left"><thead><tr className="border-b border-line"><th className="p-5 text-xs uppercase tracking-wider text-ink-muted">Area</th><th className="p-5 text-sm font-bold text-ink-muted">Generic AI tools</th><th className="bg-gold/10 p-5 text-sm font-bold text-midnight">GCC MENTOR</th></tr></thead><tbody>{comparisonRows.map(([area, generic, gcc]) => <tr key={area} className="border-b border-line last:border-0"><th className="p-5 text-sm font-bold">{area}</th><td className="p-5 text-sm text-ink-body">{generic}</td><td className="bg-gold/[0.06] p-5 text-sm font-semibold text-emerald">{gcc}</td></tr>)}</tbody></table></div>
      </div>
    </section>
  )
}

function InterviewDemoSection() {
  return (
    <section id="interview-demo" className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28"><div className="flex flex-wrap items-end justify-between gap-5"><div className="max-w-3xl"><Kicker>Interview preparation</Kicker><h2 className="mt-4 font-serif text-4xl leading-tight sm:text-5xl">Practice before the real conversation.</h2><p className="mt-5 text-lg text-ink-body">A visual preview of the guided mock interview experience planned for GCC MENTOR.</p></div><SoonBadge /></div>
      <div className="mt-10 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]"><div className="rounded-2xl border border-line bg-midnight p-6 text-marble sm:p-8"><div className="flex items-center gap-3"><span className="rounded-full bg-gold px-3 py-2 text-xs font-bold text-midnight">DEMO</span><span className="text-xs uppercase tracking-wider text-marble/50">Mock Interview preview</span></div><div className="mt-8 rounded-2xl bg-surface p-5"><p className="text-xs font-bold uppercase tracking-wider text-gold">Question</p><p className="mt-3 font-serif text-2xl">Tell me about your commissioning experience.</p></div><div className="mt-4 rounded-2xl border border-marble/20 p-5 text-sm text-marble/55">Your spoken or typed answer will appear here.</div></div><div className="grid grid-cols-2 gap-3">{['Technical', 'Communication', 'Relevance', 'Confidence'].map(label => <div key={label} className="rounded-2xl border border-line bg-white p-5"><span className="text-xs font-bold uppercase tracking-wider text-ink-muted">{label}</span><div className="mt-7 h-2 rounded-full bg-fill-subtle"><div className="h-2 w-2/3 rounded-full bg-gold" /></div><p className="mt-3 text-xs text-ink-warm">Preview score</p></div>)}<div className="col-span-2 rounded-2xl border border-dashed border-line-strong bg-fill-warm p-5"><h3 className="font-serif text-xl">Strengths and areas to improve</h3><p className="mt-2 text-sm text-ink-body">Evaluation feedback will be generated when this feature is built.</p></div></div></div>
    </section>
  )
}

function TestimonialsSection() {
  const placeholders = ['Your story could go here.', 'A verified professional experience will appear here.', 'Real outcomes, shared with permission.']
  return (
    <section id="testimonials" className="border-y border-line bg-sand/50"><div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 lg:px-12 lg:py-24"><div className="max-w-3xl"><Kicker>Real voices, when earned</Kicker><h2 className="mt-4 font-serif text-4xl leading-tight sm:text-5xl">No invented testimonials.</h2><p className="mt-5 text-lg text-ink-body">This space is ready for verified stories from Gulf professionals. We will add them when real users choose to share them.</p></div><div className="mt-10 grid gap-4 md:grid-cols-3">{placeholders.map(text => <div key={text} className="min-h-[170px] rounded-2xl border border-dashed border-line-strong bg-white p-6"><span className="text-2xl text-gold">“</span><p className="mt-4 text-sm leading-relaxed text-ink-muted">{text}</p><div className="mt-6 h-2 w-24 rounded-full bg-fill-subtle" /><div className="mt-2 h-2 w-16 rounded-full bg-fill-subtle" /></div>)}</div></div></section>
  )
}

export default function Home() {
  return (
    <div className="w-full overflow-x-clip bg-marble text-midnight">
      <SiteNav />
      <main>
        <section className="relative overflow-hidden border-b border-line bg-sand/40"><div className="mx-auto grid max-w-[1280px] items-center gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1fr_0.9fr] lg:px-12 lg:py-28"><div className="relative z-10 flex flex-col gap-6"><Kicker>Built for the Gulf career journey</Kicker><h1 className="max-w-[11ch] font-serif text-5xl leading-[0.98] tracking-tight sm:text-7xl">Your experience. <span className="text-emerald">Your next Gulf opportunity.</span></h1><p className="max-w-[55ch] text-[17px] leading-relaxed text-ink-body sm:text-lg">GCC MENTOR helps professionals build a stronger CV, prepare for the next step and make better-informed career decisions across the Gulf.</p><div className="flex flex-col gap-3 sm:flex-row"><Link href="/onboarding" className="inline-flex min-h-11 items-center justify-center rounded-lg bg-midnight px-7 py-3 text-sm font-bold text-marble hover:bg-deep-navy">Build your Career Profile</Link><a href="#platform" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-line-strong bg-white px-7 py-3 text-sm font-bold text-midnight hover:bg-fill-subtle">Explore the platform</a></div><div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-5 text-[12px] font-semibold text-ink-muted"><span>✓ Nothing invented</span><span>✓ Gulf-focused</span><span>✓ You stay in control</span></div></div><div className="relative min-h-[380px] overflow-hidden rounded-3xl border border-line-strong bg-midnight p-5 shadow-elev-2 sm:min-h-[470px]"><Image src={photos.skyline} alt="City skyline at night." fill priority className="object-cover opacity-35" /><div className="absolute inset-0 bg-gradient-to-t from-midnight via-midnight/65 to-transparent" /><div className="relative flex h-full flex-col justify-end gap-4 text-marble"><span className="w-fit rounded-full bg-gold px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-midnight">One profile → many possibilities</span><h2 className="max-w-[10ch] font-serif text-4xl leading-tight">Prepare with clarity. Apply with confidence.</h2><div className="rounded-xl border border-marble/20 bg-marble/10 p-4 text-sm text-marble/80 backdrop-blur-sm">Career Profile <span className="float-right text-emerald">75% ready</span><div className="mt-3 h-2 rounded-full bg-marble/20"><div className="h-2 w-3/4 rounded-full bg-gold" /></div></div></div></div></div></section>
        <section id="platform" className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28"><div className="max-w-2xl"><Kicker>The platform</Kicker><h2 className="mt-4 font-serif text-4xl leading-tight sm:text-5xl">Everything you need to move forward in the Gulf.</h2><p className="mt-5 text-lg leading-relaxed text-ink-body">Start with the tools that are live today. See what is coming next without confusing a preview for a promise.</p></div><div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{liveServices.map(([title, desc, href]) => <Link href={href} key={title} className="group flex min-h-[250px] flex-col gap-4 rounded-2xl border border-line bg-white p-6 shadow-elev-1 transition hover:-translate-y-1 hover:border-gold"><LiveBadge /><h3 className="font-serif text-2xl">{title}</h3><p className="text-sm leading-relaxed text-ink-body">{desc}</p><span className="mt-auto text-sm font-bold text-emerald group-hover:text-gold">Open →</span></Link>)}</div><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{comingSoon.map(([title, desc]) => <div id={title === 'Mock Interview' ? 'mock-interview' : title === 'Question Paper Generator' ? 'question-papers' : title === 'Gulf Career Guidance' ? 'gulf-guidance' : 'ai-assistant'} key={title} className="flex min-h-[220px] flex-col gap-4 rounded-2xl border border-dashed border-line-strong bg-fill-warm p-6"><SoonBadge /><h3 className="font-serif text-2xl">{title}</h3><p className="text-sm leading-relaxed text-ink-body">{desc}</p><span className="mt-auto text-xs font-bold uppercase tracking-wider text-ink-warm">Preview only</span></div>)}</div></section>
        <section id="ats-scan" className="border-y border-line bg-sand/50"><div className="mx-auto flex max-w-[1280px] flex-col items-start gap-6 px-5 py-16 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-12"><div className="max-w-2xl"><Kicker>Free tool</Kicker><h2 className="mt-3 font-serif text-3xl sm:text-4xl">See how Gulf-ready your CV is.</h2><p className="mt-3 text-ink-body">Get a free ATS and Gulf-readiness scan before you build your full Career Profile.</p></div><Link href="/ats-scan" className="inline-flex min-h-11 items-center rounded-lg bg-midnight px-6 py-3 text-sm font-bold text-marble hover:bg-deep-navy">Scan my CV for free →</Link></div></section>
        <section id="how-it-works" className="border-y border-line bg-sand/50"><div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 lg:px-12 lg:py-24"><div className="max-w-2xl"><Kicker>How it works</Kicker><h2 className="mt-4 font-serif text-4xl sm:text-5xl">One clear path from experience to application.</h2></div><div className="mt-12 grid gap-8 md:grid-cols-4">{[['01','Capture','Upload, paste or build your Career Profile.'],['02','Clarify','Choose your Gulf country, target role and company.'],['03','Prepare','Review the changes and strengthen your application.'],['04','Apply','Download, save and reuse your profile for the next target.']].map(([n,t,d]) => <div key={n} className="flex flex-col gap-3"><span className="font-mono text-sm text-gold">{n}</span><h3 className="font-serif text-2xl">{t}</h3><p className="text-sm leading-relaxed text-ink-body">{d}</p></div>)}</div></div></section>
        <FailureSection />
        <EcosystemSection />
        <ShowcaseSection />
        <ComparisonSection />
        <InterviewDemoSection />
        <TestimonialsSection />
        <section id="professionals" className="mx-auto grid max-w-[1280px] gap-12 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:px-12 lg:py-28"><div className="relative min-h-[360px] overflow-hidden rounded-3xl"><Image src={photos.worker} alt="Industrial worker wearing a hard hat." fill className="object-cover" /><div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-midnight/85 to-transparent p-7 pt-24 text-marble"><p className="font-serif text-2xl">Your work deserves to be understood.</p></div></div><div className="flex flex-col justify-center gap-5"><Kicker>For professionals</Kicker><h2 className="font-serif text-4xl leading-tight sm:text-5xl">Your facts stay fixed. Your story gets clearer.</h2><p className="text-lg leading-relaxed text-ink-body">A Gulf application is more than a list of duties. GCC MENTOR helps you present your real experience in a way that is relevant, readable and ready for the role you want.</p><div className="grid gap-3 sm:grid-cols-2">{['Experience stays yours','No invented numbers','Country-aware formatting','Edit every generated line'].map(x => <div key={x} className="rounded-xl border border-line bg-white p-4 text-sm font-bold">✓ {x}</div>)}</div></div></section>
        <section id="industries" className="border-y border-line bg-midnight text-marble"><div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 lg:px-12 lg:py-24"><Kicker>Industries</Kicker><h2 className="mt-4 max-w-2xl font-serif text-4xl leading-tight sm:text-5xl">Built around the careers that move the Gulf.</h2><p className="mt-5 max-w-2xl text-lg leading-relaxed text-marble/70">Engineering, construction, technical operations, healthcare, IT and management — start with your real background and target the next role.</p><div className="mt-10 flex flex-wrap gap-3">{['Engineering & commissioning','Construction & site operations','Healthcare','IT & technology','Quality & safety','Project & people management'].map(x => <span key={x} className="rounded-full border border-marble/20 bg-marble/10 px-4 py-3 text-sm font-semibold">{x}</span>)}</div></div></section>
        <section className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28"><div className="grid gap-12 lg:grid-cols-2"><div><Kicker>Gulf visual identity</Kicker><h2 className="mt-4 font-serif text-4xl leading-tight sm:text-5xl">One profile. A target for every Gulf country.</h2><p className="mt-5 text-lg leading-relaxed text-ink-body">Choose a target and build from the same trusted career history. Country guides are coming soon; CV support is live today.</p><div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">{GULF_COUNTRIES.slice(0,6).map(c => <Link href="/onboarding" key={c.value} className="rounded-xl border border-line bg-white p-4 text-sm font-bold hover:border-gold">{c.label} <span className="block pt-1 text-xs font-medium text-emerald">CV support live</span></Link>)}</div></div><div className="relative min-h-[360px] overflow-hidden rounded-3xl"><Image src={photos.blueprint} alt="Hands drafting on a blueprint with pencil and ruler." fill className="object-cover" /></div></div></section>
        <section className="border-y border-line bg-sand/50"><div className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 lg:px-12"><Kicker>What changes — and what never does</Kicker><div className="mt-8 grid gap-4 md:grid-cols-3">{[['Reframed','Summary and experience bullets are rewritten for relevance.'],['Reordered','Skills move by relevance; their facts do not change.'],['Never touched','Employers, titles, dates, education and certifications stay grounded.']].map(([t,d]) => <div key={t} className="rounded-2xl border border-line bg-white p-6"><h3 className="font-serif text-2xl text-emerald">{t}</h3><p className="mt-3 text-sm leading-relaxed text-ink-body">{d}</p></div>)}</div></div></section>
        <section id="pricing" className="mx-auto max-w-[1280px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28"><div className="max-w-2xl"><Kicker>Simple, transparent pricing</Kicker><h2 className="mt-4 font-serif text-4xl leading-tight sm:text-5xl">Choose the level of support you need.</h2><p className="mt-5 text-lg text-ink-body">These are the planned GCC MENTOR packages. Current checkout remains the existing single resume flow while tier support is being built.</p></div><div className="mt-12 grid gap-5 lg:grid-cols-3">{[['Essential','₹399','Start with a stronger CV','One optimized target resume'],['Professional','₹1,499','Prepare more completely','Resume optimization plus preparation tools'],['Mentor','₹2,499','Build an ongoing career system','Full platform access as features arrive']].map(([name,price,tag,desc], i) => <div key={name} className={`flex flex-col gap-5 rounded-2xl border p-7 ${i===1 ? 'border-gold bg-white shadow-glow-gold' : 'border-line bg-fill-warm'}`}><div className="flex items-center justify-between"><h3 className="font-serif text-2xl">{name}</h3>{i===1 ? <span className="rounded-full bg-gold px-2.5 py-1 text-[10px] font-bold uppercase text-midnight">Popular</span> : null}</div><p className="text-sm font-semibold text-emerald">{tag}</p><p className="font-mono text-4xl">{price}</p><p className="text-sm leading-relaxed text-ink-body">{desc}. Exact features will be shown before purchase.</p><Link href="/onboarding" className="mt-auto inline-flex min-h-11 items-center justify-center rounded-lg bg-midnight px-5 py-3 text-sm font-bold text-marble">Get Started</Link></div>)}</div></section>
        <section id="resources" className="border-y border-line bg-midnight text-marble"><div className="mx-auto max-w-[900px] px-5 py-20 text-center sm:px-8 lg:py-24"><Kicker>Start with what you have</Kicker><h2 className="mt-4 font-serif text-4xl leading-tight sm:text-5xl">Your next move starts with your real experience.</h2><p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-marble/70">No perfect CV required. No inflated claims. Just a clearer path to prepare, apply and grow.</p><Link href="/onboarding" className="mt-8 inline-flex min-h-11 items-center rounded-lg bg-gold px-7 py-3 text-sm font-bold text-midnight hover:bg-gold-light">Build your Career Profile</Link></div></section>
        <section className="mx-auto max-w-[900px] px-5 py-20 sm:px-8 lg:py-24"><Kicker>Questions</Kicker><h2 className="mt-4 font-serif text-4xl">Good questions deserve clear answers.</h2><div className="mt-8 divide-y divide-line rounded-2xl border border-line bg-white px-6">{faq.map(([q,a]) => <details key={q} className="group py-5"><summary className="cursor-pointer list-none pr-8 text-base font-bold marker:hidden">{q}<span className="float-right text-gold group-open:rotate-45">＋</span></summary><p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-body">{a}</p></details>)}</div></section>
      </main>
      <footer className="border-t border-line bg-sand"><div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-5 py-10 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-12"><div className="flex items-center gap-2.5"><span className="font-serif flex h-8 w-8 items-center justify-center rounded-lg bg-midnight text-gold-light">G</span><span className="font-bold text-midnight">GCC MENTOR</span></div><p className="text-sm text-ink-muted">Built for Gulf professionals · Privacy · Terms · Refunds</p><Link href="/login" className="text-sm font-bold text-emerald">Log in</Link></div></footer>
    </div>
  )
}
