import Image from 'next/image'
import Link from 'next/link'
import type { ComponentType, ReactNode } from 'react'
import { cn, GULF_COUNTRIES } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/Button'
import { NotLiveText } from '@/components/ui/NotLive'
import { GulfFlag, isGulfFlagCountry } from '@/components/ui/GulfFlag'
import { AppFooter } from '@/components/layout/AppFooter'
import { SiteNav } from '@/components/marketing/SiteNav'
import { PainPointCarousel } from '@/components/landing/PainPointCarousel'
import { TemplateOrbit } from '@/components/landing/TemplateOrbit'
import { TemplateShowcase } from '@/components/landing/TemplateShowcase'
import {
  ArrowRightIcon,
  BriefcaseIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  QuestionMarkCircleIcon,
  RectangleStackIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'

type Icon = ComponentType<{ className?: string }>

const countries = GULF_COUNTRIES.filter((country) => country.value !== 'generic_gulf')
const heroImage = '/landing/hero-gcc-engineer.png'

const services: Array<{
  icon: Icon
  title: string
  status: 'Live' | 'Planned'
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
    proof: 'Strengths, gaps, and practical next steps for your Gulf job search.',
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
    body: 'Choose from Gulf-focused resume formats, including simple ATS-friendly and optional photo layouts.',
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
    proof: 'Choose a tone, review the draft, and keep it with your target job.',
    photo: '/landing/service-cover-letter.png',
    photoAlt: 'Cover letter and optimized resume prepared together for a Gulf application',
    href: '/signup',
  },
  {
    icon: QuestionMarkCircleIcon,
    title: 'Interview Q&A generation',
    status: 'Planned',
    body: 'Planned: practice questions based on your optimized resume and target job.',
    proof: 'Not available yet. No interview Q&A is included in current purchases.',
    photo: '/landing/service-interview-qa.png',
    photoAlt: 'Interview questions and answers prepared from a Gulf resume and job description',
    href: '/signup',
  },
  {
    icon: ChatBubbleLeftRightIcon,
    title: 'AI mock interview feedback',
    status: 'Planned',
    body: 'Planned: practise answering interview questions and review your responses.',
    proof: 'Not available yet. Practice modes and feedback details will be confirmed at release.',
    photo: '/landing/service-mock-interview.png',
    photoAlt: 'AI mock interview practice with feedback dashboard for Gulf job preparation',
    href: '/signup',
  },
]

const process = [
  'Upload your current CV',
  'Get Gulf Readiness and weak points',
  'Paste the target job description',
  'Generate a specialized resume',
  'Pick a GCC ATS template',
  'Create the cover letter',
]

const pricing = [
  {
    name: 'Check your readiness',
    price: 'Free',
    status: 'Start here',
    items: ['Gulf Readiness Score', 'Strengths and gaps', 'No account needed for the score'],
    href: '/gulf-readiness-score',
    featured: false,
  },
  {
    name: 'Build your application',
    price: 'See options in app',
    status: 'Available services',
    items: ['Resume tailored to a job description', 'GCC template choices', 'Cover letter options'],
    href: '/signup',
    featured: true,
  },
  {
    name: 'Interview preparation',
    price: 'Planned',
    status: 'Not available yet',
    items: ['Resume-based Q&A', 'Mock interview practice', 'Feedback on your answers'],
    href: '',
    featured: false,
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
          'max-w-[335px] font-display text-[28px] font-semibold leading-[1.08] tracking-[-0.02em] sm:max-w-[25ch] sm:text-[40px]',
          onDark ? 'text-white' : 'text-ink',
        )}
      >
        {title}
      </h2>
      {body ? (
        <p className={cn('max-w-[320px] text-[15.5px] leading-relaxed sm:max-w-[66ch]', onDark ? 'text-teal-soft/90' : 'text-ink-soft')}>
          {body}
        </p>
      ) : null}
    </div>
  )
}

function MetricBar({ label, value, tone }: { label: string; value: number; tone: 'teal' | 'gold' | 'alert' }) {
  const toneClass = tone === 'teal' ? 'bg-teal' : tone === 'gold' ? 'bg-gold' : 'bg-alert'

  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="w-[110px] shrink-0 text-[12.5px] leading-tight text-ink-soft">{label}</span>
      <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-line">
        <span className={cn('block h-full rounded-full', toneClass)} style={{ width: `${value}%` }} />
      </span>
      <span className="w-8 shrink-0 text-right text-[12px] font-semibold tabular-nums text-ink-muted">{value}</span>
    </div>
  )
}

function BeforeAfterVisual() {
  return (
    <div className="grid min-w-0 gap-4 sm:grid-cols-2">
      <div className="rounded-card border border-line bg-white p-5 shadow-m-1">
        <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-ink-muted">Before</span>
        <p className="mt-4 font-display text-[22px] font-semibold leading-tight text-ink">Generic resume line</p>
        <p className="mt-3 text-[14px] leading-relaxed text-ink-soft">
          Responsible for site work, inspection, documentation and coordination with team.
        </p>

      </div>
      <div className="rounded-card border border-teal/30 bg-teal-soft p-5 shadow-m-2">
        <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-teal">After</span>
        <p className="mt-4 font-display text-[22px] font-semibold leading-tight text-ink">Clearer wording</p>
        <p className="mt-3 text-[14px] font-medium leading-relaxed text-ink">
          Coordinated site inspections and maintained documentation, keeping the team informed of progress and follow-up actions.
        </p>

      </div>
    </div>
  )
}

function WeaknessPanel() {
  const items = [
    ['Missing measurable project scope', 'Add capacity, package size, standards, or handover scope where true.'],
    ['Weak Gulf market signals', 'Clarify GCC country exposure, client standards, visa/location status, and site type.'],
    ['Unclear responsibilities', 'Explain what you personally delivered, using details you can support.'],
  ]

  return (
    <div className="rounded-card border border-line bg-white p-5 shadow-m-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-ink-muted">Weak-point solver</span>
        <span className="rounded-full bg-gold-soft px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-gold-ink">
          Example
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
          Planned
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
            Illustrative feedback only. This planned feature is not available to use or purchase.
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
        <section className="relative border-b border-line bg-canvas">
          <div className="mx-auto grid max-w-[1240px] items-center gap-10 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:px-12 lg:py-20">
            <div className="min-w-0">
              <Eyebrow>Built for your next Gulf opportunity</Eyebrow>
              <h1 className="mt-5 max-w-[16ch] font-display text-[38px] font-semibold leading-[1.08] tracking-[-0.03em] text-ink sm:text-[54px] lg:text-[60px]">
                Your experience.<br /><span className="text-teal">A stronger Gulf application.</span>
              </h1>
              <p className="mt-5 max-w-[52ch] text-[16px] leading-relaxed text-ink-soft sm:text-[18px]">
                Check your Gulf readiness, tailor your resume to each job description, and create a matching cover letter. Present your real skills clearly, so employers can see where you fit.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:items-start">
                <Link href="/gulf-readiness-score" className={cn(buttonVariants({ variant: 'primary' }), 'w-full whitespace-normal px-5 text-center text-[15px] sm:w-auto')}>
                  Check my readiness — free <ArrowRightIcon className="size-4 shrink-0" />
                </Link>
                <Link href="/signup" className={cn(buttonVariants({ variant: 'secondary' }), 'w-full sm:w-auto')}>
                  Create my career profile
                </Link>
              </div>
              <p className="mt-4 text-[13px] leading-relaxed text-ink-muted">
                No signup or card needed for the free score. Interview Q&amp;A and mock interviews are planned.
              </p>
              <ul className="mt-7 flex flex-wrap gap-x-4 gap-y-3 border-t border-line pt-5">
                {countries.map((country) =>
                  isGulfFlagCountry(country.value) ? (
                    <li key={country.value} className="flex items-center gap-2 text-[12px] font-semibold text-ink-soft">
                      <GulfFlag country={country.value} className="h-4 w-6" />
                      {country.label}
                    </li>
                  ) : null,
                )}
              </ul>
            </div>
            <div className="min-w-0 rounded-card-lg border border-line bg-white p-3 shadow-m-3 sm:p-4">
              <div className="relative aspect-[4/3] overflow-hidden rounded-card bg-teal-soft">
                <Image src={heroImage} alt="Illustration of a Gulf engineering professional at work" fill priority sizes="(min-width: 1024px) 45vw, 100vw" className="object-cover object-[65%_center]" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-teal to-transparent px-5 pb-5 pt-16">
                  <p className="font-display text-[23px] font-semibold leading-tight text-white">One profile. Every target job.</p>
                </div>
              </div>
              <p className="px-2 pb-2 pt-4 text-[11px] font-bold uppercase tracking-[0.12em] text-ink-muted">Your application, organised</p>
              <div className="grid gap-2">
                {[
                  ['01', 'Check your Gulf readiness', 'Understand your strengths and gaps.'],
                  ['02', 'Tailor your resume', 'Highlight relevant experience for the job.'],
                  ['03', 'Add your cover letter', 'Keep the application together in your library.'],
                ].map(([number, title, body]) => (
                  <div key={number} className="flex items-start gap-3 rounded-ctl bg-canvas p-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-ctl bg-teal-soft text-[12px] font-bold text-teal">{number}</span>
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-ink">{title}</p>
                      <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-soft">{body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="pain" className="mx-auto max-w-[1240px] px-5 py-12 sm:px-8 sm:py-16 lg:px-12 lg:py-24">
          <SectionHeader
            eyebrow="Sound familiar?"
            title="Good experience deserves a clearer application."
            body="A generic CV can hide your strongest skills. Start with what you can improve: relevant experience, clear formatting, and a message written for the role."
          />
          <PainPointCarousel />
        </section>

        <section id="services" className="border-y border-line bg-white">
          <div className="mx-auto max-w-[1240px] px-5 py-12 sm:px-8 sm:py-16 lg:px-12 lg:py-24">
            <SectionHeader
              center
              eyebrow="Services"
              title="Build a complete application, one step at a time."
              body="Your Career Profile keeps your experience together. Use it to create a resume and cover letter for each target job, then manage them in your Resume Library."
            />
            <p className="mx-auto mt-4 max-w-[64ch] text-center text-[12.5px] leading-relaxed text-ink-muted">
              Service images are illustrations. Explore real template previews below. Planned services are clearly marked.
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
                      {service.status}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="font-display text-[21px] font-semibold leading-tight text-ink">{service.title}</h3>
                    <p className="mt-3 text-[14px] leading-relaxed text-ink-soft">{service.body}</p>
                    <p className="mt-4 border-l-2 border-teal pl-3 text-[13px] leading-relaxed text-ink-soft">{service.proof}</p>
                    {service.status === 'Live' ? <Link
                      href={service.href}
                      className={cn(buttonVariants({ variant: service.title === 'Gulf Readiness Score' ? 'primary' : 'secondary', size: 'sm' }), 'mt-6 w-full whitespace-normal text-center')}
                    >
                      {service.title === 'Gulf Readiness Score' ? 'Check readiness free' : service.title === 'Multiple GCC ATS templates' ? 'Explore templates' : 'Get started'}
                    </Link> : <p className="mt-auto pt-6 text-[13px] font-semibold text-ink-muted">Planned — not available yet</p>}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="optimizer" className="mx-auto max-w-[1240px] px-5 py-12 sm:px-8 sm:py-16 lg:px-12 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-start">
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
                  'Review what changed before you send your resume.',
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
              <p className="text-[12.5px] leading-relaxed text-ink-muted">Illustrative rewrite using the same facts. No added employer, certification or measured result.</p>
            </div>
          </div>
        </section>

        <section id="templates" className="border-y border-line bg-white">
          <div className="mx-auto max-w-[1240px] px-5 py-12 sm:px-8 sm:py-16 lg:px-12 lg:py-24">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] lg:items-start">
              <div>
                <SectionHeader
                  eyebrow="GCC ATS templates"
                  title="Multiple resume formats made for Gulf applications."
                  body="Choose a simple layout for online applications or an optional photo style when the employer requests it. Preview the designs and pick the one that suits your role."
                />
                <div className="mt-7 rounded-card border border-line bg-canvas p-5">
                  <p className="text-[13.5px] leading-relaxed text-ink-soft">
                    These are actual GCC Mentor templates with a fictional example CV. Switching designs keeps your experience intact.
                  </p>
                </div>
              </div>
              <TemplateShowcase />
            </div>
          </div>
        </section>

        <section id="readiness" className="mx-auto max-w-[1240px] px-5 py-12 sm:px-8 sm:py-16 lg:px-12 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <WeaknessPanel />
            <div>
              <SectionHeader
                eyebrow="Weak points and readiness"
                title="Know what to improve before you apply."
                body="Get a starting point for your Gulf job search. Read your strengths and gaps, then check your resume against a specific job description with Job Match."
              />
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                {['Career stage', 'Gulf experience', 'Qualifications', 'Certifications', 'Profile clarity', 'Target market'].map((item) => (
                  <div key={item} className="rounded-ctl border border-line bg-white px-4 py-3 text-[13.5px] font-semibold text-ink shadow-m-1">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="interview" className="border-y border-line bg-white">
          <div className="mx-auto max-w-[1240px] px-5 py-12 sm:px-8 sm:py-16 lg:px-12 lg:py-24">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
              <div>
                <SectionHeader
                  eyebrow="Planned · Interview preparation"
                  title="Prepare to explain the experience on your resume."
                  body="We plan to connect interview practice to your target job and resume, helping you structure answers around your own experience."
                />
                <div className="mt-5 rounded-card border border-teal/25 bg-teal-soft p-5">
                  <p className="text-[13.5px] leading-relaxed text-teal">
                    Interview Q&A and mock interviews are not available yet and are not included in current purchases. The preview illustrates the planned experience.
                  </p>
                </div>
              </div>
              <InterviewPreview />
            </div>
          </div>
        </section>

        <section id="journey" className="mx-auto max-w-[1040px] px-5 py-12 sm:px-8 sm:py-16 lg:py-24">
          <SectionHeader
            center
            eyebrow="How it works"
            title="From your current CV to your next application."
            body="Start with a free check. Create your profile, choose a target job, and review your documents before you apply."
          />
          <ol className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {process.map((step, index) => (
              <li key={step} className="rounded-card border border-line bg-white p-4 shadow-m-1">
                <span className="font-display text-[22px] font-semibold text-teal">{String(index + 1).padStart(2, '0')}</span>
                <p className="mt-3 text-[13px] font-semibold leading-snug text-ink">{step}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="trust" className="bg-teal">
          <div className="mx-auto max-w-[1240px] px-5 py-12 sm:px-8 sm:py-16 lg:px-12 lg:py-24">
            <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
              <SectionHeader
                onDark
                eyebrow="Your experience stays yours"
                title="A clearer application, built on real experience."
                body="Built with 15+ years of Gulf project experience. GCC Mentor helps you present relevant skills and achievements clearly. A stronger application can help employers understand your fit; interviews and job offers are never guaranteed."
              />
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  ['No invented facts', 'Drafts use the experience you provide. Review every detail before applying.'],
                  ['No card for free score', 'Start with readiness before paying.'],
                  ['GCC-first language', 'Saudi, UAE, Qatar, Oman, Kuwait, Bahrain.'],
                  ['You review the result', 'Check the wording and changes before you download and send.'],
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
          <div className="mx-auto max-w-[1240px] px-5 py-12 sm:px-8 sm:py-16 lg:px-12 lg:py-24">
            <SectionHeader
              center
              eyebrow="Pricing"
              title="Start free. Choose your next step when you are ready."
              body="Check readiness for free. Sign in to review current service options and access details before requesting a paid unlock."
            />
            <p className="mx-auto mt-4 max-w-[62ch] text-center text-[14px] leading-relaxed text-ink-soft">
              <NotLiveText>Checkout is not live yet.</NotLiveText> Paid access is arranged directly with GCC Mentor. Confirm the price and included services before paying.
            </p>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
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
                        Application tools
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-5 font-display text-[21px] font-semibold text-ink">{plan.name}</h3>
                  <p className="mt-3 font-display text-[27px] font-semibold leading-tight text-ink">{plan.price}</p>
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
                      className={cn(buttonVariants({ variant: plan.featured ? 'primary' : 'secondary', size: 'sm' }), 'mt-6 w-full whitespace-normal text-center')}
                    >
                      {plan.price === 'Free' ? 'Check readiness free' : 'View options in app'}
                    </Link>
                  ) : (
                    <span className="mt-auto text-[12.5px] font-semibold text-alert">Planned, not available today</span>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="mx-auto max-w-[900px] px-5 py-12 sm:px-8 sm:py-16 lg:py-24">
          <SectionHeader center eyebrow="FAQ" title="Questions before you get started" />
          <div className="mt-10 flex flex-col gap-3">
            {[
              ['Who is GCC Mentor for?', 'Job seekers applying in Saudi Arabia, UAE, Qatar, Oman, Kuwait and Bahrain, including people applying from India and professionals already working in the Gulf.'],
              ['What can I use today?', 'Gulf readiness, Career Profile, job-specific resume optimization, resume templates, Resume Library and cover letters are available. Access requirements are shown inside the app.'],
              ['Will it add experience I do not have?', 'Your drafts should use only the facts in your profile. Check every generated statement, date, skill and qualification before sending your application.'],
              ['Does a higher score guarantee a shortlist?', 'No. Scores are guidance, not hiring predictions or an employer ATS result. Employers make their own decisions based on the role, competition and recruitment process.'],
              ['Are Q&A and mock interviews live?', 'No. Both are planned. They are not currently available to use or included in purchases.'],
              ['Do I need a different resume for every job?', 'Keep your Career Profile as your source of facts. Tailor the emphasis and relevant experience for each job description, then keep that version and its cover letter together in your Resume Library.'],
              ['How do paid services work?', 'Card checkout is not live yet. Create an account to review current options, and confirm pricing and included services directly with GCC Mentor before paying.'],
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
            <Link href="/gulf-readiness-score" className={cn(buttonVariants({ variant: 'primary' }), 'w-full whitespace-normal px-5 text-center text-[15px] sm:w-auto')}>
              Check my readiness — free <ArrowRightIcon className="size-4" />
            </Link>
          </div>
        </section>
      </main>
      <AppFooter />
    </div>
  )
}
