import Image from 'next/image'
import Link from 'next/link'
import type { ComponentType, ReactNode } from 'react'
import { cn, GULF_COUNTRIES } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/Button'
import { NotLiveText } from '@/components/ui/NotLive'
import { GulfFlag, isGulfFlagCountry } from '@/components/ui/GulfFlag'
import { SiteNav } from '@/components/marketing/SiteNav'
import { TemplateOrbit } from '@/components/landing/TemplateOrbit'
import { TemplateShowcase } from '@/components/landing/TemplateShowcase'
import {
  ArrowRightIcon,
  BriefcaseIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentMagnifyingGlassIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  MapPinIcon,
  QuestionMarkCircleIcon,
  RectangleStackIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'

type Icon = ComponentType<{ className?: string }>

const countries = GULF_COUNTRIES.filter((country) => country.value !== 'generic_gulf')
const heroImage = '/landing/hero-gcc-engineer.png'

const painPoints: Array<{ icon: Icon; title: string; body: string }> = [
  {
    icon: ClockIcon,
    title: 'Many applications, no replies',
    body: 'You keep applying, but recruiters stay silent. The page tells the truth: the problem is often hidden in matching, format, and Gulf-specific signals.',
  },
  {
    icon: DocumentMagnifyingGlassIcon,
    title: 'One generic CV for every job',
    body: 'A strong career can look weak when the resume is not rebuilt for the exact job description, keywords, scope, and country expectations.',
  },
  {
    icon: MapPinIcon,
    title: 'Gulf hiring has its own rules',
    body: 'Visa position, site exposure, client standards, certifications, project type, and role level all change how your profile is read.',
  },
  {
    icon: ChatBubbleLeftRightIcon,
    title: 'Shortlisted, but not confident',
    body: 'A better CV can win the call. The next challenge is answering from your real experience with confidence, structure, and technical clarity.',
  },
]

const services: Array<{
  icon: Icon
  title: string
  status: 'Live'
  body: string
  proof: string
  photo: string
  photoAlt: string
  href: string
}> = [
  {
    icon: ChartBarIcon,
    title: 'Gulf Readiness Score',
    status: 'Live',
    body: 'Upload your CV and see where you stand before you spend anything.',
    proof: 'Weak points, Gulf fit, ATS readiness, and role clarity.',
    photo: '/landing/service-readiness.png',
    photoAlt: 'Gulf career readiness score reviewed on a laptop with resume documents',
    href: '/gulf-readiness-score',
  },
  {
    icon: DocumentTextIcon,
    title: 'Job-specific optimized resume',
    status: 'Live',
    body: 'Turn one Career Profile into a resume specialized for each target job description.',
    proof: 'Reframed for Gulf recruiters and ATS systems, without inventing facts.',
    photo: '/landing/service-optimized-resume.png',
    photoAlt: 'Optimized Gulf resume and job description prepared in a professional workspace',
    href: '/signup',
  },
  {
    icon: RectangleStackIcon,
    title: 'Multiple GCC ATS templates',
    status: 'Live',
    body: 'Choose from Gulf-focused resume formats, including plain ATS-safe and photo-led styles.',
    proof: 'Fifteen templates, one profile, instant PDF rebuilds.',
    photo: '/landing/service-templates.png',
    photoAlt: 'Multiple GCC resume template layouts arranged on a premium desk',
    href: '/templates',
  },
  {
    icon: EnvelopeIcon,
    title: 'Targeted cover letter',
    status: 'Live',
    body: 'Generate a cover letter for the same role, employer tone, and optimized resume.',
    proof: 'Professional, short, technical, or explanatory tone.',
    photo: '/landing/service-cover-letter.png',
    photoAlt: 'Cover letter and optimized resume prepared together for a Gulf application',
    href: '/signup',
  },
  {
    icon: QuestionMarkCircleIcon,
    title: 'Interview Q&A generation',
    status: 'Live',
    body: 'Questions and answers based on your final optimized resume and real target role.',
    proof: 'Technical, HR, and project-experience answers from your own facts.',
    photo: '/landing/service-interview-qa.png',
    photoAlt: 'Interview questions and answers prepared from a Gulf resume and job description',
    href: '/signup',
  },
  {
    icon: ChatBubbleLeftRightIcon,
    title: 'AI mock interview feedback',
    status: 'Live',
    body: 'Practice for each optimized resume and receive an improvement report.',
    proof: 'Speaking, confidence, technical knowledge, and readiness feedback.',
    photo: '/landing/service-mock-interview.png',
    photoAlt: 'AI mock interview practice with feedback dashboard for Gulf job preparation',
    href: '/signup',
  },
]

const weakSignals = [
  { label: 'ATS format risk', value: 42, tone: 'alert' as const },
  { label: 'Missing GCC keywords', value: 56, tone: 'gold' as const },
  { label: 'Role match clarity', value: 64, tone: 'gold' as const },
  { label: 'Interview confidence', value: 48, tone: 'alert' as const },
]

const process = [
  'Upload your current CV',
  'Get Gulf Readiness and weak points',
  'Paste the target job description',
  'Generate a specialized resume',
  'Pick a GCC ATS template',
  'Create the cover letter',
  'Prepare interview Q&A and mock practice',
]

const pricing = [
  {
    name: 'Free start',
    price: 'Free',
    status: 'Live',
    items: ['Gulf Readiness Score', 'Career Profile', 'Target job setup'],
    href: '/gulf-readiness-score',
  },
  {
    name: 'Optimized Resume',
    price: 'INR 499',
    status: 'Live service',
    items: ['Resume rewritten for one JD', '15 GCC templates', 'PDF download'],
    href: '/signup',
    featured: true,
  },
  {
    name: 'Resume + Cover Letter',
    price: 'INR 999',
    status: 'Direct unlock',
    items: ['Optimized resume', 'Role-specific letter', 'Application-ready package'],
    href: '/signup',
  },
  {
    name: 'Complete Interview Prep',
    price: 'INR 2,499',
    status: 'Launch service',
    items: ['Resume-based Q&A', 'Mock interview practice', 'Detailed feedback report'],
    href: '/signup',
  },
]

function Eyebrow({ children, onDark = false }: { children: ReactNode; onDark?: boolean }) {
  return (
    <span className={cn('text-[12px] font-bold uppercase tracking-[0.16em]', onDark ? 'text-teal-soft' : 'text-teal')}>
      {children}
    </span>
  )
}

function SectionHeader({
  eyebrow,
  title,
  body,
  center = false,
  onDark = false,
}: {
  eyebrow: string
  title: string
  body?: string
  center?: boolean
  onDark?: boolean
}) {
  return (
    <div className={cn('flex flex-col gap-3', center && 'items-center text-center')}>
      <Eyebrow onDark={onDark}>{eyebrow}</Eyebrow>
      <h2
        className={cn(
          'max-w-[25ch] font-display text-[30px] font-semibold leading-[1.08] tracking-[-0.02em] sm:text-[40px]',
          onDark ? 'text-white' : 'text-ink',
        )}
      >
        {title}
      </h2>
      {body ? (
        <p className={cn('max-w-[66ch] text-[15.5px] leading-relaxed', onDark ? 'text-teal-soft/90' : 'text-ink-soft')}>
          {body}
        </p>
      ) : null}
    </div>
  )
}

function ScoreRing({ score, label }: { score: number; label: string }) {
  const radius = 45
  const circumference = 2 * Math.PI * radius

  return (
    <div className="flex items-center gap-5">
      <div className="relative size-[118px] shrink-0">
        <svg viewBox="0 0 120 120" className="size-full -rotate-90">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="#E4EEEB" strokeWidth="12" />
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="#C9962E"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${(circumference * score) / 100} ${circumference}`}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-[34px] font-semibold leading-none tabular-nums text-white">{score}</span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-teal-soft">Score</span>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-teal-soft">{label}</span>
        <span className="font-display text-[22px] font-semibold leading-tight text-white">Ready to improve</span>
        <span className="max-w-[22ch] text-[12.5px] leading-relaxed text-teal-soft/85">
          Fix format, keywords, and interview confidence first.
        </span>
      </div>
    </div>
  )
}

function MetricBar({ label, value, tone }: { label: string; value: number; tone: 'teal' | 'gold' | 'alert' }) {
  const toneClass = tone === 'teal' ? 'bg-teal' : tone === 'gold' ? 'bg-gold' : 'bg-alert'

  return (
    <div className="flex items-center gap-3">
      <span className="w-[128px] shrink-0 text-[12.5px] leading-tight text-ink-soft">{label}</span>
      <span className="h-2 flex-1 overflow-hidden rounded-full bg-line">
        <span className={cn('block h-full rounded-full', toneClass)} style={{ width: `${value}%` }} />
      </span>
      <span className="w-8 shrink-0 text-right text-[12px] font-semibold tabular-nums text-ink-muted">{value}</span>
    </div>
  )
}

function HeroCommandCenter() {
  return (
    <div
      aria-hidden="true"
      className="mx-auto mt-12 w-full max-w-[1060px] overflow-hidden rounded-card-lg border border-white/15 bg-white/[0.08] p-3 shadow-m-3 backdrop-blur"
    >
      <div className="grid gap-3 rounded-card border border-white/10 bg-canvas p-3 sm:p-4 lg:grid-cols-[0.9fr_1.2fr_0.9fr]">
        <div className="flex flex-col gap-3 rounded-card border border-line bg-white p-4 shadow-m-1">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-ink-muted">Pain detected</span>
            <span className="rounded-full bg-alert-soft px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-alert">
              Fix first
            </span>
          </div>
          <p className="font-display text-[22px] font-semibold leading-tight text-ink">Applying often, no recruiter response</p>
          <div className="flex flex-col gap-2.5 border-t border-line pt-3">
            {weakSignals.map((item) => (
              <MetricBar key={item.label} label={item.label} value={item.value} tone={item.tone} />
            ))}
          </div>
        </div>

        <div className="rounded-card border border-line bg-white p-4 shadow-m-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-teal">Optimized resume</span>
            <span className="rounded-full bg-teal-soft px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-teal">
              JD matched
            </span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-[0.75fr_1.25fr]">
            <div className="rounded-ctl bg-canvas p-3">
              <span className="block h-20 rounded-ctl bg-teal-soft" />
              <span className="mt-3 block h-2 w-3/4 rounded-full bg-line-strong" />
              <span className="mt-2 block h-1.5 w-full rounded-full bg-line" />
              <span className="mt-1.5 block h-1.5 w-5/6 rounded-full bg-line" />
            </div>
            <div className="flex flex-col gap-2">
              <span className="h-3 w-2/3 rounded-full bg-ink" />
              <span className="h-2 w-full rounded-full bg-line-strong" />
              <span className="h-2 w-[92%] rounded-full bg-line" />
              <span className="h-2 w-[96%] rounded-full bg-line" />
              <span className="h-2 w-[72%] rounded-full bg-line" />
              <div className="mt-2 rounded-ctl border border-teal/25 bg-teal-soft/60 p-3">
                <span className="block text-[11px] font-bold uppercase tracking-[0.12em] text-teal">Gulf rewrite</span>
                <span className="mt-2 block h-2 w-full rounded-full bg-teal/45" />
                <span className="mt-1.5 block h-2 w-[84%] rounded-full bg-teal/35" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="rounded-card bg-teal p-4">
            <ScoreRing score={68} label="Gulf readiness" />
          </div>
          <div className="rounded-card border border-line bg-white p-4 shadow-m-1">
            <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-ink-muted">Next service</span>
            <div className="mt-3 flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-ctl bg-gold-soft text-gold-ink">
                <EnvelopeIcon className="size-5" />
              </span>
              <div>
                <p className="font-display text-[17px] font-semibold leading-snug text-ink">Cover letter ready</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">
                  Same profile, same target job, one application package.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function BeforeAfterVisual() {
  return (
    <div aria-hidden="true" className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-card border border-line bg-white p-5 shadow-m-1">
        <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-ink-muted">Before</span>
        <p className="mt-4 font-display text-[22px] font-semibold leading-tight text-ink">Generic resume line</p>
        <p className="mt-3 text-[14px] leading-relaxed text-ink-soft">
          Responsible for site work, inspection, documentation and coordination with team.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <MetricBar label="ATS keywords" value={38} tone="alert" />
          <MetricBar label="Gulf standards" value={44} tone="alert" />
          <MetricBar label="Role match" value={51} tone="gold" />
        </div>
      </div>
      <div className="rounded-card border border-teal/30 bg-teal-soft p-5 shadow-m-2">
        <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-teal">After</span>
        <p className="mt-4 font-display text-[22px] font-semibold leading-tight text-ink">Optimized for one JD</p>
        <p className="mt-3 text-[14px] font-medium leading-relaxed text-ink">
          Coordinated site inspection, QA documentation, and vendor follow-up for EPC packages aligned with ADNOC-style handover expectations.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <MetricBar label="ATS keywords" value={82} tone="teal" />
          <MetricBar label="Gulf standards" value={76} tone="teal" />
          <MetricBar label="Role match" value={79} tone="teal" />
        </div>
      </div>
    </div>
  )
}

function WeaknessPanel() {
  const items = [
    ['Missing measurable project scope', 'Add capacity, package size, standards, or handover scope where true.'],
    ['Weak Gulf market signals', 'Clarify GCC country exposure, client standards, visa/location status, and site type.'],
    ['Interview risk', 'Prepare answers for the same resume lines you are using to win the shortlist.'],
  ]

  return (
    <div className="rounded-card border border-line bg-white p-5 shadow-m-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-ink-muted">Weak-point solver</span>
        <span className="rounded-full bg-gold-soft px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-gold-ink">
          Ranked
        </span>
      </div>
      <div className="mt-5 flex flex-col gap-3">
        {items.map(([title, body], index) => (
          <div key={title} className="grid grid-cols-[32px_1fr] gap-3 rounded-ctl border border-line bg-canvas p-3.5">
            <span className="flex size-8 items-center justify-center rounded-full bg-teal font-display text-[13px] font-semibold text-white">
              {index + 1}
            </span>
            <span>
              <span className="block text-[14px] font-semibold leading-snug text-ink">{title}</span>
              <span className="mt-1 block text-[12.5px] leading-relaxed text-ink-soft">{body}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function InterviewPreview() {
  const rows: Array<readonly [label: string, value: number, tone: 'teal' | 'gold' | 'alert']> = [
    ['Technical knowledge', 72, 'teal'],
    ['Confidence', 54, 'gold'],
    ['Speaking clarity', 61, 'gold'],
    ['Role evidence', 68, 'teal'],
  ]

  return (
    <div className="rounded-card border border-teal/25 bg-white p-5 shadow-m-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-teal">Interview prep suite</span>
          <p className="mt-2 font-display text-[24px] font-semibold leading-tight text-ink">Practice from the resume you will actually send.</p>
        </div>
        <span className="rounded-full bg-teal-soft px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-teal">
          Live
        </span>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-ctl bg-canvas p-4">
          <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-ink-muted">Sample Q&A</span>
          <p className="mt-3 text-[14px] font-semibold leading-relaxed text-ink">
            Tell me about your most relevant GCC-style handover experience.
          </p>
          <p className="mt-3 border-l-2 border-teal pl-3 text-[13px] leading-relaxed text-ink-soft">
            Answer from your optimized resume: project scope, technical action, standard followed, measurable result, and what you personally owned.
          </p>
        </div>
        <div className="flex flex-col gap-2.5">
          {rows.map(([label, value, tone]) => (
            <MetricBar key={label} label={label} value={value} tone={tone} />
          ))}
          <p className="mt-2 rounded-ctl bg-teal-soft px-3 py-2 text-[12.5px] leading-relaxed text-teal">
            Detailed feedback report after each practice round, so the next real interview feels less unknown.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <div className="w-full overflow-x-clip bg-canvas font-redesign-sans text-ink">
      <SiteNav />
      <main>
        <section className="relative overflow-hidden bg-teal">
          <Image
            src={heroImage}
            alt="Gulf engineering professional in a helmet inside a premium project office"
            fill
            priority
            sizes="100vw"
            className="object-cover object-[63%_center]"
          />
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-teal via-teal/88 to-teal/20" />
          <div aria-hidden="true" className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:52px_52px]" />
          <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-teal to-transparent" />
          <div className="relative mx-auto max-w-[1240px] px-5 pb-16 pt-16 text-left sm:px-8 lg:px-12 lg:pb-24 lg:pt-24">
            <Eyebrow onDark>GCC resume, cover letter, and interview readiness</Eyebrow>
            <h1 className="mt-5 max-w-[13ch] font-display text-[40px] font-semibold leading-[1.02] tracking-[-0.03em] text-white sm:text-[60px] lg:text-[72px]">
              Stop applying blindly to Gulf jobs.
            </h1>
            <p className="mt-5 max-w-[56ch] text-[16.5px] leading-relaxed text-teal-soft/95 sm:text-[18px]">
              Check your Gulf readiness, fix weak points, create a specialized resume for every job description, generate the cover letter, and prepare for the interview with confidence.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/gulf-readiness-score" className={cn(buttonVariants({ variant: 'primary' }), 'px-7 text-[15px]')}>
                Check my Gulf Readiness Free <ArrowRightIcon className="size-4" />
              </Link>
              <Link
                href="/signup"
                className={cn(buttonVariants({ variant: 'secondary' }), 'border-white/25 bg-white/10 px-7 text-[15px] text-white hover:bg-white/20')}
              >
                Build optimized resume
              </Link>
            </div>
            <p className="mt-4 text-[13px] text-teal-soft/75">
              No card for the score. No fake experience. Built for Saudi Arabia, UAE, Qatar, Oman, Kuwait, and Bahrain.
            </p>

            <HeroCommandCenter />

            <ul className="mt-7 flex max-w-[760px] flex-wrap items-center gap-x-5 gap-y-3">
              {countries.map((country) =>
                isGulfFlagCountry(country.value) ? (
                  <li key={country.value} className="flex items-center gap-2 text-[13px] font-semibold text-teal-soft/85">
                    <GulfFlag country={country.value} className="h-5 w-[30px] ring-white/25" />
                    {country.label}
                  </li>
                ) : null,
              )}
            </ul>
          </div>
        </section>

        <section id="pain" className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
          <SectionHeader
            eyebrow="Pain point solver"
            title="The silence after applying is not random."
            body="GCC Mentor is designed around the problems job seekers feel every week: many applications, no recruiter replies, weak ATS fit, generic cover letters, and interview fear after the shortlist."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {painPoints.map((point) => (
              <article key={point.title} className="rounded-card border border-line bg-white p-5 shadow-m-1">
                <span className="flex size-11 items-center justify-center rounded-ctl bg-teal-soft text-teal">
                  <point.icon className="size-5" />
                </span>
                <h3 className="mt-4 font-display text-[18px] font-semibold leading-snug text-ink">{point.title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink-soft">{point.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="services" className="border-y border-line bg-white">
          <div className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
            <SectionHeader
              center
              eyebrow="Services"
              title="One system for resume, cover letter, weak points, and interview readiness."
              body="GCC Mentor brings the full application path into one platform: readiness score, Career Profile, job-description resume optimization, GCC templates, cover letter, interview Q&A, and mock interview feedback."
            />
            <p className="mx-auto mt-4 max-w-[64ch] text-center text-[12.5px] leading-relaxed text-ink-muted">
              Custom service visuals show the intended GCC Mentor workflows. The product screens and template previews show the actual platform experience.
            </p>
            <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {services.map((service) => (
                <article
                  key={service.title}
                  className={cn(
                    'flex min-h-[430px] flex-col overflow-hidden rounded-card border shadow-m-1',
                    'border-line bg-white',
                  )}
                >
                  <div className="relative h-40 overflow-hidden bg-teal">
                    <Image
                      src={service.photo}
                      alt={service.photoAlt}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-teal/80 via-teal/15 to-transparent" />
                    <span
                      className={cn(
                        'absolute bottom-3 left-3 flex size-11 items-center justify-center rounded-ctl border border-white/25 bg-white/90',
                        'text-teal',
                      )}
                    >
                      <service.icon className="size-5" />
                    </span>
                    <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-teal shadow-m-1">
                      Live
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="font-display text-[21px] font-semibold leading-tight text-ink">{service.title}</h3>
                    <p className="mt-3 text-[14px] leading-relaxed text-ink-soft">{service.body}</p>
                    <p className="mt-4 border-l-2 border-teal pl-3 text-[13px] leading-relaxed text-ink-soft">{service.proof}</p>
                    <Link
                      href={service.href}
                      className={cn(buttonVariants({ variant: service.title === 'Gulf Readiness Score' ? 'primary' : 'secondary', size: 'sm' }), 'mt-auto w-fit')}
                    >
                      {service.title === 'Gulf Readiness Score' ? 'Start free' : 'Open service'}
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="optimizer" className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
            <div>
              <SectionHeader
                eyebrow="Specialized resume"
                title="Quick optimized resumes for each job description."
                body="A job in Dubai construction, a Saudi Aramco-style EPC role, and a Qatar operations role should not receive the same resume. GCC Mentor keeps your real Career Profile once, then rewrites the presentation for each target JD."
              />
              <div className="mt-7 flex flex-col gap-3">
                {[
                  'Matches the target JD and recruiter keywords.',
                  'Highlights Gulf-relevant standards, projects, and scope.',
                  'Shows what changed so the user can trust the result.',
                  'Never adds a fake job, fake certification, or fake date.',
                ].map((item) => (
                  <p key={item} className="flex gap-3 text-[14px] leading-relaxed text-ink-soft">
                    <CheckCircleIcon className="mt-0.5 size-5 shrink-0 text-teal" />
                    {item}
                  </p>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-5">
              <TemplateOrbit />
              <BeforeAfterVisual />
            </div>
          </div>
        </section>

        <section id="templates" className="border-y border-line bg-white">
          <div className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
              <div>
                <SectionHeader
                  eyebrow="GCC ATS templates"
                  title="Multiple resume formats made for Gulf applications."
                  body="Some jobs need plain ATS formatting. Some Gulf employers expect a polished photo-led profile. The page shows both, using the same real resume renderer that creates the user's PDF."
                />
                <div className="mt-7 rounded-card border border-line bg-canvas p-5">
                  <p className="text-[13.5px] leading-relaxed text-ink-soft">
                    The preview is not a fake marketing image. It renders from the same template engine used inside the product.
                  </p>
                </div>
              </div>
              <TemplateShowcase />
            </div>
          </div>
        </section>

        <section id="readiness" className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <WeaknessPanel />
            <div>
              <SectionHeader
                eyebrow="Weak points and readiness"
                title="Show the user what is blocking replies."
                body="The free score should feel useful even before signup: not just a number, but what to repair first so every next application becomes stronger."
              />
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {['ATS readiness', 'Gulf hiring fit', 'Role match', 'Keyword gaps', 'Profile clarity', 'Interview readiness'].map((item) => (
                  <div key={item} className="rounded-ctl border border-line bg-white px-4 py-3 text-[13.5px] font-semibold text-ink shadow-m-1">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="interview" className="border-y border-line bg-white">
          <div className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
              <div>
                <SectionHeader
                  eyebrow="Interview confidence"
                  title="Q&A and mock interviews should come from the optimized resume."
                  body="Once the resume wins attention, interview prep uses the same real job description and the same final resume, so the candidate is ready to defend every line with confidence."
                />
                <div className="mt-5 rounded-card border border-teal/25 bg-teal-soft p-5">
                  <p className="text-[13.5px] leading-relaxed text-teal">
                    Built for launch as a live service: resume-based Q&A, AI mock interview practice, and feedback on speaking, confidence, technical knowledge, and role evidence.
                  </p>
                </div>
              </div>
              <InterviewPreview />
            </div>
          </div>
        </section>

        <section id="journey" className="mx-auto max-w-[1040px] px-5 py-20 sm:px-8 lg:py-24">
          <SectionHeader
            center
            eyebrow="Conversion journey"
            title="The user always knows the next step."
            body="The landing page should not sell isolated tools. It should show one application path from CV upload to confident interview preparation."
          />
          <ol className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
            {process.map((step, index) => (
              <li key={step} className="rounded-card border border-line bg-white p-4 shadow-m-1">
                <span className="font-display text-[22px] font-semibold text-teal">{String(index + 1).padStart(2, '0')}</span>
                <p className="mt-3 text-[13px] font-semibold leading-snug text-ink">{step}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="trust" className="bg-teal">
          <div className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
            <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
              <SectionHeader
                onDark
                eyebrow="Trust signals"
                title="Built for a market where job seekers are tired of empty promises."
                body="The product should stay direct: no fake testimonials, no invented placement statistics, no fake experience, no passport-number collection, and clear payment-state labels until checkout is ready."
              />
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  ['No invented facts', 'Resume lines must come from the user profile.'],
                  ['No card for free score', 'Start with readiness before paying.'],
                  ['GCC-first language', 'Saudi, UAE, Qatar, Oman, Kuwait, Bahrain.'],
                  ['Private career data', 'Profile, resume, and photo handling stay user-owned.'],
                ].map(([title, body]) => (
                  <div key={title} className="rounded-card border border-white/12 bg-white/[0.06] p-5">
                    <ShieldCheckIcon className="size-5 text-gold" />
                    <h3 className="mt-4 font-display text-[18px] font-semibold text-white">{title}</h3>
                    <p className="mt-2 text-[13px] leading-relaxed text-teal-soft/85">{body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="border-b border-line bg-white">
          <div className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
            <SectionHeader
              center
              eyebrow="Pricing"
              title="Start free, then pay only when you need the application package."
              body="Card checkout is still being prepared, so the landing page should be transparent about what is live and what requires direct unlock."
            />
            <p className="mx-auto mt-4 max-w-[62ch] text-center text-[14px] leading-relaxed text-ink-soft">
              <NotLiveText>Checkout is not live yet.</NotLiveText> Free readiness works today; paid services should be presented honestly until payment is ready.
            </p>
            <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {pricing.map((plan) => (
                <article
                  key={plan.name}
                  className={cn(
                    'flex min-h-[330px] flex-col rounded-card border bg-white p-6 shadow-m-1',
                    plan.featured && 'border-teal shadow-m-2 ring-1 ring-teal/20',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="rounded-full bg-canvas px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
                      {plan.status}
                    </span>
                    {plan.featured ? (
                      <span className="rounded-full bg-teal-soft px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-teal">
                        Popular
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-5 font-display text-[21px] font-semibold text-ink">{plan.name}</h3>
                  <p className="mt-3 font-display text-[32px] font-semibold leading-none text-ink">{plan.price}</p>
                  <ul className="mt-6 flex flex-col gap-2.5">
                    {plan.items.map((item) => (
                      <li key={item} className="flex gap-2 text-[13.5px] leading-snug text-ink-soft">
                        <CheckCircleIcon className="mt-px size-4 shrink-0 text-teal" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  {plan.href ? (
                    <Link
                      href={plan.href}
                      className={cn(buttonVariants({ variant: plan.featured ? 'primary' : 'secondary', size: 'sm' }), 'mt-auto')}
                    >
                      {plan.price === 'Free' ? 'Start free' : 'Get started'}
                    </Link>
                  ) : (
                    <span className="mt-auto text-[12.5px] font-semibold text-alert">Planned, not available today</span>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="mx-auto max-w-[900px] px-5 py-20 sm:px-8 lg:py-24">
          <SectionHeader center eyebrow="FAQ" title="Answer the trust questions before they become objections." />
          <div className="mt-10 flex flex-col gap-3">
            {[
              ['Is this only a CV builder?', 'No. The landing page positions GCC Mentor as a guided path: readiness score, weak-point analysis, JD-specific resume, GCC templates, cover letter, Q&A generation, and mock interview feedback.'],
              ['Will it add fake experience?', 'No. The product should keep saying this clearly: it improves framing and relevance, but does not invent jobs, dates, skills, or certifications.'],
              ['Are Q&A and mock interviews live?', 'Yes. They are presented as launch services on this page: Q&A from the optimized resume and job description, plus mock interview feedback for confidence, speaking, and technical readiness.'],
              ['What should the main CTA be?', 'The strongest CTA is the free Gulf Readiness Score because it gives value immediately and starts the rest of the product journey.'],
            ].map(([question, answer]) => (
              <details key={question} className="group rounded-card border border-line bg-white px-5 py-4 shadow-m-1 open:shadow-m-2">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-[16px] font-semibold text-ink marker:hidden">
                  {question}
                  <span aria-hidden="true" className="shrink-0 text-[20px] leading-none text-teal transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-[14px] leading-relaxed text-ink-soft">{answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="border-t border-line bg-teal">
          <div className="mx-auto flex max-w-[900px] flex-col items-center gap-6 px-5 py-20 text-center sm:px-8 lg:py-24">
            <BriefcaseIcon className="size-10 text-gold" />
            <h2 className="max-w-[21ch] font-display text-[34px] font-semibold leading-[1.08] tracking-[-0.02em] text-white sm:text-[44px]">
              Start with the score. Build the application from there.
            </h2>
            <p className="max-w-[56ch] text-[16px] leading-relaxed text-teal-soft/90">
              One upload can show the weak points, start the Career Profile, and lead into a resume built for the next GCC job description.
            </p>
            <Link href="/gulf-readiness-score" className={cn(buttonVariants({ variant: 'primary' }), 'px-8 text-[15px]')}>
              Check my Gulf Readiness Free <ArrowRightIcon className="size-4" />
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}
