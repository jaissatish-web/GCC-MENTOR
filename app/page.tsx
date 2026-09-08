import Image from 'next/image'
import Link from 'next/link'
import { cn, GULF_COUNTRIES } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SiteNav } from '@/components/marketing/SiteNav'
import {
  ChartBarIcon,
  DocumentTextIcon,
  SparklesIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  RocketLaunchIcon,
  UserCircleIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  BoltIcon,
  RectangleStackIcon,
  EnvelopeIcon,
  ChatBubbleLeftRightIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline'

const photos = {
  // Gulf industrial / energy plant — hero backdrop.
  plant: 'https://images.unsplash.com/photo-1509390288171-ce2088f7d08e?auto=format&fit=crop&w=1920&q=80',
  // Second industrial plant image — trust section.
  plantAlt: 'https://images.unsplash.com/photo-1588011930968-eadac80e6a5a?auto=format&fit=crop&w=1920&q=80',
  // Commissioning engineer on site, hard hat — credibility section. Atmospheric /
  // illustrative site photography, not a portrait of the founder.
  engineer: 'https://images.unsplash.com/photo-1622612023350-b15f063eabe6?auto=format&fit=crop&w=1200&q=80',
}

const countryFlags: Record<string, string> = {
  saudi_arabia: '🇸🇦', uae: '🇦🇪', qatar: '🇶🇦',
  oman: '🇴🇲', kuwait: '🇰🇼', bahrain: '🇧🇭',
}

/**
 * Every service, with its REAL status. `href` only ever points somewhere an
 * anonymous visitor can actually land: the free scorecard needs no login, and
 * everything else routes to signup rather than to a protected route that would
 * bounce them to a login screen mid-click.
 */
const services = [
  { icon: ChartBarIcon, title: 'Gulf Readiness Score', desc: 'Answer two questions, upload a CV, and get a scored breakdown across six dimensions with a ranked plan of what to fix first.', href: '/gulf-readiness-score', status: 'Free · no login' },
  { icon: UserCircleIcon, title: 'Career Profile', desc: 'Your experience, read from your CV once and stored as structured facts. Every other tool draws from it, so you never retype anything.', href: '/signup', status: 'Live' },
  { icon: SparklesIcon, title: 'GCC Resume Optimizer', desc: 'Paste the job description and it reframes your real experience for that specific role and the Gulf market — grounded, so it can never invent a job you did not do.', href: '/signup', status: 'Live' },
  { icon: RectangleStackIcon, title: '15 Gulf CV Templates', desc: 'ATS-safe through to photo-led Gulf formats. Switch template, font, colour and photo without retyping a word.', href: '/signup', status: 'Live' },
  { icon: EnvelopeIcon, title: 'Cover Letter', desc: 'Written from the same profile, in the tone you choose — Professional, Short, Technical or Explanatory.', href: '/signup', status: 'Live' },
]

/** Named honestly as not-yet-built. Shown because the roadmap is part of the pitch. */
const plannedServices = [
  { icon: QuestionMarkCircleIcon, title: 'Interview Q&A Prep', desc: 'Role-specific technical and HR questions, drawn from your own profile.' },
  { icon: ChatBubbleLeftRightIcon, title: 'Mock Interview', desc: 'Practise the conversation with guided feedback.' },
]

/**
 * The guided path, written as what the user DOES and what they GET — the point
 * the founder asked for: someone reading this should understand they are being
 * walked from "I want a Gulf job" to "I am ready to apply", not sold a tool.
 */
const journeySteps = [
  { label: 'See where you stand', doing: 'Upload your current CV and answer two questions about your Gulf experience.', gain: 'A scored readiness breakdown and a ranked list of what is holding you back.', free: true },
  { label: 'Build your Career Profile', doing: 'We read your CV and fill in your history, skills and certifications for you.', gain: 'One structured profile that every future application is built from.', free: true },
  { label: 'Target a real job', doing: 'Choose the role you want, and paste the job description if you have one.', gain: 'A match report showing your gaps against that specific job.', free: false },
  { label: 'Generate your Gulf CV', doing: 'The optimizer reframes your real experience for that role and market.', gain: 'An ATS-ready CV in your choice of 15 Gulf formats.', free: false },
  { label: 'Complete the application', doing: 'Add a cover letter in the tone that fits the employer.', gain: 'A full application package, ready to send.', free: false },
]

// Real credentials of the platform's founder, drawn directly from his resume.
// Only facts that survive verification are used here — no invented figures,
// percentages, or headcounts. See docs/PROJECT_STATUS.md for the source note.
const credentials = [
  { label: 'NEOM Green Hydrogen Complex', detail: "World's largest green hydrogen facility — Duba, Tabuk, Saudi Arabia" },
  { label: 'ADNOC TAKREER', detail: 'Base Oil Unit, direct ADNOC project delivery — Abu Dhabi, UAE' },
  { label: 'Bechtel · Al Taweelah', detail: 'Largest alumina refinery in the Middle East, ADNOC standards — UAE' },
  { label: 'NSRP Refinery, Vietnam', detail: "Asia's largest single-train refinery and petrochemical complex" },
]

const standards = ['Saudi Aramco', 'ADNOC', 'Bechtel', 'Shell DEP', 'QatarEnergy']

// Illustrative rewrite of a typical instrumentation/EPC resume line — the
// format Gulf recruiters expect. Not a real customer result.
const beforeAfter = {
  before: 'Handled instrumentation and electrical testing tasks at the plant site.',
  after: 'Directed LV/MV switchgear and cable-testing programs across multiple substations, aligned to Saudi Aramco and ADNOC engineering standards.',
}

// Illustrative score comparison — not aggregated from real customer data.
const readinessBars = [
  { label: 'ATS keyword match', before: 34, after: 88 },
  { label: 'Format compliance', before: 52, after: 96 },
  { label: 'Recruiter-ready score', before: 41, after: 91 },
]

// `live: true` = a real visitor can pay this price today via /onboarding →
// /optimize/pay, which currently only ever charges the single lib/pricing.ts
// resume_optimization amount (₹499). The two bundle tiers are real (they
// exist as admin-created service_packages, TASK-061), but are unlocked by a
// promo code the founder hands out directly while Razorpay stays blocked on
// KYC — there is no self-serve checkout for them yet. Marking them `live:
// false` here is what keeps the "Get Started" button honest: a visitor who
// clicks it should never end up paying for less than the tier promised.
// DOCX IS NOT OFFERED. The Word download was withdrawn because its output did
// not match what the screen showed; the product is PDF-only
// (docs/08_RESUME_ENGINE.md §5). Listing it here was one of the two untrue
// claims recorded as WORK_QUEUE W1 — removed 2026-08-19, along with the
// "instant self-serve checkout" line below.
const pricing = [
  { name: 'Free', price: null, tag: 'GCC Readiness', items: ['Gulf Readiness Score', 'Six-dimension breakdown', 'Ranked improvement plan'], featured: false, live: true },
  { name: 'Resume Optimization', price: '₹499', tag: 'Single resume', items: ['Career Profile', 'GCC-Optimized Resume', '15 Gulf templates', 'PDF download'], featured: true, live: true },
  { name: 'Resume + Cover Letter', price: '₹999', tag: 'Bundle', items: ['Optimized resume', 'Professional cover letter', 'PDF download'], featured: false, live: false },
  { name: 'Complete Package', price: '₹2,499', tag: 'Full preparation', items: ['Resume + cover letter', 'Multiple target versions', 'Priority support'], featured: false, live: false }
]

const faq = [
  { q: 'Will GCC MENTOR invent anything on my CV?', a: 'No. The optimizer uses only facts in your Career Profile. It improves framing, never your history. Every generated line is validated against your profile before you see it.' },
  { q: 'Which Gulf countries are supported?', a: 'Saudi Arabia, UAE, Qatar, Oman, Kuwait and Bahrain. The CV format and readiness scoring follow conventions shared across the Gulf, so one profile prepares you for all six rather than locking you to one.' },
  { q: 'Are all tools available today?', a: 'No, and we mark which is which. The Gulf Readiness Score, Career Profile, resume optimizer, 15 templates and cover letters are live. Interview Q&A and Mock Interview are still in development and are labelled as such.' },
  { q: 'How do I pay?', a: 'Card checkout is not live yet — we are still completing our payment provider setup. You can use the free Gulf Readiness Score and build your Career Profile today at no cost; when you want a paid service we arrange it with you directly and unlock it on your account.' },
  { q: 'Can I see changes before paying?', a: 'Yes. You see the full optimized resume, and can edit it, before any payment is arranged.' },
  { q: 'How is my data protected?', a: 'Passport, visa and contact fields are encrypted. Every internal access is logged. You can delete your profile and all data at any time from Settings.' },
]

function Kicker({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return <p className={cn('text-[12px] font-bold uppercase tracking-[0.2em]', light ? 'text-redesign-gold-dark' : 'text-navy')}>{children}</p>
}

function StaticScoreRing({ score, size = 64 }: { score: number; size?: number }) {
  const circumference = 264
  const offset = circumference * (1 - score / 100)
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className="-rotate-90" aria-hidden="true">
      <circle cx="50" cy="50" r="42" fill="none" strokeWidth="8" className="stroke-navy-tint" />
      <circle cx="50" cy="50" r="42" fill="none" strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className="stroke-navy" />
      <text x="50" y="50" dy="0.35em" textAnchor="middle" className="font-mono text-[22px] fill-navy" style={{ transform: 'rotate(90deg)', transformOrigin: '50px 50px' }}>{score}</text>
    </svg>
  )
}

function ReadinessBar({ label, before, after }: { label: string; before: number; after: number }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-[12px] font-semibold text-ink-700">
        <span>{label}</span>
        <span className="font-mono text-navy">{before}% → {after}%</span>
      </div>
      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-ink-200">
        <div className="absolute inset-y-0 left-0 rounded-full bg-ink-400/50" style={{ width: `${before}%` }} />
        <div className="absolute inset-y-0 left-0 rounded-full bg-navy" style={{ width: `${after}%` }} />
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <div className="w-full overflow-x-clip bg-bg text-ink-900">
      <SiteNav />
      <main>
        {/* ════ HERO ════ */}
        <section className="relative overflow-hidden bg-navy-deep">
          <div className="absolute inset-0">
            {/* `sizes` is required on a `fill` image (2026-08-19). Without it
                Next assumes the image spans the viewport at every breakpoint and
                serves its largest srcset candidate to a phone — this is the LCP
                element, so that was the single most expensive byte on the page.
                `priority` stays: it IS the LCP element and must not lazy-load. */}
            <Image src={photos.plant} alt="" fill priority sizes="100vw" className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-navy-deep via-navy-deep/90 to-navy-deep/40" />
            <div className="absolute inset-0 bg-gradient-to-t from-navy-deep via-transparent to-navy-deep/50" />
          </div>
          <div className="relative mx-auto max-w-[1280px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
            <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
              {/* Hero copy */}
              <div className="flex flex-col gap-6">
                <Kicker light>Built by a 15+ Year Gulf E&amp;I Superintendent</Kicker>
                <h1 className="font-serif text-5xl leading-[1.02] tracking-tight text-white sm:text-6xl lg:text-7xl">
                  Your Career,<br />
                  <span className="text-redesign-gold-dark">Gulf-Ready.</span>
                </h1>
                <p className="max-w-[55ch] text-[17px] leading-relaxed text-white/80 sm:text-lg">
                  Prepare for your next opportunity in Saudi Arabia, UAE, Qatar, Oman, Kuwait or Bahrain.
                  Built by an engineer who has commissioned NEOM Green Hydrogen, ADNOC and Bechtel megaprojects — not a generic resume template.
                </p>
                {/* Primary CTA is the FREE scorecard, not /onboarding.
                    /onboarding resolves to /profile, which is behind auth — an
                    anonymous visitor clicking it saw a flash of "Loading…" and
                    then a login wall. The scorecard needs no login, delivers a
                    real result in one step, and is the designed top of the
                    funnel. Fixed 2026-08-19. */}
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link href="/gulf-readiness-score" className={cn(buttonVariants({ variant: 'purchase' }), 'text-[15px] px-6')}>
                    Score My CV Free <ArrowRightIcon className="ml-1 h-4 w-4" />
                  </Link>
                  <Link href="/signup" className={cn(buttonVariants({ variant: 'secondary' }), 'text-[15px] border-white/30 bg-white/5 text-white hover:bg-white/10')}>
                    Create Free Account
                  </Link>
                </div>
                <p className="text-[13px] text-white/60">
                  No card required. Your score is instant, and nothing is saved unless you sign up.
                </p>
                <div className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] font-semibold text-white/70">
                  {GULF_COUNTRIES.filter(c => c.value !== 'generic_gulf').map(c => (
                    <span key={c.value}>{countryFlags[c.value]} {c.label}</span>
                  ))}
                </div>
              </div>

              {/* Hero visual: scorecard preview */}
              <div className="relative">
                <div className="rounded-radius-2xl border border-line bg-surface-light p-5 shadow-[0_20px_60px_-12px_rgba(0,0,0,0.45)] sm:p-7">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-navy">GCC Career Profile</p>
                      <p className="mt-1 text-[13px] text-ink-700">Senior Instrument Engineer</p>
                    </div>
                    <span className="rounded-full bg-navy-tint px-3 py-1 text-[12px] font-bold uppercase tracking-wider text-navy">Illustrative profile</span>
                  </div>
                  <p className="mt-5 text-[12px] font-semibold uppercase tracking-wider text-ink-400">Illustrative example — not a real customer result</p>
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="flex flex-col items-center gap-2 rounded-radius-lg border border-line bg-bg/60 p-4">
                      <CheckCircleIcon className="h-10 w-10 text-navy" />
                      <span className="text-center text-[12px] font-bold text-ink-700">ATS-ready format</span>
                    </div>
                    <div className="flex flex-col items-center gap-2 rounded-radius-lg border border-line bg-bg/60 p-4">
                      <ChartBarIcon className="h-10 w-10 text-navy" />
                      <span className="text-center text-[12px] font-bold text-ink-700">Readiness review</span>
                    </div>
                    <div className="flex flex-col items-center gap-2 rounded-radius-lg border border-line bg-bg/60 p-4">
                      <SparklesIcon className="h-10 w-10 text-navy" />
                      <span className="text-center text-[12px] font-bold text-ink-700">Role targeting</span>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-4 text-[12px] text-navy">
                    <span className="flex items-center gap-1.5"><CheckCircleIcon className="h-4 w-4" /> Saudi Arabia ✓</span>
                    <span className="flex items-center gap-1.5"><CheckCircleIcon className="h-4 w-4" /> UAE ✓</span>
                  </div>
                  <div className="mt-4 rounded-radius-lg border border-line bg-navy-tint/50 p-4">
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="font-semibold">Profile completeness</span>
                      <span className="font-bold text-navy">Ready to review</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-navy-tint">
                      <div className="h-2 w-3/4 rounded-full bg-navy" />
                    </div>
                    <p className="mt-2 text-[12px] text-ink-400">Complete your profile to strengthen future applications</p>
                  </div>
                </div>
                {/* Decorative glow */}
                <div className="absolute -bottom-3 -right-3 h-24 w-24 rounded-full bg-redesign-gold/30 blur-2xl" aria-hidden="true" />
              </div>
            </div>
          </div>
        </section>

        {/* ════ TRUST BAND ════ */}
        <section className="border-y border-line bg-surface-2-light">
          <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-center gap-x-10 gap-y-3 px-5 py-5 text-[13px] font-semibold text-ink-700 sm:px-8 lg:px-12">
            <span className="flex items-center gap-2"><ShieldCheckIcon className="h-4 w-4 text-navy" /> No invented facts</span>
            <span className="flex items-center gap-2"><BoltIcon className="h-4 w-4 text-navy" /> Zero LTI safety record</span>
            <span className="flex items-center gap-2"><GlobeAltIcon className="h-4 w-4 text-navy" /> GCC + Asia mega-projects</span>
            <span className="flex items-center gap-2"><CheckCircleIcon className="h-4 w-4 text-navy" /> Professional preparation</span>
          </div>
        </section>

        {/* ════ FOUNDER CREDIBILITY ════ */}
        <section className="border-b border-line bg-surface-2-light">
          <div className="mx-auto max-w-[1280px] px-5 py-24 sm:px-8 lg:px-12 lg:py-28">
            <div className="grid items-center gap-16 lg:grid-cols-2">
              <div className="relative min-h-[420px] overflow-hidden rounded-radius-2xl">
                {/* Half-width from lg up, full-width below — see the hero's note. */}
                <Image
                  src={photos.engineer}
                  alt="Commissioning engineer on a Gulf industrial site"
                  fill
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-navy-deep/70 to-transparent" />
              </div>
              <div className="flex flex-col gap-6">
                <Kicker>Not built by a template. Built by an engineer.</Kicker>
                <h2 className="font-serif text-4xl leading-tight text-ink-900 sm:text-5xl">
                  15+ years commissioning the Gulf&apos;s largest projects.
                </h2>
                <p className="text-[15px] leading-relaxed text-ink-700">
                  GCC MENTOR is founded by an E&amp;I Superintendent whose career was built on the same mega-scale EPC
                  projects you&apos;re trying to break into — not a marketing team guessing what Gulf recruiters want to see.
                </p>
                <div className="mt-2 grid gap-4 sm:grid-cols-2">
                  {credentials.map(c => (
                    <div key={c.label} className="flex gap-3 rounded-radius-lg border border-line bg-surface-light p-4">
                      <RocketLaunchIcon className="mt-0.5 h-5 w-5 shrink-0 text-navy" />
                      <div>
                        <h3 className="font-serif text-sm font-bold text-ink-900">{c.label}</h3>
                        <p className="mt-0.5 text-[12px] leading-relaxed text-ink-400">{c.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-ink-400">
                  <span className="font-semibold text-ink-700">Delivered to standard:</span>
                  {standards.map(s => (
                    <span key={s} className="rounded-full border border-line bg-surface-light px-2.5 py-1 font-semibold text-ink-700">{s}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ════ SERVICE CARDS ════ */}
        <section id="services" className="mx-auto max-w-[1280px] px-5 py-24 sm:px-8 lg:px-12 lg:py-28">
          <div className="max-w-2xl">
            <Kicker>Everything you need to prepare for the Gulf</Kicker>
            <h2 className="mt-4 font-serif text-4xl leading-tight text-ink-900 sm:text-5xl">One profile. Every application.</h2>
            <p className="mt-5 text-lg leading-relaxed text-ink-700">Your experience, skills and certifications live in one place. Every tool draws from the same trusted source.</p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <Link key={s.title} href={s.href} className="group">
                <Card tone="light" className="flex h-full min-h-[260px] flex-col gap-4 p-6 transition-all hover:-translate-y-1 hover:border-navy/40 hover:shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-radius-lg bg-navy-tint text-navy">
                      <s.icon className="h-5 w-5" />
                    </span>
                    <span className={cn(
                      'rounded-full px-2.5 py-1 text-[12px] font-bold uppercase tracking-wider',
                      s.status === 'Live' ? 'bg-navy-tint text-navy' : 'bg-redesign-gold-tint text-gold-text',
                    )}>
                      {s.status}
                    </span>
                  </div>
                  <h3 className="font-serif text-xl text-ink-900">{s.title}</h3>
                  <p className="text-sm leading-relaxed text-ink-700">{s.desc}</p>
                  <span className="mt-auto text-sm font-bold text-navy group-hover:text-sky">
                    {s.status === 'Live' ? 'Start free →' : 'Try it now →'}
                  </span>
                </Card>
              </Link>
            ))}
          </div>

          {/* THE ROADMAP, NAMED AS A ROADMAP. Shown because breadth is part of
              the story, and marked unbuilt because claiming otherwise is exactly
              what this product refuses to do. */}
          <div className="mt-10 rounded-radius-xl border border-dashed border-line bg-surface-2-light/60 p-6">
            <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-ink-400">In development — not available yet</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {plannedServices.map((s) => (
                <div key={s.title} className="flex gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-radius-lg bg-surface-light text-ink-400">
                    <s.icon className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <h3 className="font-serif text-sm font-bold text-ink-700">{s.title}</h3>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-ink-400">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ════ BEFORE / AFTER TRANSFORMATION ════ */}
        <section className="border-y border-line bg-surface-2-light">
          <div className="mx-auto max-w-[1280px] px-5 py-24 sm:px-8 lg:px-12 lg:py-28">
            <div className="max-w-2xl">
              <Kicker>What GCC-optimization actually changes</Kicker>
              <h2 className="mt-4 font-serif text-4xl leading-tight text-ink-900 sm:text-5xl">Same experience. Recruiter-ready framing.</h2>
              <p className="mt-5 text-lg leading-relaxed text-ink-700">The facts never change — only how clearly a Gulf recruiter can see them.</p>
            </div>
            <div className="mt-12 grid gap-6 lg:grid-cols-2">
              <div className="flex flex-col gap-4">
                <Card tone="light" className="flex flex-col gap-2 border-ink-200 p-6">
                  <span className="w-fit rounded-full bg-ink-200 px-3 py-1 text-[12px] font-bold uppercase tracking-wider text-ink-700">Before</span>
                  <p className="text-[15px] leading-relaxed text-ink-700">{beforeAfter.before}</p>
                </Card>
                <Card tone="light" className="flex flex-col gap-2 border-navy/40 bg-navy-tint/40 p-6">
                  <span className="w-fit rounded-full bg-navy px-3 py-1 text-[12px] font-bold uppercase tracking-wider text-white">After</span>
                  <p className="text-[15px] leading-relaxed text-ink-900">{beforeAfter.after}</p>
                </Card>
                <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-400">Illustrative example — the format real GCC recruiters expect, not a real customer result</p>
              </div>
              <Card tone="light" className="flex flex-col gap-5 p-6">
                <div>
                  <h3 className="font-serif text-lg text-ink-900">GCC Readiness Score</h3>
                  <p className="text-[12px] text-ink-400">Illustrative — not aggregated from real customer data</p>
                </div>
                {readinessBars.map(b => <ReadinessBar key={b.label} {...b} />)}
                <div className="mt-2 flex items-center gap-6 border-t border-line pt-5">
                  <StaticScoreRing score={41} size={56} />
                  <ArrowRightIcon className="h-5 w-5 shrink-0 text-ink-400" />
                  <StaticScoreRing score={91} size={56} />
                  <p className="text-[12px] leading-relaxed text-ink-400">Before → after optimization, on the same underlying facts.</p>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* ════ GULF MARKETS ════ */}
        <section id="markets" className="mx-auto max-w-[1280px] px-5 py-24 sm:px-8 lg:px-12 lg:py-28">
          <div className="max-w-2xl">
            <Kicker>One career profile. Six Gulf markets.</Kicker>
            <h2 className="mt-4 font-serif text-4xl leading-tight text-ink-900 sm:text-5xl">Your experience is ready for any of them.</h2>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {GULF_COUNTRIES.filter(c => c.value !== 'generic_gulf').map((c) => (
              <Link key={c.value} href="/gulf-readiness-score" className="group">
                <Card tone="light" className="flex h-full min-h-[130px] flex-col gap-2 p-5 transition-all hover:-translate-y-0.5 hover:border-navy/40">
                  <span className="text-2xl">{countryFlags[c.value]}</span>
                  <h3 className="font-serif text-xl text-ink-900">{c.label}</h3>
                  <p className="text-[12px] leading-relaxed text-ink-400">CV support live · GCC Readiness available</p>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* ════ TRANSFORMATION JOURNEY ════ */}
        <section className="border-y border-line bg-surface-2-light">
          <div className="mx-auto max-w-[1280px] px-5 py-24 sm:px-8 lg:px-12 lg:py-28">
            <div className="max-w-2xl">
              <Kicker>From &ldquo;I want a Gulf job&rdquo; to &ldquo;I&rsquo;m ready to apply.&rdquo;</Kicker>
              <h2 className="mt-4 font-serif text-4xl leading-tight text-ink-900 sm:text-5xl">
                We walk you through it, step by step.
              </h2>
              <p className="mt-5 text-lg leading-relaxed text-ink-700">
                You are never handed a blank form and left to guess. Each step tells you what to do
                and gives you something back — and the first two cost nothing.
              </p>
            </div>

            {/* A vertical, two-column path: what you do on the left, what you
                get on the right. Deliberately not six small numbered boxes —
                the founder's ask was that a visitor UNDERSTANDS the guided path,
                and a box with four words in it does not carry that. */}
            <ol className="mt-12 flex flex-col gap-3">
              {journeySteps.map((step, i) => (
                <li
                  key={step.label}
                  className="grid items-start gap-4 rounded-radius-xl border border-line bg-surface-light p-5 sm:p-6 md:grid-cols-[auto_1fr_1fr] md:gap-6"
                >
                  <div className="flex items-center gap-3 md:flex-col md:items-start">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-radius-xl bg-navy-deep font-mono text-[15px] font-bold text-white">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    {step.free ? (
                      <span className="rounded-full bg-navy-tint px-2.5 py-1 text-[12px] font-bold uppercase tracking-wider text-navy">
                        Free
                      </span>
                    ) : null}
                  </div>

                  <div>
                    <h3 className="font-serif text-xl leading-snug text-ink-900">{step.label}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-700">{step.doing}</p>
                  </div>

                  <div className="rounded-radius-lg border border-navy/25 bg-navy-tint/40 p-4">
                    <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-navy">You get</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-900">{step.gain}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <Link href="/gulf-readiness-score" className={cn(buttonVariants({ variant: 'purchase' }), 'text-[15px] px-6')}>
                Start at step one <ArrowRightIcon className="ml-1 h-4 w-4" />
              </Link>
              <p className="text-[13px] text-ink-400">Takes about two minutes. No account needed.</p>
            </div>
          </div>
        </section>

        {/* ════ TRUST SECTION ════ */}
        <section className="mx-auto max-w-[1280px] px-5 py-24 sm:px-8 lg:px-12 lg:py-28">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <div className="relative min-h-[400px] overflow-hidden rounded-radius-2xl lg:order-2">
              <Image
                src={photos.plantAlt}
                alt="Gulf industrial and energy facility"
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy-deep/60 to-transparent" />
            </div>
            <div className="flex flex-col gap-6 lg:order-1">
              <Kicker>Your career data stays factual</Kicker>
              <h2 className="font-serif text-4xl leading-tight text-ink-900 sm:text-5xl">
                AI that works from <span className="text-navy">your experience</span> — never invents it.
              </h2>
              <div className="mt-2 grid gap-5">
                {[
                  { title: 'No fabricated experience', desc: 'Your profile is the source of truth. Every line on your resume traces back to a fact you provided.' },
                  { title: 'Built for GCC applications', desc: 'Designed around Gulf job-search requirements — format, keywords, and expectations.' },
                  { title: 'Professional, transparent preparation', desc: 'Know what you are getting before you pay. See the changes, review the output, then decide.' },
                ].map(t => (
                  <div key={t.title} className="flex gap-3">
                    <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-navy" />
                    <div>
                      <h3 className="font-serif font-bold text-ink-900">{t.title}</h3>
                      <p className="text-sm leading-relaxed text-ink-700">{t.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ════ PRICING ════ */}
        <section id="pricing" className="border-t border-line bg-surface-2-light">
          <div className="mx-auto max-w-[1280px] px-5 py-24 sm:px-8 lg:px-12 lg:py-28">
            <div className="max-w-2xl">
              <Kicker>Choose the help you need</Kicker>
              <h2 className="mt-4 font-serif text-4xl leading-tight text-ink-900 sm:text-5xl">Services, not subscriptions.</h2>
              <p className="mt-5 text-lg leading-relaxed text-ink-700">Pay for what you need today. No recurring charges, no hidden fees.</p>
              {/* W1: the previous sentence claimed "instant self-serve checkout"
                  for Resume Optimization. There is no live checkout at all yet —
                  a payment provider is still being selected (Razorpay is not
                  available from Saudi Arabia), so every purchase is arranged
                  directly today. Corrected 2026-08-19. */}
              <p className="mt-3 text-sm leading-relaxed text-ink-400">
                Card checkout is not live yet — we are finishing our payment provider setup. Start
                free today; when you are ready to buy, we arrange it with you directly and unlock it
                on your account.
              </p>
            </div>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {pricing.map((p) => (
                <Card key={p.name} tone="light" className={cn('flex flex-col gap-5 p-6', p.featured && 'border-navy shadow-md ring-1 ring-navy/30')}>
                  {p.featured ? (
                    <span className="w-fit rounded-full bg-navy-tint px-3 py-1 text-[12px] font-bold uppercase tracking-wider text-navy">Most popular</span>
                  ) : !p.live ? (
                    <span className="w-fit rounded-full bg-redesign-gold-tint px-3 py-1 text-[12px] font-bold uppercase tracking-wider text-gold-text">Self-serve checkout coming soon</span>
                  ) : null}
                  <div>
                    <h3 className="font-serif text-xl text-ink-900">{p.name}</h3>
                    <p className="text-sm text-navy">{p.tag}</p>
                  </div>
                  {p.price ? (
                    <p className="font-mono text-4xl font-bold text-ink-900">{p.price}</p>
                  ) : (
                    <p className="font-mono text-4xl font-bold text-navy">Free</p>
                  )}
                  <ul className="flex flex-col gap-2.5 text-sm text-ink-700">
                    {p.items.map(item => (
                      <li key={item} className="flex items-center gap-2">
                        <CheckCircleIcon className="h-4 w-4 shrink-0 text-navy" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  {p.live ? (
                    // Both live CTAs go somewhere an anonymous visitor can
                    // actually use, and neither promises a checkout that does
                    // not exist yet (W1). The paid tier's honest next step is
                    // to start free and build the profile the purchase applies
                    // to — the purchase itself is arranged directly today.
                    <Link
                      href={p.price ? '/signup' : '/gulf-readiness-score'}
                      className={cn(buttonVariants({ variant: p.featured ? 'purchase' : 'primary' }), 'mt-auto')}
                    >
                      {p.price ? 'Start free' : 'Score my CV'}
                    </Link>
                  ) : (
                    <span
                      className={cn(buttonVariants({ variant: 'secondary' }), 'mt-auto cursor-not-allowed opacity-60')}
                      aria-disabled="true"
                    >
                      Coming soon
                    </span>
                  )}
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ════ FAQ ════ */}
        <section className="mx-auto max-w-[900px] px-5 py-24 sm:px-8 lg:py-28">
          <Kicker>Common questions</Kicker>
          <h2 className="mt-4 font-serif text-4xl text-ink-900 sm:text-5xl">Good questions deserve clear answers.</h2>
          <div className="mt-8 divide-y divide-line rounded-radius-xl border border-line bg-surface-light">
            {faq.map(({ q, a }) => (
              <details key={q} className="group px-6">
                <summary className="flex cursor-pointer items-center justify-between py-5 text-sm font-bold text-ink-900 marker:hidden">
                  {q}
                  <span className="text-redesign-gold transition-transform group-open:rotate-45">＋</span>
                </summary>
                <p className="pb-5 text-sm leading-relaxed text-ink-700">{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ════ FINAL CTA ════ */}
        <section className="border-t border-line bg-navy-deep">
          <div className="mx-auto max-w-[900px] px-5 py-24 text-center sm:px-8 lg:py-28">
            <Kicker light>Ready to begin</Kicker>
            <h2 className="mt-4 font-serif text-4xl leading-tight text-white sm:text-5xl">
              Ready for your next Gulf opportunity?
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-white/75">
              No perfect CV required. No inflated claims. Just a clearer path to prepare, apply and grow.
            </p>
            <Link href="/gulf-readiness-score" className={cn(buttonVariants({ variant: 'purchase' }), 'mt-8 text-[15px] px-6')}>
              Score My CV Free <ArrowRightIcon className="ml-1 h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      {/* ════ FOOTER ════ */}
      <footer className="border-t border-line bg-surface-2-light">
        <div className="mx-auto max-w-[1280px] px-5 py-14 sm:px-8 lg:px-12">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-radius-lg bg-navy-deep text-lg font-bold text-white">G</span>
                <span className="font-bold text-ink-900">GCC MENTOR</span>
              </div>
              <p className="mt-4 max-w-[320px] text-sm text-ink-400">Your career intelligence platform for Indian professionals targeting GCC opportunities. Built by a 15+ year Gulf E&amp;I Superintendent.</p>
            </div>
            <div>
              <b className="text-sm text-ink-900">Product</b>
              <div className="mt-4 flex flex-col gap-2.5 text-sm text-ink-400">
                <Link href="/gulf-readiness-score">Free Gulf Readiness Score</Link>
                <Link href="/signup">Create account</Link>
                <a href="#pricing">Pricing</a>
              </div>
            </div>
            <div>
              <b className="text-sm text-ink-900">Company</b>
              <div className="mt-4 flex flex-col gap-2.5 text-sm text-ink-400">
                <Link href="/login">Log in</Link>
                <span>Privacy</span>
                <span>Terms</span>
              </div>
            </div>
          </div>
          <div className="mt-10 border-t border-line pt-6 text-sm text-ink-400">Built for Gulf professionals.</div>
        </div>
      </footer>
    </div>
  )
}
