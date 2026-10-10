import Image from 'next/image'
import Link from 'next/link'
import {
  ClipboardList,
  FileText,
  Globe2,
  Lock,
  Mail,
  MessagesSquare,
  ShieldCheck,
  Smartphone,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { NotLiveText } from '@/components/ui/NotLive'
import { LandingSectionMenu } from './LandingSectionMenu'
import s from './concept.module.css'
import { ArrowRight, BTN_GOLD, BTN_LINE, BTN_TEAL, Check, SectionHead, Wrap } from './primitives'

/* ── Navigation ───────────────────────────────────────────────────────── */

export const NAV = [
  ['Services', '#services'],
  ['How it works', '#journey'],
  ['Templates', '#templates'],
  ['Pricing', '#pricing'],
  ['FAQ', '#faq'],
] as const

function Mark() {
  return <span className="grid size-9 place-items-center rounded-ctl bg-teal text-[16px] font-bold text-white tracking-[-0.02em]">G</span>
}

export function LandingNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-canvas/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[64px] max-w-[1240px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-10">
        <Link href="/" className="flex shrink-0 items-center gap-2 rounded-ctl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2">
          <Mark />
          <span className="text-[15px] font-bold tracking-[-0.03em] text-ink max-[359px]:sr-only sm:text-[16px]">GCC MENTOR</span>
        </Link>

        <nav aria-label="Page sections" className="hidden items-center gap-0.5 xl:flex">
          {NAV.map(([label, href]) => (
            <a key={href} href={href} className="rounded-ctl px-3 py-2 type-helper font-semibold text-ink-soft transition-colors hover:bg-teal-soft hover:text-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal">
              {label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <Link href="/login" className="flex min-h-11 items-center rounded-ctl px-2.5 type-helper font-semibold text-teal hover:bg-teal-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal">
            Log in
          </Link>
          <Link href="/signup" className={cn(BTN_GOLD, 'hidden min-h-11 rounded-ctl px-4 type-helper sm:inline-flex')}>
            Start free
          </Link>
          <LandingSectionMenu anchors={NAV} />
        </div>
      </div>
    </header>
  )
}

/* ── Hero copy (the visual is HeroStack, a client component) ─────────── */

export function HeroCopy() {
  return (
    <div className="min-w-0">
      <p className="inline-flex max-w-full items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 type-caption font-semibold text-ink-soft shadow-m-1">
        <span className="size-2 shrink-0 rounded-full bg-ok" aria-hidden="true" />
        <span>Built on 15+ years of Gulf experience</span>
      </p>
      <h1 className="mt-4 type-hero text-ink lg:mt-6">
        Your next Gulf role.{' '}
        <em className="block not-italic text-teal">Start prepared.</em>
      </h1>
      <p className="mt-4 max-w-[60ch] type-lead text-ink-soft lg:mt-5">
        Tailor your CV, write your cover letter and practise interviews — all from your real experience.
      </p>
      <div className="mt-6 flex flex-col gap-2.5 sm:flex-row lg:mt-8">
        <Link href="/signup" className={BTN_GOLD}>
          Build my profile <ArrowRight />
        </Link>
        <a href="#journey" className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[14px] px-5 type-button text-teal hover:bg-teal-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal">
          How it works <ArrowRight />
        </a>
      </div>
      <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-2 type-helper font-medium text-ink-soft lg:mt-7" aria-label="Why people trust it">
        {['6 Gulf countries', 'You approve changes', 'Free to start'].map((t) => (
          <li key={t} className="flex items-center gap-1.5">
            <Check className="size-4 text-ok" /> {t}
          </li>
        ))}
      </ul>
    </div>
  )
}

/* A short product overview before the detailed demonstrations. */
const SERVICES = [
  { icon: Globe2, title: 'Gulf Readiness', body: 'See your readiness score and what to improve.', href: '/gulf-readiness-score', action: 'Check free', preview: 'Your Gulf score' },
  { icon: FileText, title: 'Your Gulf CV', body: 'Tailor your CV to a job. Choose from 50 templates.', href: '#templates', action: 'Explore templates', preview: 'CV + job description' },
  { icon: Mail, title: 'Cover Letters', body: 'Introduce your experience for each target job.', href: '#letters', action: 'See an example', preview: 'One letter per job' },
  { icon: MessagesSquare, title: 'Interview Practice', body: 'Prepare with Q&A, mock interviews and feedback.', href: '#interview', action: 'See how it works', preview: 'Practise → improve' },
] as const

export function ServicesPreview() {
  return (
    <section id="services" aria-labelledby="services-title" className="border-b border-line bg-white py-11 sm:py-16 lg:py-20">
      <Wrap>
        <SectionHead id="services-title" eyebrow="All in one place" title={<>Everything for <em>your next application.</em></>} />
        <div className="mt-7 grid grid-cols-2 gap-3 lg:mt-9 lg:grid-cols-4 lg:gap-4">
          {SERVICES.map(({ icon: Icon, title, body, href, action, preview }) => (
            <a key={title} href={href} className="group flex min-w-0 flex-col rounded-card border border-line bg-canvas p-4 transition-colors sm:p-5 hover:border-teal/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal">
              <div className="flex flex-col items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-teal-soft text-teal"><Icon aria-hidden="true" className="size-5" /></span>
                <h3 className="type-card text-ink">{title}</h3>
              </div>
              <p className="mt-3 type-helper text-ink-soft">{body}</p>
              <span className="mt-4 hidden rounded-ctl border border-line bg-white px-3 py-2 type-caption text-teal sm:block">{preview}</span>
              <span className="mt-auto flex items-center gap-2 pt-5 type-label text-teal">{action}<ArrowRight /></span>
            </a>
          ))}
        </div>
      </Wrap>
    </section>
  )
}

export function JourneyOverview() {
  const steps = [
    { icon: Users, title: 'Build your profile', body: 'Upload your CV and review your experience.' },
    { icon: FileText, title: 'Prepare your application', body: 'Add a job description. Tailor your CV and letter.' },
    { icon: MessagesSquare, title: 'Practise your interview', body: 'Prepare answers and get feedback.' },
  ] as const
  return (
    <ol className="mt-7 grid gap-3 sm:grid-cols-3 lg:mt-9 lg:gap-5" aria-label="Three preparation steps">
      {steps.map(({ icon: Icon, title, body }, i) => (
        <li key={title} className="relative flex gap-4 rounded-card border border-line bg-canvas p-5 sm:flex-col">
          <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-teal text-white"><Icon className="size-5" /></span>
          <div><span className="type-caption text-teal">Step {i + 1}</span><h3 className="mt-1 type-card text-ink">{title}</h3><p className="mt-2 type-helper text-ink-soft">{body}</p></div>
        </li>
      ))}
    </ol>
  )
}

/* ── Proof strip: only true, structural facts. No user counts, no reviews. ── */

const PROOF = [
  { icon: Users, big: 'Built by a Gulf insider', small: '15 yrs EPC & PMC' },
  { icon: Globe2, big: '6 GCC markets', small: 'Saudi to Bahrain' },
  { icon: ClipboardList, big: 'ATS-ready', small: 'CV + cover letter per job' },
  { icon: ShieldCheck, big: 'From your real experience', small: 'you approve changes' },
  { icon: Smartphone, big: 'Mobile-first', small: 'every step on your phone' },
] as const

export function ProofStrip() {
  return (
    <section aria-label="What GCC Mentor is built on" className="border-y border-line bg-white">
      <Wrap>
        <ul className="-mx-4 flex snap-x gap-6 overflow-x-auto px-4 py-4 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 sm:py-5 lg:grid-cols-5 [&::-webkit-scrollbar]:hidden">
          {PROOF.map(({ icon: Icon, big, small }, i) => (
            <li key={small} className={cn('flex shrink-0 snap-start items-center gap-2.5', i > 2 && 'sm:max-lg:hidden')}>
              <Icon className="size-5 shrink-0 text-teal" aria-hidden="true" />
              <span className="type-caption leading-tight text-ink-muted">
                <b className="block type-helper font-bold text-ink">{big}</b>
                {small}
              </span>
            </li>
          ))}
        </ul>
      </Wrap>
    </section>
  )
}

/* ── Who it's for: people and professions, not one job title ─────────── */

const AUDIENCE = [
  ['Already in the Gulf', 'Aiming for a better role or a higher package.', '/landing/who-already-in-gulf.jpg', 'A professional in safety gear on a Gulf site'],
  ['Moving to the Gulf', 'From India or anywhere — presented the Gulf way.', '/landing/who-moving-to-gulf.jpg', 'A modern airport terminal hall'],
  ['Returning to the Gulf', 'Your earlier GCC experience, back in front.', '/landing/who-returning.jpg', 'An airport departures board'],
  ['Any profession', 'Nursing, finance, IT, HR, construction and more.', '/landing/who-any-profession.jpg', 'A nurse at work in a hospital'],
] as const

const FIELDS = [
  'Engineering', 'Construction', 'Oil & Gas', 'Healthcare & Nursing', 'Finance & Accounting', 'IT & Software',
  'HR & Admin', 'Sales & Marketing', 'Hospitality', 'Logistics', 'Education', 'Operations',
]

export function WhoItsFor() {
  return (
    <section id="who" aria-labelledby="who-title" className="py-11 sm:py-16 lg:py-[104px]">
      <Wrap>
        <SectionHead
          id="who-title"
          eyebrow="Who it’s for"
          title={<>Built for anyone <em>building a Gulf career.</em></>}
        />
        <ul className="-mx-4 mt-7 flex snap-x gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:mt-10 lg:grid-cols-4 lg:gap-4 [&::-webkit-scrollbar]:hidden">
          {AUDIENCE.map(([title, body, img, alt]) => (
            <li key={title} className="group w-[240px] shrink-0 snap-start overflow-hidden rounded-[20px] border border-line bg-white shadow-lp-card sm:w-auto">
              <div className="relative h-[150px] overflow-hidden lg:h-[180px]">
                <Image src={img} alt={alt} fill sizes="(min-width: 1024px) 280px, (min-width: 640px) 50vw, 240px" className="object-cover transition-transform duration-500 group-hover:scale-[1.04] motion-reduce:transition-none" />
              </div>
              <div className="p-4">
                <h3 className="type-card text-ink">{title}</h3>
                <p className="mt-1 type-helper leading-snug text-ink-soft">{body}</p>
              </div>
            </li>
          ))}
        </ul>
        <ul className="mt-5 flex flex-wrap gap-2 lg:mt-8" aria-label="Professions">
          {FIELDS.map((f, i) => (
            <li key={f} className={cn('rounded-full border border-line bg-white px-3 py-1.5 type-helper font-semibold text-ink-soft', i >= 6 && 'max-sm:hidden')}>{f}</li>
          ))}
          <li className="rounded-full bg-teal-soft px-3 py-1.5 type-helper font-semibold text-teal">+ any other field</li>
        </ul>
      </Wrap>
    </section>
  )
}

/* ── Founder: the Gulf insider behind the product ─────────────────────── */

const INSIGHTS = [
  ['Make your experience easy to find', 'Use the job’s relevant terminology for skills and standards you can support with your experience.'],
  ['The top third decides', 'Recruiters look for title, years, Gulf experience, visa and notice period — in seconds.'],
  ['Numbers beat duties', '“Cut month-end close from 9 to 5 days” shows a result more clearly than “Handled accounts.”'],
  ['Premium roles are won in the room', 'Practise answers with results before you face the client — not after.'],
] as const

export function Founder() {
  return (
    <section id="founder" aria-labelledby="founder-title" className="relative overflow-hidden bg-teal py-16 text-white lg:py-[104px]">
      <Image src="/landing/founder-refinery-night.jpg" alt="" fill sizes="100vw" className="object-cover opacity-[0.14]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_15%_10%,rgba(201,150,46,0.25),transparent_70%)]" aria-hidden="true" />
      <Wrap className="relative grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
        <div>
          <span className="font-semibold type-caption uppercase tracking-[0.08em] text-gold-soft">Built by a Gulf insider</span>
          <h2 id="founder-title" className="mt-3 type-marketing-title">
            Gulf experience. <em className="not-italic text-gold-soft">Built into your preparation.</em>
          </h2>
          <div className="mt-6 flex items-center gap-4 rounded-[18px] bg-white/[0.08] p-4 ring-1 ring-white/15">
            <span className="grid size-14 shrink-0 place-items-center rounded-full bg-gold text-[20px] font-bold text-ink tracking-[-0.02em]" aria-hidden="true">SKJ</span>
            <div className="leading-snug">
              <b className="block text-[16px]">Satish Kumar Jaiswal</b>
              <span className="block type-helper text-white/80">Founder · E&amp;I Superintendent</span>
              <span className="block type-helper text-white/80">15+ years on Middle East EPC &amp; PMC projects</span>
            </div>
          </div>
          <p className="mt-5 max-w-[520px] type-body text-white/85 lg:text-[16px]">
            Built from 15+ years on Gulf projects, helping you present your experience clearly and prepare for interviews.
          </p>
        </div>
        <div>
          <div className="font-semibold type-caption uppercase tracking-[0.08em] text-gold-soft">Practical Gulf career guidance</div>
          <ol className="-mx-4 mt-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden">
            {INSIGHTS.map(([title, body], i) => (
              <li key={title} className="w-[78%] shrink-0 snap-start rounded-[18px] bg-white p-4 text-ink shadow-m-3 sm:w-auto lg:p-5">
                <span className="font-mono type-caption text-gold-ink">0{i + 1}</span>
                <h3 className="mt-1 type-card">{title}</h3>
                <p className="mt-1.5 type-helper leading-snug text-ink-soft">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </Wrap>
    </section>
  )
}

/* ── Trust: the Career Profile is the source of truth ─────────────────── */

export function Trust() {
  const outputs = [
    [FileText, 'CV'],
    [Mail, 'Cover letter'],
    [MessagesSquare, 'Interview prep'],
  ] as const
  const rules = [
    'Employers, job titles and dates are never changed.',
    'Anything new is highlighted — kept only if you confirm it’s true.',
    'You approve every change. Delete your data any time.',
  ]
  return (
    <section id="trust" aria-labelledby="trust-title" className="border-y border-line bg-white py-11 sm:py-16 lg:py-[104px]">
      <Wrap className="grid items-center gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
        <div>
          <SectionHead
            id="trust-title"
            eyebrow="Why you can trust it"
            title={<>Your experience. Clearer applications. <em>You stay in control.</em></>}
          />
          <ul className="mt-6 space-y-3">
            {rules.map((r) => (
              <li key={r} className="flex gap-3 text-[15px] leading-snug text-ink-soft lg:text-[16px]">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-ok-soft text-ok"><Check className="size-3.5" /></span>
                {r}
              </li>
            ))}
          </ul>
        </div>

        {/* Visual: one locked source feeding three outputs. */}
        <div className="relative mx-auto w-full max-w-[460px]">
          <div className="relative rounded-[22px] border-2 border-teal bg-canvas p-5 shadow-m-3">
            <div className="flex items-center gap-3">
              <span className="grid size-12 place-items-center rounded-[14px] bg-teal text-white"><Lock className="size-5" aria-hidden="true" /></span>
              <div>
                <div className="font-semibold type-caption uppercase tracking-[0.08em] text-teal">Source of truth</div>
                <div className="text-[20px] font-bold text-ink tracking-[-0.02em]">Your Career Profile</div>
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-2 type-caption">
              {[
                ['Employers', 'Locked'],
                ['Job titles', 'Locked'],
                ['Dates', 'Locked'],
                ['Education', 'Locked'],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between rounded-[10px] bg-white px-3 py-2">
                  <dt className="text-ink-soft">{k}</dt>
                  <dd className="flex items-center gap-1 font-mono type-caption text-teal"><Lock className="size-3" aria-hidden="true" />{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="flex justify-around px-8" aria-hidden="true">
            {outputs.map(([, l]) => (
              <span key={l} className="h-8 w-[2px] bg-gradient-to-b from-teal to-line-strong" />
            ))}
          </div>
          <ul className="grid grid-cols-3 gap-2">
            {outputs.map(([Icon, l]) => (
              <li key={l} className="rounded-[14px] border border-line bg-white px-2 py-3 text-center shadow-m-1">
                <Icon className="mx-auto size-5 text-teal" aria-hidden="true" />
                <div className="mt-1 type-caption font-semibold text-ink">{l}</div>
              </li>
            ))}
          </ul>
        </div>
      </Wrap>
    </section>
  )
}

/* ── Pricing preview. No prices: checkout is not live (founder decision M10). ── */

export function PricingPreview() {
  return (
    <section id="pricing" aria-labelledby="pricing-title" className="py-11 sm:py-16 lg:py-[104px]">
      <Wrap>
        <SectionHead center id="pricing-title" eyebrow="Pricing" title={<>Start free. <em>Add services per job.</em></>} />
        <div className="mx-auto mt-8 grid max-w-[880px] gap-3 md:grid-cols-2 lg:mt-12 lg:gap-5">
          <div className="flex flex-col rounded-[20px] border border-line bg-white p-5 shadow-lp-card lg:p-7">
            <div className="font-semibold type-caption uppercase tracking-[0.08em] text-ink-muted">Free</div>
            <div className="mt-1 text-[22px] font-bold text-ink lg:text-[26px] tracking-[-0.02em]">Know where you stand</div>
            <ul className="mt-4 space-y-2 type-helper text-ink-soft">
              {['Gulf Readiness score — no card', 'Career Profile from your CV', 'Browse all resume templates'].map((t) => (
                <li key={t} className="flex gap-2"><Check className="mt-0.5 text-ok" /> {t}</li>
              ))}
            </ul>
            <Link href="/gulf-readiness-score" className={cn(BTN_LINE, 'mt-6')}>Check my readiness — free</Link>
          </div>
          <div className="relative flex flex-col rounded-[20px] border-2 border-teal bg-white p-5 shadow-m-3 lg:p-7">
            <div className="font-semibold type-caption uppercase tracking-[0.08em] text-gold-ink">Per job · confirm price directly</div>
            <div className="mt-1 text-[22px] font-bold text-ink lg:text-[26px] tracking-[-0.02em]">Prepare each application</div>
            <ul className="mt-4 space-y-2 type-helper text-ink-soft">
              {['Optimized CV, ATS before & after', 'Cover letter in 4 tones', 'Interview Q&A + mock interview'].map((t) => (
                <li key={t} className="flex gap-2"><Check className="mt-0.5 text-ok" /> {t}</li>
              ))}
            </ul>
            <Link href="/signup" className={cn(BTN_TEAL, 'mt-6')}>Create my account</Link>
          </div>
        </div>
        <p className="mx-auto mt-4 max-w-[640px] text-center type-caption text-ink-muted">
          <NotLiveText>Card checkout is not live yet.</NotLiveText> Current access is shown in your account.
        </p>
      </Wrap>
    </section>
  )
}

/* ── FAQ: six questions, native accordion ─────────────────────────────── */

const FAQ = [
  ['What is ATS, and why does it matter?', 'An Applicant Tracking System helps employers manage applications. Some systems support keyword searches or screening, and each employer uses them differently. A readable CV with relevant skills helps make your experience easier to find. GCC Mentor helps you tailor your application and review every change.'],
  ['What are the optimization levels?', 'You choose. Easy is a light touch in the job’s keywords. Moderate adds suggested lines for the must-have requirements. High is the strongest rewrite. Suggestions are highlighted and only kept if you confirm they are true.'],
  ['Can GCC Mentor guarantee a job?', 'No. It helps you present your real experience clearly for each job. Employers make their own decisions — no score or CV can guarantee an interview or offer.'],
  ['Can I use my existing resume?', 'Yes. Upload a PDF or Word file, or paste the text. It becomes your Career Profile, and you check it before anything is written from it.'],
  ['Does GCC Mentor invent experience?', 'No. Employers, titles, dates and education are never changed. If a job asks for something your profile doesn’t show, a suggestion is highlighted and only kept if you confirm it’s true.'],
  ['Can I create different CVs for different GCC jobs?', 'Yes. Each target job gets its own optimized CV, cover letter and interview prep, all saved in your Resume Library.'],
  ['Which Gulf countries are supported?', 'Saudi Arabia, the UAE, Qatar, Oman, Kuwait and Bahrain. GCC Mentor is not a recruitment agency — it does not list jobs or contact employers.'],
  ['Can I use GCC Mentor on mobile?', 'Yes. Every step — upload, review, cover letter and mock interview — is designed to work on a phone.'],
] as const

/** FAQPage structured data — the same questions and answers shown on the page. */
const FAQ_JSON_LD = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
})

export function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="border-t border-line bg-white py-11 sm:py-16 lg:py-[104px]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: FAQ_JSON_LD }} />
      <Wrap className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <SectionHead id="faq-title" eyebrow="Questions" title={<>Before <em>you start.</em></>} />
        <div className="space-y-2">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group rounded-[16px] border border-line bg-canvas open:bg-white open:shadow-lp-card">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-[15px] font-bold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal lg:px-5 lg:text-[16px] [&::-webkit-details-marker]:hidden">
                {q}
                <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-full bg-white text-[18px] leading-none text-teal transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none">+</span>
              </summary>
              <p className="px-4 pb-4 type-helper leading-relaxed text-ink-soft lg:px-5 lg:text-[15px]">{a}</p>
            </details>
          ))}
        </div>
      </Wrap>
    </section>
  )
}

/* ── Final CTA ─────────────────────────────────────────────────────────── */

export function FinalCta() {
  const chain = ['Profile', 'Job', 'CV', 'Interview']
  return (
    <section aria-labelledby="final-title" className="py-12 lg:py-[96px]">
      <Wrap>
        <div className="relative overflow-hidden rounded-[26px] bg-teal px-5 py-10 text-center text-white sm:px-8 lg:rounded-[32px] lg:px-16 lg:py-20">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_70%_at_50%_0%,rgba(201,150,46,0.26),transparent_70%)]" aria-hidden="true" />
          <div className="relative">
            <ol className={cn(s.chain, 'mx-auto flex max-w-[520px] flex-wrap items-center justify-center gap-1.5 type-caption font-semibold sm:gap-2 ')} aria-label="Profile, then job, then CV, then interview">
              {chain.map((c, i) => (
                <li key={c} className="rounded-full px-3 py-1.5 ring-1 ring-white/25" style={{ ['--d' as string]: `${i * 1.2}s` }}>
                  {c}
                  {i < chain.length - 1 ? <span className="sr-only">, then</span> : null}
                </li>
              ))}
            </ol>
            <h2 id="final-title" className="mx-auto mt-6 max-w-[760px] type-marketing-title">
              Your next Gulf opportunity. <em className="not-italic text-gold-soft">Start with your profile.</em>
            </h2>
            <p className="mx-auto mt-4 max-w-[520px] type-body text-white/85 lg:text-[16px]">
              One profile for your CV, cover letters and interview preparation.
            </p>
            <div className="mt-7 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
              <Link href="/signup" className={cn(BTN_GOLD, 'w-full sm:w-auto')}>
                Build my profile <ArrowRight />
              </Link>
              <Link href="/gulf-readiness-score" className="inline-flex min-h-[52px] w-full items-center justify-center rounded-[14px] border border-white/40 px-5 type-button text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:w-auto">
                Free readiness score first
              </Link>
            </div>
          </div>
        </div>
      </Wrap>
    </section>
  )
}

/** Phones and tablets only; the page reserves bottom padding so it never covers the footer. */
export function MobileStickyCta() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 px-4 pb-[calc(10px+env(safe-area-inset-bottom,0px))] pt-2.5 backdrop-blur-md lg:hidden">
      <div className="mx-auto flex max-w-[560px] items-center gap-3">
        <div className="min-w-0 flex-1 type-caption leading-tight text-ink-muted">
          <b className="block type-helper text-ink">One profile, every Gulf job</b>
          Free to start · no card
        </div>
        <Link href="/signup" className={cn(BTN_GOLD, 'min-h-12 shrink-0 px-4 type-helper')}>
          Start free
        </Link>
      </div>
    </div>
  )
}
