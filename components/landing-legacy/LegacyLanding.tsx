import Link from 'next/link'
import type { ComponentType, ReactNode } from 'react'
import { cn, GULF_COUNTRIES } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/Button'
import { NotLiveText } from '@/components/ui/NotLive'
import { GulfFlag, isGulfFlagCountry } from '@/components/ui/GulfFlag'
import { AppFooter } from '@/components/layout/AppFooter'
import { SiteNav } from '@/components/marketing/SiteNav'
import { TemplateOrbit } from '@/components/landing/TemplateOrbit'
import { HeroPreview } from '@/components/landing/HeroPreview'
import { JourneyExplorer } from '@/components/landing/JourneyExplorer'
import { TEMPLATES } from '@/lib/templates'
import {
  ArrowRightIcon,
  ArrowDownIcon,
  BriefcaseIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  DocumentDuplicateIcon,
  DocumentMagnifyingGlassIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  FingerPrintIcon,
  GlobeAltIcon,
  KeyIcon,
  LockClosedIcon,
  MapIcon,
  QuestionMarkCircleIcon,
  RectangleStackIcon,
  ShieldCheckIcon,
  UserCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

/**
 * THE LANDING PAGE — rebuilt 2026-09-23 around one idea: one Career Profile
 * becomes the trusted source for every document a Gulf application needs.
 *
 * The order answers a first-time visitor's questions in the order they ask
 * them: what is this → who is it for → why trust it → what problem → how does
 * it work → what do I get → does it make things up → which countries → what
 * does it look like → what does it cost → objections → start.
 *
 * TRUTH RULES that shaped every line (docs/02_PHILOSOPHY.md):
 *   · No guarantee of a job, an interview, a shortlist or a salary.
 *   · Every figure in a preview is an example and says so.
 *   · No price is printed: prices while services are open are a founder
 *     decision (docs/15_DECISION_LOG.md), so the pricing band says what is
 *     free, what is an application service, and that checkout is not live.
 *   · Anchor ids are checked by scripts/verify-landing-anchors.ts against
 *     components/marketing/SiteNav.tsx.
 */

type Icon = ComponentType<{ className?: string }>

const countries = GULF_COUNTRIES.filter((country) => country.value !== 'generic_gulf')
// One source for the template count (audit M10): the registry, not copy.
const AVAILABLE_TEMPLATE_COUNT = Object.values(TEMPLATES).filter((t) => t.available).length

const TRUST_BAND: ReadonlyArray<{ icon: Icon; title: string; body: string }> = [
  { icon: FingerPrintIcon, title: 'Grounded in your profile', body: 'Documents are written from your own facts' },
  { icon: MapIcon, title: 'Built for Gulf hiring', body: 'Visa, notice, GCC projects, client standards' },
  { icon: DocumentDuplicateIcon, title: 'CV, letter and interview', body: 'One workflow for the whole application' },
  { icon: GlobeAltIcon, title: 'All six GCC countries', body: 'Saudi, UAE, Qatar, Oman, Kuwait, Bahrain' },
  { icon: ShieldCheckIcon, title: 'You approve every line', body: 'Suggested additions need your confirmation' },
]

const AUDIENCE: ReadonlyArray<{ title: string; body: string }> = [
  { title: 'Already working in the Gulf', body: 'Aiming for a better role, a bigger project or a higher package.' },
  { title: 'Moving to the Gulf', body: 'From India or elsewhere, presenting your experience the way Gulf employers read it.' },
  { title: 'Returning to the Gulf', body: 'Bringing earlier GCC experience back to the front of your CV.' },
  { title: 'Any profession', body: 'Engineering, construction, IT, finance, healthcare, operations and more.' },
]

const PROBLEMS: ReadonlyArray<{ problem: string; fix: string; icon: Icon }> = [
  { problem: 'One generic CV sent to every job', fix: 'A CV rewritten for each target job, from the same profile', icon: DocumentTextIcon },
  { problem: 'No idea whether your CV matches the job', fix: 'An ATS match score for that job, before and after', icon: DocumentMagnifyingGlassIcon },
  { problem: 'Important keywords missing', fix: 'Job keywords brought forward where your experience supports them', icon: ClipboardDocumentListIcon },
  { problem: 'A CV layout that does not suit Gulf employers', fix: `${AVAILABLE_TEMPLATE_COUNT} GCC resume templates, one click to switch`, icon: RectangleStackIcon },
  { problem: 'Cover letters that repeat the CV or say nothing', fix: 'A letter for the same job, in the tone you choose', icon: EnvelopeIcon },
  { problem: 'Walking into interviews unprepared', fix: 'Likely questions, drafted answers and written practice', icon: ChatBubbleLeftRightIcon },
  { problem: 'Typing the same details into every form', fix: 'One Career Profile that every service reads from', icon: UserCircleIcon },
  { problem: 'Not sure how ready you are for the Gulf', fix: 'A free Gulf Readiness score with what to fix first', icon: ChartBarIcon },
]

type Service = { icon: Icon; title: string; what: string; why: string; get: string; href: string; cta: string }

const SERVICE_GROUPS: ReadonlyArray<{ stage: string; note: string; services: Service[] }> = [
  {
    stage: 'Know where you stand',
    note: 'Free',
    services: [
      {
        icon: UserCircleIcon,
        title: 'Career Profile',
        what: 'Your roles, projects, skills, education and certificates in one place.',
        why: 'Every document is written only from it, so it is typed once and kept right.',
        get: 'Read from your CV in one step, then checked and corrected by you.',
        href: '/signup',
        cta: 'Create my profile',
      },
      {
        icon: ChartBarIcon,
        title: 'Gulf Readiness',
        what: 'A score across six areas Gulf employers look at.',
        why: 'Shows what to fix before you start applying.',
        get: 'Your score, your strengths, and a ranked list of fixes. No account needed.',
        href: '/gulf-readiness-score',
        cta: 'Check my readiness',
      },
    ],
  },
  {
    stage: 'Build the application',
    note: 'For each target job',
    services: [
      {
        icon: DocumentMagnifyingGlassIcon,
        title: 'Resume Optimizer',
        what: 'Your CV rewritten for one job title and job description.',
        why: 'Employers and ATS systems search for the words in their own advert.',
        get: 'An optimized CV, its ATS score before and after, and a review page to edit it.',
        href: '/signup',
        cta: 'Optimize a CV',
      },
      {
        icon: RectangleStackIcon,
        title: 'GCC resume templates',
        what: `${AVAILABLE_TEMPLATE_COUNT} layouts, from plain ATS-safe to photo-led.`,
        why: 'Different employers expect different formats.',
        get: 'Switch templates, font and colour without retyping. PDF download.',
        href: '#templates',
        cta: 'See the templates',
      },
      {
        icon: BriefcaseIcon,
        title: 'Resume Library',
        what: 'Every target job with its CV, letter and interview preparation.',
        why: 'Several applications at once stay organised.',
        get: 'One place per job, with its stage: saved, applied, interview, offer.',
        href: '/signup',
        cta: 'Get started',
      },
      {
        icon: EnvelopeIcon,
        title: 'Cover Letter',
        what: 'A letter for the same job, written from the same CV.',
        why: 'The letter and the CV should tell one consistent story.',
        get: 'Four tones: Professional, Short, Technical, Explanatory.',
        href: '/signup',
        cta: 'Get started',
      },
    ],
  },
  {
    stage: 'Prepare for the interview',
    note: 'From your optimized CV',
    services: [
      {
        icon: QuestionMarkCircleIcon,
        title: 'Interview Q&A',
        what: 'Likely questions for this job, with answers from your own experience.',
        why: 'You will be asked about every line on your CV.',
        get: 'Up to 25 questions and answers, saved with the job.',
        href: '/signup',
        cta: 'Get started',
      },
      {
        icon: ChatBubbleLeftRightIcon,
        title: 'Mock Interview',
        what: 'A written practice interview, one question at a time.',
        why: 'Practise before the answer matters.',
        get: 'A saved feedback report on technical depth, role fit and answer structure.',
        href: '/signup',
        cta: 'Get started',
      },
    ],
  },
]

const FAQ: ReadonlyArray<readonly [string, string]> = [
  [
    'Can GCC Mentor guarantee me a job or an interview?',
    'No. GCC Mentor helps you present your real experience more clearly for each job. Employers make their own decisions, and no score, CV or letter can guarantee an interview, a shortlist, an offer or a salary.',
  ],
  [
    'Does it invent skills or experience?',
    'No. Your employers, job titles, dates and education are never changed, and documents are written from your Career Profile. If a job asks for something your profile does not mention, GCC Mentor can suggest a line — it is highlighted, and it only goes into your CV if you confirm it is true for you.',
  ],
  [
    'Is it only for engineers?',
    'No. It works for any profession — engineering, construction, IT, finance, healthcare, operations, administration and others. It reads your own CV and the job you are targeting.',
  ],
  [
    'Can I use my existing CV?',
    'Yes. Upload a PDF or Word file, or paste the text. We read it into your Career Profile, and you check and correct it before anything is written from it.',
  ],
  [
    'Can I make different CVs for different jobs?',
    'Yes. Each target job gets its own optimized CV, and each one stays in your Resume Library with its cover letter and interview preparation.',
  ],
  [
    'What does Gulf Readiness measure?',
    'How clearly your CV presents what Gulf employers commonly look for: your Gulf market position, work experience, skills, education, certifications, and CV quality and targeting. It is guidance on what to improve — not a hiring prediction.',
  ],
  [
    'How does the job match work?',
    'Add a job title and, for the best result, paste the job description. GCC Mentor compares what the job asks for with your profile and shows an ATS score for your CV before and after optimizing. Without a job description the score is an estimate from the title.',
  ],
  [
    'Which countries are supported?',
    'Saudi Arabia, the UAE, Qatar, Oman, Kuwait and Bahrain. GCC Mentor is not a recruitment agency: it does not list jobs, place candidates or contact employers for you.',
  ],
  [
    'How is my information used?',
    'Your Career Profile is used to write your own documents. You choose what appears on each CV, and you can delete all your data from Settings at any time.',
  ],
  [
    'How do paid services work?',
    'Card checkout is not live yet. Create an account to see current access in the app, and confirm any price and what it includes directly with GCC Mentor before paying.',
  ],
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
          'max-w-[24ch] font-display text-[28px] font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[40px]',
          onDark ? 'text-white' : 'text-ink',
        )}
      >
        {title}
      </h2>
      {body ? (
        <p className={cn('max-w-[64ch] text-[15.5px] leading-relaxed', onDark ? 'text-teal-soft' : 'text-ink-soft')}>{body}</p>
      ) : null}
    </div>
  )
}

/** Section frame: one width, one gutter, one vertical rhythm for the whole page. */
function Band({ id, tone = 'canvas', children, className }: { id?: string; tone?: 'canvas' | 'white' | 'teal'; children: ReactNode; className?: string }) {
  return (
    <section
      id={id}
      className={cn(
        tone === 'white' && 'border-y border-line bg-white',
        tone === 'teal' && 'bg-teal',
        tone === 'canvas' && 'bg-canvas',
      )}
    >
      <div className={cn('mx-auto max-w-[1240px] px-3 py-14 sm:px-8 sm:py-20 lg:px-12 lg:py-24', className)}>{children}</div>
    </section>
  )
}

function InterviewPreview() {
  // The four dimensions the TEXT report actually scores (audit M10). "Speaking
  // clarity" and "Confidence" implied voice analysis that does not exist.
  const rows: Array<readonly [label: string, value: number, tone: 'teal' | 'gold']> = [
    ['Technical', 72, 'teal'],
    ['Role fit', 68, 'teal'],
    ['Gulf readiness', 61, 'gold'],
    ['Answer structure', 54, 'gold'],
  ]
  return (
    <div aria-hidden="true" className="overflow-hidden rounded-card-lg border border-line bg-white shadow-m-3">
      <div className="flex items-center justify-between gap-3 border-b border-line bg-canvas px-5 py-3.5">
        <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-ink">Mock interview</span>
        <span className="rounded-full bg-white px-2.5 py-1 text-[12px] font-bold uppercase tracking-[0.08em] text-ink-muted">Example</span>
      </div>
      <div className="grid gap-5 p-5 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ink text-[12px] font-bold text-white">Q</span>
            <p className="rounded-card rounded-tl-none bg-canvas px-4 py-3 text-[14px] font-semibold leading-relaxed text-ink">
              Tell me about a project where you worked to a client standard in the Gulf.
            </p>
          </div>
          <div className="flex items-start gap-2.5 pl-6">
            <p className="rounded-card rounded-tr-none border border-teal/20 bg-teal-soft px-4 py-3 text-[13px] leading-relaxed text-ink">
              Your written answer: the scope, the standard you followed, what you personally did, and the result.
            </p>
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-teal text-[12px] font-bold text-white">You</span>
          </div>
        </div>
        <div className="flex flex-col gap-2.5 rounded-card border border-line bg-canvas p-4">
          <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-ink-muted">Feedback on your answers</span>
          {rows.map(([label, value, tone]) => (
            <div key={label} className="flex min-w-0 items-center gap-2">
              <span className="w-[112px] shrink-0 text-[12.5px] leading-tight text-ink-soft">{label}</span>
              <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-line">
                <span className={cn('block h-full rounded-full', tone === 'teal' ? 'bg-teal' : 'bg-gold')} style={{ width: `${value}%` }} />
              </span>
              <span className="w-8 shrink-0 text-right text-[12px] font-semibold tabular-nums text-ink-muted">{value}</span>
            </div>
          ))}
          <p className="mt-1 text-[12px] leading-relaxed text-ink-muted">
            Written answers only — no voice recording. Preparation guidance, not a hiring prediction.
          </p>
        </div>
      </div>
    </div>
  )
}

export function LegacyLanding() {
  return (
    <div className="w-full overflow-x-clip bg-canvas font-redesign-sans text-ink">
      <SiteNav />
      <main>
        {/* ── HERO ─────────────────────────────────────────────────────── */}
        <section className="relative border-b border-line bg-canvas">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_60%_at_85%_20%,rgba(15,76,67,0.08),transparent_70%)]"
          />
          <div className="relative mx-auto grid max-w-[1240px] items-center gap-10 px-3 py-12 sm:px-8 sm:py-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-14 lg:px-12 lg:py-20">
            <div className="min-w-0">
              <Eyebrow>The career platform for Gulf jobs</Eyebrow>
              <h1 className="mt-5 max-w-[17ch] font-display text-[38px] font-semibold leading-[1.06] tracking-[-0.03em] text-ink sm:text-[54px] lg:text-[58px]">
                One career profile. <span className="text-teal">Every Gulf application, done properly.</span>
              </h1>
              <p className="mt-5 max-w-[54ch] text-[16px] leading-relaxed text-ink-soft sm:text-[18px]">
                GCC Mentor turns your real experience into a CV, cover letter and interview preparation for each job
                you target in Saudi Arabia, the UAE, Qatar, Oman, Kuwait and Bahrain — written from your own facts,
                never invented.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/gulf-readiness-score"
                  className={cn(buttonVariants({ variant: 'purchase' }), 'w-full whitespace-normal px-6 text-center text-[15px] sm:w-auto')}
                >
                  Check my Gulf readiness — free <ArrowRightIcon className="size-4 shrink-0" aria-hidden="true" />
                </Link>
                <Link href="/signup" className={cn(buttonVariants({ variant: 'secondary' }), 'w-full text-[15px] sm:w-auto')}>
                  Create my career profile
                </Link>
              </div>
              <p className="mt-4 text-[13px] leading-relaxed text-ink-muted">
                The readiness score is free, with no account or card. It takes one CV upload.
              </p>
              <ul aria-label="Supported countries" className="mt-7 flex flex-wrap gap-x-4 gap-y-3 border-t border-line pt-5">
                {countries.map((country) =>
                  isGulfFlagCountry(country.value) ? (
                    <li key={country.value} className="flex items-center gap-2 text-[12.5px] font-semibold text-ink-soft">
                      <GulfFlag country={country.value} className="h-4 w-6" />
                      {country.label}
                    </li>
                  ) : null,
                )}
              </ul>
            </div>
            <HeroPreview />
          </div>
        </section>

        {/* ── TRUST / VALUE BAND ───────────────────────────────────────── */}
        <section aria-label="What makes GCC Mentor different" className="border-b border-line bg-white">
          <ul className="mx-auto grid max-w-[1240px] gap-x-6 gap-y-5 px-3 py-8 sm:grid-cols-2 sm:px-8 lg:grid-cols-5 lg:px-12">
            {TRUST_BAND.map(({ icon: ItemIcon, title, body }) => (
              <li key={title} className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-ctl bg-teal-soft text-teal">
                  <ItemIcon className="size-5" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[14px] font-semibold leading-snug text-ink">{title}</span>
                  <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-soft">{body}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* ── WHO IT IS FOR + PROBLEMS ─────────────────────────────────── */}
        <Band id="why">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-14">
            <div className="min-w-0">
              <SectionHeader
                eyebrow="Who it is for"
                title="For professionals serious about a Gulf career."
                body="Whether you are already in the Gulf or planning your move, the problem is the same: good experience, presented in a way that does not reach the right people."
              />
              <ul className="mt-7 flex flex-col gap-3">
                {AUDIENCE.map((a) => (
                  <li key={a.title} className="flex gap-3 rounded-card border border-line bg-white p-4 shadow-m-1">
                    <CheckCircleIcon className="mt-0.5 size-5 shrink-0 text-teal" aria-hidden="true" />
                    <span>
                      <span className="block text-[14.5px] font-semibold text-ink">{a.title}</span>
                      <span className="mt-0.5 block text-[13.5px] leading-relaxed text-ink-soft">{a.body}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="min-w-0">
              <h3 className="font-display text-[22px] font-semibold leading-tight text-ink sm:text-[26px]">
                Sound familiar? Here is what changes.
              </h3>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {PROBLEMS.map(({ problem, fix, icon: ItemIcon }) => (
                  <li key={problem} className="flex flex-col overflow-hidden rounded-card border border-line bg-white shadow-m-1">
                    <p className="flex items-start gap-2.5 px-4 pb-3 pt-4 text-[13.5px] font-semibold leading-snug text-ink">
                      <XMarkIcon className="mt-px size-4 shrink-0 text-alert" aria-hidden="true" />
                      {problem}
                    </p>
                    <p className="mt-auto flex items-start gap-2.5 border-t border-line bg-teal-soft/50 px-4 py-3 text-[13px] leading-snug text-ink">
                      <ItemIcon className="mt-px size-4 shrink-0 text-teal" aria-hidden="true" />
                      <span>{fix}</span>
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Band>

        {/* ── THE COMPLETE CAREER WORKFLOW ─────────────────────────────── */}
        <Band id="journey" tone="white">
          <SectionHeader
            center
            eyebrow="How it works"
            title="From your CV to a complete application, in seven steps."
            body="Every step reads from the one before it. Your profile feeds the CV, the CV feeds the letter and the interview preparation — so everything you send agrees."
          />
          <JourneyExplorer />
        </Band>

        {/* ── SERVICES ─────────────────────────────────────────────────── */}
        <Band id="services">
          <SectionHeader
            eyebrow="Services"
            title="Everything a Gulf application needs, in one place."
            body="Not a set of separate AI tools: each service uses your Career Profile and the job you are targeting, and keeps its results with that job."
          />
          <div className="mt-10 flex flex-col gap-10">
            {SERVICE_GROUPS.map((group, gi) => (
              <div key={group.stage} className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex size-8 items-center justify-center rounded-full bg-teal font-mono text-[13px] font-semibold text-white">
                    {gi + 1}
                  </span>
                  <h3 className="font-display text-[20px] font-semibold text-ink sm:text-[22px]">{group.stage}</h3>
                  <span className="rounded-full bg-gold-soft px-2.5 py-1 text-[12px] font-bold uppercase tracking-[0.08em] text-gold-ink">
                    {group.note}
                  </span>
                </div>
                <div className={cn('mt-5 grid gap-4 md:grid-cols-2', group.services.length > 2 && 'xl:grid-cols-4')}>
                  {group.services.map((s) => (
                    <article key={s.title} className="flex flex-col rounded-card border border-line bg-white p-5 shadow-m-1">
                      <span className="flex size-11 items-center justify-center rounded-ctl bg-teal-soft text-teal">
                        <s.icon className="size-6" aria-hidden="true" />
                      </span>
                      <h4 className="mt-4 font-display text-[19px] font-semibold leading-tight text-ink">{s.title}</h4>
                      <p className="mt-2 text-[14px] leading-relaxed text-ink">{s.what}</p>
                      <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">{s.why}</p>
                      <p className="mt-3 border-l-2 border-teal pl-3 text-[13px] leading-relaxed text-ink-soft">
                        <span className="font-semibold text-ink">You get: </span>
                        {s.get}
                      </p>
                      <Link
                        href={s.href}
                        className="mt-auto inline-flex min-h-11 items-center gap-1.5 pt-4 text-[14px] font-semibold text-teal underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
                      >
                        {s.cta} <ArrowRightIcon className="size-4" aria-hidden="true" />
                      </Link>
                    </article>
                  ))}
                </div>
              </div>
            ))}
            <p className="text-[13px] text-ink-muted">
              <NotLiveText>Planned:</NotLiveText> Saved Jobs, to keep roles you want to apply to. Not available yet.
            </p>
          </div>
        </Band>

        {/* ── BEFORE / AFTER ───────────────────────────────────────────── */}
        <Band id="before-after" tone="white">
          <SectionHeader
            center
            eyebrow="Generic to targeted"
            title="The same experience, written for the job you want."
            body="GCC Mentor does not change what you did. It changes how clearly your CV shows it to this employer."
          />
          <ol className="mx-auto mt-10 grid max-w-[1040px] gap-2 sm:grid-cols-5">
            {['Your generic CV', 'Match the job description', 'See the gaps', 'Optimize truthfully', 'A targeted Gulf CV'].map(
              (label, i, all) => (
                <li key={label} className="flex items-center gap-2 sm:flex-col sm:text-center">
                  <span
                    className={cn(
                      'flex size-10 shrink-0 items-center justify-center rounded-full border-2 font-mono text-[13px] font-semibold',
                      i === all.length - 1 ? 'border-teal bg-teal text-white' : 'border-teal/40 bg-white text-teal',
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className="text-[13.5px] font-semibold leading-snug text-ink">{label}</span>
                  {i < all.length - 1 ? <ArrowDownIcon className="ml-auto size-4 text-ink-muted sm:hidden" aria-hidden="true" /> : null}
                </li>
              ),
            )}
          </ol>
          <div className="mx-auto mt-10 grid max-w-[1040px] gap-4 md:grid-cols-2">
            <div className="rounded-card border border-line bg-canvas p-5 sm:p-6">
              <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-ink-muted">Before · generic</span>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
                Responsible for electrical and instrumentation activities at site. Worked with the team on testing and
                completed tasks as assigned.
              </p>
              <ul className="mt-4 flex flex-col gap-1.5 text-[13px] text-ink-soft">
                <li>· No keywords from the job advert</li>
                <li>· Your own role is unclear</li>
                <li>· Nothing a recruiter can search for</li>
              </ul>
            </div>
            <div className="rounded-card border-2 border-teal bg-white p-5 shadow-m-2 sm:p-6">
              <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-teal">After · for this job</span>
              <p className="mt-3 text-[15px] leading-relaxed text-ink">
                Led <mark className="rounded bg-ok-soft px-0.5 text-ink">E&amp;I testing</mark> and{' '}
                <mark className="rounded bg-[#DCEAF7] px-0.5 font-semibold text-sec-status">pre-commissioning</mark> on
                site, coordinating <mark className="rounded bg-ok-soft px-0.5 text-ink">loop checks</mark> with the
                client team through to handover.
              </p>
              <ul className="mt-4 flex flex-col gap-1.5 text-[13px] text-ink-soft">
                <li className="flex gap-2"><span className="mt-1 size-2.5 shrink-0 rounded-sm bg-ok-soft ring-1 ring-ok/40" />Green: reworded from your own profile</li>
                <li className="flex gap-2"><span className="mt-1 size-2.5 shrink-0 rounded-sm bg-[#DCEAF7] ring-1 ring-sec-status/40" />Blue: a keyword from the job description</li>
                <li className="flex gap-2"><span className="mt-1 size-2.5 shrink-0 rounded-sm bg-gold-soft ring-1 ring-gold/60" />Yellow: a suggestion — only kept if you confirm it is true</li>
              </ul>
            </div>
          </div>
          <p className="mx-auto mt-6 max-w-[62ch] text-center text-[13px] leading-relaxed text-ink-muted">
            Example text. The review page shows your own CV in these colours so you can see, edit and approve every change.
          </p>
        </Band>

        {/* ── TRUST / GROUNDING ────────────────────────────────────────── */}
        <Band id="trust" tone="teal">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
            <SectionHeader
              onDark
              eyebrow="Why you can trust it"
              title="Your Career Profile is the source of truth."
              body="Generic AI writers fill gaps with whatever sounds good. GCC Mentor works the other way round: it writes only from what your profile says, checks the result, and shows you anything new before it can reach your CV."
            />
            <ul className="grid gap-4 sm:grid-cols-2">
              {[
                { icon: LockClosedIcon, title: 'Facts stay fixed', body: 'Employers, job titles, dates and education are never rewritten.' },
                { icon: ShieldCheckIcon, title: 'Checked against your profile', body: 'Generated lines are checked, and claims your profile does not support are not used.' },
                { icon: KeyIcon, title: 'You confirm additions', body: 'Suggested lines for missing requirements are highlighted and need your confirmation.' },
                { icon: CheckCircleIcon, title: 'You review before you send', body: 'Edit any line, then download. Delete all your data from Settings at any time.' },
              ].map(({ icon: ItemIcon, title, body }) => (
                <li key={title} className="rounded-card border border-white/15 bg-white/[0.07] p-5">
                  <ItemIcon className="size-6 text-gold" aria-hidden="true" />
                  <h3 className="mt-3 font-display text-[18px] font-semibold text-white">{title}</h3>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-teal-soft">{body}</p>
                </li>
              ))}
            </ul>
          </div>
        </Band>

        {/* ── GCC MARKETS ──────────────────────────────────────────────── */}
        <Band id="markets">
          <SectionHeader
            center
            eyebrow="Six GCC markets"
            title="Written for how Gulf employers read a CV."
            body="Visa and notice status, GCC project exposure, client and industry standards, certifications and measurable scope — the details Gulf recruiters look for, presented clearly."
          />
          <ul className="mx-auto mt-10 grid max-w-[980px] grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {countries.map((country) =>
              isGulfFlagCountry(country.value) ? (
                <li key={country.value} className="flex flex-col items-center gap-3 rounded-card border border-line bg-white px-3 py-5 shadow-m-1">
                  <GulfFlag country={country.value} className="h-8 w-12 rounded-[3px] shadow-m-1" />
                  <span className="text-[14px] font-semibold text-ink">{country.label}</span>
                </li>
              ) : null,
            )}
          </ul>
          <p className="mx-auto mt-6 max-w-[62ch] text-center text-[13px] leading-relaxed text-ink-muted">
            GCC Mentor prepares your application. It is not a recruitment agency and does not list jobs, place candidates
            or promise employment in any country.
          </p>
        </Band>

        {/* ── TEMPLATES (real renders) ─────────────────────────────────── */}
        <section id="templates" className="border-y border-line bg-white">
          <div className="py-14 sm:py-20 lg:py-24">
            <TemplateOrbit />
          </div>
        </section>

        {/* ── INTERVIEW PREPARATION ────────────────────────────────────── */}
        <Band id="interview">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-center">
            <div className="min-w-0">
              <SectionHeader
                eyebrow="Interview preparation"
                title="Prepared from the CV you actually sent."
                body="Questions and practice are built for this job, not from a generic list — so what you say in the interview matches what is on your CV."
              />
              <div className="mt-6 rounded-card border border-line bg-white p-5 shadow-m-1">
                <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink-muted">Generated using</p>
                <ul className="mt-3 flex flex-col gap-2.5">
                  {['Your Career Profile', 'The target job and its description', 'Your optimized CV for that job'].map((x) => (
                    <li key={x} className="flex items-center gap-2.5 text-[14px] font-medium text-ink">
                      <CheckCircleIcon className="size-5 shrink-0 text-teal" aria-hidden="true" />
                      {x}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 border-t border-line pt-3 text-[13px] leading-relaxed text-ink-soft">
                  Interview Q&amp;A gives up to 25 questions with drafted answers. The mock interview is written, one
                  question at a time, and saves a feedback report with the job.
                </p>
              </div>
            </div>
            <InterviewPreview />
          </div>
        </Band>

        {/* ── PRICING ──────────────────────────────────────────────────── */}
        <Band id="pricing" tone="white">
          <SectionHeader
            center
            eyebrow="Pricing"
            title="Start free. Add the application services when you need them."
            body="The readiness score and your Career Profile are free. Services that write documents for a specific job are the application services."
          />
          <div className="mx-auto mt-10 grid max-w-[1040px] gap-5 md:grid-cols-2">
            <article className="flex flex-col rounded-card border border-line bg-white p-6 shadow-m-1">
              <span className="self-start rounded-full bg-ok-soft px-2.5 py-1 text-[12px] font-bold uppercase tracking-[0.08em] text-ok">Free</span>
              <h3 className="mt-4 font-display text-[22px] font-semibold text-ink">Know where you stand</h3>
              <ul className="mt-5 flex flex-col gap-2.5">
                {[
                  'Gulf Readiness score — no account or card',
                  'Career Profile, read from your CV (free account)',
                  'Strengths, gaps and what to fix first',
                  `Browse all ${AVAILABLE_TEMPLATE_COUNT} resume templates`,
                  'Delete your data at any time',
                ].map((item) => (
                  <li key={item} className="flex gap-2 text-[14px] leading-snug text-ink-soft">
                    <CheckCircleIcon className="mt-px size-5 shrink-0 text-ok" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/gulf-readiness-score" className={cn(buttonVariants({ variant: 'secondary' }), 'mt-7 w-full')}>
                Check my readiness — free
              </Link>
            </article>
            <article className="flex flex-col rounded-card border-2 border-teal bg-white p-6 shadow-m-2">
              <span className="self-start rounded-full bg-teal-soft px-2.5 py-1 text-[12px] font-bold uppercase tracking-[0.08em] text-teal">
                Application services
              </span>
              <h3 className="mt-4 font-display text-[22px] font-semibold text-ink">Build and prepare for each job</h3>
              <ul className="mt-5 flex flex-col gap-2.5">
                {[
                  'Optimized CV with ATS score before and after',
                  'Review page — edit and approve every change',
                  'PDF download in any GCC template',
                  'Cover letter in four tones',
                  'Interview Q&A and written mock interview',
                ].map((item) => (
                  <li key={item} className="flex gap-2 text-[14px] leading-snug text-ink-soft">
                    <CheckCircleIcon className="mt-px size-5 shrink-0 text-teal" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className={cn(buttonVariants({ variant: 'progress' }), 'mt-7 w-full')}>
                Create my account
              </Link>
            </article>
          </div>
          <p className="mx-auto mt-6 max-w-[64ch] text-center text-[13.5px] leading-relaxed text-ink-soft">
            <NotLiveText>Card checkout is not live yet.</NotLiveText> Current access is shown in your account. Confirm any
            price and what it includes directly with GCC Mentor before paying.
          </p>
        </Band>

        {/* ── FAQ ──────────────────────────────────────────────────────── */}
        <section id="faq" className="mx-auto max-w-[900px] px-3 py-14 sm:px-8 sm:py-20 lg:py-24">
          <SectionHeader center eyebrow="Questions" title="Before you start" />
          <div className="mt-10 flex flex-col gap-3">
            {FAQ.map(([question, answer]) => (
              <details key={question} className="group rounded-card border border-line bg-white px-5 py-1 shadow-m-1 open:shadow-m-2">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 py-3 font-display text-[16px] font-semibold text-ink marker:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal [&::-webkit-details-marker]:hidden">
                  {question}
                  <span aria-hidden="true" className="shrink-0 text-[22px] leading-none text-teal transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="pb-4 text-[14.5px] leading-relaxed text-ink-soft">{answer}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ── FINAL CTA ────────────────────────────────────────────────── */}
        <section className="border-t border-line bg-teal">
          <div className="mx-auto flex max-w-[900px] flex-col items-center gap-6 px-3 py-16 text-center sm:px-8 lg:py-24">
            <h2 className="max-w-[22ch] font-display text-[32px] font-semibold leading-[1.08] tracking-[-0.02em] text-white sm:text-[44px]">
              See where you stand today. Build your next application from there.
            </h2>
            <p className="max-w-[56ch] text-[16px] leading-relaxed text-teal-soft">
              Upload your CV for a free Gulf Readiness score. If you continue, the same upload starts your Career Profile.
            </p>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Link
                href="/gulf-readiness-score"
                className={cn(buttonVariants({ variant: 'purchase' }), 'w-full whitespace-normal px-6 text-center text-[15px] focus-visible:ring-offset-teal sm:w-auto')}
              >
                Check my Gulf readiness — free <ArrowRightIcon className="size-4" aria-hidden="true" />
              </Link>
              <Link
                href="/login"
                className="inline-flex min-h-11 items-center justify-center rounded-ctl border border-white/40 px-6 text-[15px] font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                I already have an account
              </Link>
            </div>
          </div>
        </section>
      </main>
      <AppFooter />
    </div>
  )
}
