import Image from 'next/image'
import Link from 'next/link'
import { cn, GULF_COUNTRIES } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SiteNav } from '@/components/marketing/SiteNav'
import {
  ChartBarIcon,
  DocumentTextIcon,
  PencilSquareIcon,
  SparklesIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  RocketLaunchIcon,
  UserCircleIcon,
  CheckCircleIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline'

const photos = {
  skyline: 'https://images.unsplash.com/photo-1652707228067-25672fa0b082?auto=format&fit=crop&w=1920&q=80',
  worker: 'https://images.unsplash.com/photo-1672748341520-6a839e6c05bb?auto=format&fit=crop&w=800&q=80',
}

const countryFlags: Record<string, string> = {
  saudi_arabia: '🇸🇦', uae: '🇦🇪', qatar: '🇶🇦',
  oman: '🇴🇲', kuwait: '🇰🇼', bahrain: '🇧🇭',
}

const services = [
  { icon: UserCircleIcon, title: 'Build Your Career Profile', desc: 'Tell us about your experience once. Your profile becomes the trusted source for every future application.', href: '/onboarding' },
  { icon: ChartBarIcon, title: 'Check Your Gulf Readiness', desc: 'Understand how prepared your experience, resume and skills are for Gulf employers — free, no login.', href: '/ats-scan' },
  { icon: SparklesIcon, title: 'Create a GCC-Optimized Resume', desc: 'Generate a professional resume tailored to the specific country and role you\'re targeting.', href: '/onboarding' },
  { icon: DocumentTextIcon, title: 'Prepare to Apply', desc: 'Get job-specific optimization, cover letters and application-ready packages.', href: '/dashboard' },
]

const journeySteps = [
  { label: 'Your Experience', desc: 'Your real career history — degrees, skills, certifications, years of work.', color: 'bg-surface' },
  { label: 'Career Profile', desc: 'Structured, grounded, always yours.', color: 'bg-forest/10' },
  { label: 'GCC Readiness', desc: 'Score + improvement plan.', color: 'bg-forest/20' },
  { label: 'Country + Job Targeting', desc: 'Pick your Gulf market and role.', color: 'bg-forest/30' },
  { label: 'GCC Resume', desc: 'Optimized, ATS-ready.', color: 'bg-forest/40' },
  { label: 'Application Package', desc: 'Resume + cover letter + prep.', color: 'bg-forest-900 text-white' },
]

const pricing = [
  { name: 'Free', price: null, tag: 'GCC Readiness', items: ['ATS Scan', 'GCC Readiness Score', 'Strengths & Improvements'], featured: false },
  { name: 'Resume Optimization', price: '₹499', tag: 'Single resume', items: ['Career Profile', 'GCC-Optimized Resume', 'PDF + DOCX Download', '30-day access'], featured: false },
  { name: 'Resume + Cover Letter', price: '₹999', tag: 'Most popular', items: ['Optimized resume', 'Professional cover letter', 'PDF + DOCX Download'], featured: true },
    { name: 'Complete Package', price: '₹2,499', tag: 'Full preparation', items: ['Resume + cover letter', 'Multiple target versions', 'Job Match reports'], featured: false }
]

const faq = [
  { q: 'Will GCC MENTOR invent anything on my CV?', a: 'No. The optimizer uses only facts in your Career Profile. It improves framing, never your history. Every generated line is validated against your profile before you see it.' },
  { q: 'Which Gulf countries are supported?', a: 'Resume building and optimization currently support Saudi Arabia, UAE, Qatar, Oman, Kuwait and Bahrain.' },
  { q: 'Are all tools available today?', a: 'No. Live tools are clearly marked. Interview preparation, guidance and the assistant are previews until built.' },
  { q: 'Can I see changes before paying?', a: 'Yes. The current flow shows the changes before payment so you can review what was generated.' },
  { q: 'How is my data protected?', a: 'Passport, visa and contact fields are encrypted. Every internal access is logged. You can delete your profile and all data at any time from Settings.' },
]

function Kicker({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-forest-700">{children}</p>
}

function StaticScoreRing({ score, size = 64 }: { score: number; size?: number }) {
  const circumference = 264
  const offset = circumference * (1 - score / 100)
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className="-rotate-90" aria-hidden="true">
      <circle cx="50" cy="50" r="42" fill="none" strokeWidth="8" className="stroke-forest-100" />
      <circle cx="50" cy="50" r="42" fill="none" strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className="stroke-forest-700" />
      <text x="50" y="50" dy="0.35em" textAnchor="middle" className="font-mono text-[22px] fill-forest-700" style={{ transform: 'rotate(90deg)', transformOrigin: '50px 50px' }}>{score}</text>
    </svg>
  )
}

export default function Home() {
  return (
    <div className="w-full overflow-x-clip bg-bg text-ink-900">
      <SiteNav />
      <main>
        {/* ════ HERO ════ */}
        <section className="relative overflow-hidden bg-bg">
          {/* Background skyline image */}
          <div className="absolute inset-0">
            <Image src={photos.skyline} alt="" fill className="object-cover opacity-[0.07] scale-110" priority />
          </div>
          <div className="relative mx-auto max-w-[1280px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
            <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
              {/* Hero copy */}
              <div className="flex flex-col gap-6">
                <Kicker>Premium Gulf Career Concierge</Kicker>
                <h1 className="font-serif text-5xl leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
                  Your Career,<br />
                  <span className="text-forest-800">Gulf-Ready.</span>
                </h1>
                <p className="max-w-[55ch] text-[17px] leading-relaxed text-ink-700 sm:text-lg">
                  Prepare for your next opportunity in Saudi Arabia, UAE, Qatar, Oman, Kuwait or Bahrain.
                  Build your career profile once. Get a GCC-optimized resume, assess your readiness, and prepare for the right Gulf opportunities — without AI inventing a single fact.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link href="/onboarding" className={cn(buttonVariants({ variant: 'primary' }), 'text-[15px] px-6')}>
                                      Get Started Free <ArrowRightIcon className="ml-1 h-4 w-4" />
                  </Link>
                  <Link href="/ats-scan" className={cn(buttonVariants({ variant: 'primary' }), 'text-[15px]')}>
                    Check My Gulf Readiness
                  </Link>
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] font-semibold text-ink-600">
                  {GULF_COUNTRIES.filter(c => c.value !== 'generic_gulf').map(c => (
                    <span key={c.value}>{countryFlags[c.value]} {c.label}</span>
                  ))}
                </div>
              </div>

              {/* Hero visual: scorecard preview */}
              <div className="relative">
                <div className="rounded-radius-2xl border border-line bg-surface p-5 shadow-[0_20px_60px_-12px_rgba(0,0,0,0.12)] sm:p-7">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-forest-700">GCC Career Profile</p>
                      <p className="mt-1 text-[13px] text-ink-600">Senior Instrument Engineer</p>
                    </div>
                    <span className="rounded-full bg-forest-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-forest-800">Illustrative profile</span>
                  </div>
                  <p className="mt-5 text-[10px] font-semibold uppercase tracking-wider text-ink-400">Illustrative example — not a real customer result</p>
                                    <div className="mt-3 grid grid-cols-3 gap-3">
                                      <div className="flex flex-col items-center gap-2 rounded-radius-lg border border-line bg-bg/60 p-4">
                                        <CheckCircleIcon className="h-10 w-10 text-forest-600" />
                                        <span className="text-center text-[10px] font-bold text-ink-600">ATS-ready format</span>
                                      </div>
                                      <div className="flex flex-col items-center gap-2 rounded-radius-lg border border-line bg-bg/60 p-4">
                                        <ChartBarIcon className="h-10 w-10 text-forest-600" />
                                        <span className="text-center text-[10px] font-bold text-ink-600">Readiness review</span>
                                      </div>
                                      <div className="flex flex-col items-center gap-2 rounded-radius-lg border border-line bg-bg/60 p-4">
                                        <SparklesIcon className="h-10 w-10 text-forest-600" />
                                        <span className="text-center text-[10px] font-bold text-ink-600">Role targeting</span>
                                      </div>
                                    </div>
                  <div className="mt-4 flex items-center gap-4 text-[12px] text-forest-700">
                    <span className="flex items-center gap-1.5"><CheckCircleIcon className="h-4 w-4" /> Saudi Arabia ✓</span>
                    <span className="flex items-center gap-1.5"><CheckCircleIcon className="h-4 w-4" /> UAE ✓</span>
                  </div>
                  <div className="mt-4 rounded-radius-lg border border-line bg-forest-50/50 p-4">
                    <div className="flex items-center justify-between text-[13px]">
                      <span className="font-semibold">Profile completeness</span>
                      <span className="text-forest-700 font-bold">Ready to review</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-forest-100">
                                          <div className="h-2 w-3/4 rounded-full bg-forest-600" />
                                        </div>
                                        <p className="mt-2 text-[11px] text-ink-500">Complete your profile to strengthen future applications</p>
                  </div>
                </div>
                {/* Decorative dot */}
                <div className="absolute -bottom-3 -right-3 h-24 w-24 rounded-full bg-gold-200/40 blur-2xl" aria-hidden="true" />
              </div>
            </div>
          </div>
        </section>

        {/* ════ TRUST BAND ════ */}
        <section className="border-y border-line bg-surface-2-light">
          <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-center gap-x-10 gap-y-3 px-5 py-5 text-[13px] font-semibold text-ink-600 sm:px-8 lg:px-12">
            <span className="flex items-center gap-2"><ShieldCheckIcon className="h-4 w-4 text-forest-600" /> No invented facts</span>
            <span className="flex items-center gap-2"><GlobeAltIcon className="h-4 w-4 text-forest-600" /> Gulf focused</span>
            <span className="flex items-center gap-2"><CheckCircleIcon className="h-4 w-4 text-forest-600" /> Professional preparation</span>
          </div>
        </section>

        {/* ════ SERVICE CARDS ════ */}
        <section id="services" className="mx-auto max-w-[1280px] px-5 py-24 sm:px-8 lg:px-12 lg:py-28">
                  <div className="max-w-2xl">
                    <Kicker>Everything you need to prepare for the Gulf</Kicker>
            <h2 className="mt-4 font-serif text-4xl leading-tight text-ink-900 sm:text-5xl">One profile. Every application.</h2>
            <p className="mt-5 text-lg leading-relaxed text-ink-700">Your experience, skills and certifications live in one place. Every tool draws from the same trusted source.</p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((s, i) => (
              <Link key={s.title} href={s.href} className="group">
                <Card tone="light" className="flex h-full min-h-[280px] flex-col gap-4 p-6 transition-all hover:-translate-y-1 hover:border-forest-300 hover:shadow-sm">
                  <span className="flex h-11 w-11 items-center justify-center rounded-radius-lg bg-forest-100 text-forest-700">
                    <s.icon className="h-5 w-5" />
                  </span>
                  <span className="font-mono text-[10px] tracking-[0.15em] text-forest-500">0{i + 1}</span>
                  <h3 className="font-serif text-xl text-ink-900">{s.title}</h3>
                  <p className="text-sm leading-relaxed text-ink-600">{s.desc}</p>
                  <span className="mt-auto text-sm font-bold text-forest-700 group-hover:text-forest-600">Learn more →</span>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* ════ GULF MARKETS ════ */}
        <section id="markets" className="border-y border-line bg-surface-2-light">
                  <div className="mx-auto max-w-[1280px] px-5 py-24 sm:px-8 lg:px-12 lg:py-28">
                    <div className="max-w-2xl">
                      <Kicker>One career profile. Six Gulf markets.</Kicker>
              <h2 className="mt-4 font-serif text-4xl leading-tight text-ink-900 sm:text-5xl">Your experience is ready for any of them.</h2>
            </div>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {GULF_COUNTRIES.filter(c => c.value !== 'generic_gulf').map((c) => (
                <Link key={c.value} href="/ats-scan" className="group">
                  <Card tone="light" className="flex h-full min-h-[130px] flex-col gap-2 p-5 transition-all hover:-translate-y-0.5 hover:border-forest-300">
                    <span className="text-2xl">{countryFlags[c.value]}</span>
                    <h3 className="font-serif text-xl text-ink-900">{c.label}</h3>
                    <p className="text-[12px] leading-relaxed text-ink-500">CV support live · GCC Readiness available</p>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ════ TRANSFORMATION JOURNEY ════ */}
        <section className="mx-auto max-w-[1280px] px-5 py-24 sm:px-8 lg:px-12 lg:py-28">
          <div className="max-w-2xl">
            <Kicker>From &ldquo;I want a Gulf job&rdquo; to &ldquo;I&rsquo;m ready to apply.&rdquo;</Kicker>
            <h2 className="mt-4 font-serif text-4xl leading-tight text-ink-900 sm:text-5xl">Your transformation journey.</h2>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            {journeySteps.map((step, i) => (
              <div key={step.label} className="flex flex-col gap-3">
                <div className={cn('flex h-14 w-14 items-center justify-center rounded-radius-xl font-serif text-lg font-bold', step.color)}>
                  {String(i + 1).padStart(2, '0')}
                </div>
                <h3 className="font-serif text-lg text-ink-900">{step.label}</h3>
                <p className="text-[12px] leading-relaxed text-ink-500">{step.desc}</p>
                {i < journeySteps.length - 1 && (
                  <ArrowRightIcon className="hidden h-5 w-5 text-ink-300 lg:block" />
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ════ TRUST SECTION ════ */}
        <section className="border-y border-line bg-surface-2-light">
          <div className="mx-auto max-w-[1280px] px-5 py-24 sm:px-8 lg:px-12 lg:py-28">
            <div className="grid items-center gap-16 lg:grid-cols-2">
              <div className="relative min-h-[400px] overflow-hidden rounded-radius-2xl">
                <Image src={photos.worker} alt="Industrial professional" fill className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-forest-900/60 to-transparent" />
              </div>
              <div className="flex flex-col gap-6">
                <Kicker>Your career data stays factual</Kicker>
                <h2 className="font-serif text-4xl leading-tight text-ink-900 sm:text-5xl">
                  AI that works from <span className="text-forest-800">your experience</span> — never invents it.
                </h2>
                <div className="mt-2 grid gap-5">
                  {[
                    { title: 'No fabricated experience', desc: 'Your profile is the source of truth. Every line on your resume traces back to a fact you provided.' },
                    { title: 'Built for GCC applications', desc: 'Designed around Gulf job-search requirements — format, keywords, and expectations.' },
                    { title: 'Professional, transparent preparation', desc: 'Know what you are getting before you pay. See the changes, review the output, then decide.' },
                  ].map(t => (
                    <div key={t.title} className="flex gap-3">
                      <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-forest-600" />
                      <div>
                        <h3 className="font-bold text-ink-900">{t.title}</h3>
                        <p className="text-sm leading-relaxed text-ink-600">{t.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ════ PRICING ════ */}
        <section id="pricing" className="mx-auto max-w-[1280px] px-5 py-24 sm:px-8 lg:px-12 lg:py-28">
          <div className="max-w-2xl">
            <Kicker>Choose the help you need</Kicker>
            <h2 className="mt-4 font-serif text-4xl leading-tight text-ink-900 sm:text-5xl">Services, not subscriptions.</h2>
            <p className="mt-5 text-lg leading-relaxed text-ink-700">Pay for what you need today. No recurring charges, no hidden fees.</p>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {pricing.map((p, i) => (
              <Card key={p.name} tone="light" className={cn('flex flex-col gap-5 p-6', p.featured && 'border-forest-400 shadow-md ring-1 ring-forest-300/50')}>
                {p.featured && (
                  <span className="w-fit rounded-full bg-forest-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-forest-800">Most popular</span>
                )}
                <div>
                  <h3 className="font-serif text-xl text-ink-900">{p.name}</h3>
                  <p className="text-sm text-forest-700">{p.tag}</p>
                </div>
                {p.price ? (
                  <p className="font-mono text-4xl font-bold text-ink-900">{p.price}</p>
                ) : (
                  <p className="font-mono text-4xl font-bold text-forest-600">Free</p>
                )}
                <ul className="flex flex-col gap-2.5 text-sm text-ink-600">
                  {p.items.map(item => (
                    <li key={item} className="flex items-center gap-2">
                      <CheckCircleIcon className="h-4 w-4 shrink-0 text-forest-600" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href={p.price ? '/onboarding' : '/ats-scan'} className={cn(buttonVariants({ variant: p.featured ? 'purchase' : 'primary' }), 'mt-auto')}>
                  {p.price ? 'Get Started' : 'Try Free'}
                </Link>
              </Card>
            ))}
          </div>
        </section>

        {/* ════ FAQ ════ */}
        <section className="border-y border-line bg-surface-2-light">
          <div className="mx-auto max-w-[900px] px-5 py-24 sm:px-8 lg:py-28">
            <Kicker>Common questions</Kicker>
            <h2 className="mt-4 font-serif text-4xl text-ink-900 sm:text-5xl">Good questions deserve clear answers.</h2>
            <div className="mt-8 divide-y divide-line rounded-radius-xl border border-line bg-surface">
              {faq.map(({ q, a }) => (
                <details key={q} className="group px-6">
                  <summary className="flex cursor-pointer items-center justify-between py-5 text-sm font-bold text-ink-900 marker:hidden">
                    {q}
                    <span className="text-gold-500 transition-transform group-open:rotate-45">＋</span>
                  </summary>
                  <p className="pb-5 text-sm leading-relaxed text-ink-600">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ════ FINAL CTA ════ */}
        <section className="mx-auto max-w-[900px] px-5 py-24 text-center sm:px-8 lg:py-28">
          <Kicker>Ready to begin</Kicker>
          <h2 className="mt-4 font-serif text-4xl leading-tight text-ink-900 sm:text-5xl">
            Ready for your next Gulf opportunity?
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-ink-700">
            No perfect CV required. No inflated claims. Just a clearer path to prepare, apply and grow.
          </p>
          <Link href="/onboarding" className={cn(buttonVariants({ variant: 'primary' }), 'mt-8 text-[15px] px-6')}>
                      Get Started Free <ArrowRightIcon className="ml-1 h-4 w-4" />
          </Link>
        </section>
      </main>

      {/* ════ FOOTER ════ */}
      <footer className="border-t border-line bg-surface-2-light">
        <div className="mx-auto max-w-[1280px] px-5 py-14 sm:px-8 lg:px-12">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-radius-lg bg-forest-900 text-lg font-bold text-white">G</span>
                <span className="font-bold text-ink-900">GCC MENTOR</span>
              </div>
              <p className="mt-4 max-w-[320px] text-sm text-ink-400">Your career intelligence platform for Indian professionals targeting GCC opportunities.</p>
            </div>
            <div>
              <b className="text-sm text-ink-900">Product</b>
              <div className="mt-4 flex flex-col gap-2.5 text-sm text-ink-400">
                <Link href="/ats-scan">Free Scan</Link>
                <Link href="/onboarding">Build Profile</Link>
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