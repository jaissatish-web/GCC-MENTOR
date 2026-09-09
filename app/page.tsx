import Image from 'next/image'
import Link from 'next/link'
import { cn, GULF_COUNTRIES } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/Button'
import { NotLive, NotLiveText } from '@/components/ui/NotLive'
import { SiteNav } from '@/components/marketing/SiteNav'
import { TemplateShowcase } from '@/components/landing/TemplateShowcase'
import {
  ChartBarIcon,
  SparklesIcon,
  ShieldCheckIcon,
  UserCircleIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  RectangleStackIcon,
  EnvelopeIcon,
  ChatBubbleLeftRightIcon,
  QuestionMarkCircleIcon,
  ClockIcon,
  DocumentMagnifyingGlassIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline'

/**
 * The landing page.
 *
 * REBUILT IN MERIDIAN 2026-09-09. It was the last surface still on the navy
 * palette — the first thing a visitor sees, and the one page that did not look
 * like the product behind it.
 *
 * WHAT IS AND IS NOT ON THIS PAGE, because the line matters more here than
 * anywhere else. `01_PRODUCT.md` §3: this audience is actively worked by
 * placement scams. So:
 *
 *   · The template previews are REAL — the same components that build the PDF,
 *     rendered live against the fictional showcase CV. Not screenshots, not
 *     mockups, and they cannot drift from what a user actually gets.
 *   · The founder's projects are real and verifiable, taken from his own record.
 *   · There are NO testimonials, NO customer photos and NO success statistics.
 *     Inventing social proof is the one thing this product must never do, and a
 *     smiling stranger captioned "got hired in Dubai" is exactly the move the
 *     scams make. If real, consented customer stories arrive, they belong here.
 *   · The photography is industrial and illustrative — plants and sites, never
 *     a person presented as a customer or as the founder.
 *   · Every example that is invented says so on the same screen.
 *   · Everything unbuilt is marked in red (`NotLive`), including in pricing.
 */

const photos = {
  // Gulf industrial / energy plant — hero backdrop. Illustrative, no people.
  plant: 'https://images.unsplash.com/photo-1509390288171-ce2088f7d08e?auto=format&fit=crop&w=1920&q=80',
  // Second plant — the "who built this" section.
  plantAlt: 'https://images.unsplash.com/photo-1588011930968-eadac80e6a5a?auto=format&fit=crop&w=1600&q=80',
  // Commissioning work on site. Atmospheric site photography, NOT a portrait of
  // the founder and never captioned as one.
  engineer: 'https://images.unsplash.com/photo-1622612023350-b15f063eabe6?auto=format&fit=crop&w=1200&q=80',
}

/**
 * Every service, with its REAL status. `href` only ever points somewhere an
 * anonymous visitor can actually land: the free scorecard needs no login, and
 * everything else routes to signup rather than to a protected route that would
 * bounce them to a login screen mid-click.
 */
const services = [
  { icon: ChartBarIcon, title: 'Gulf Readiness Score', desc: 'Upload a CV, answer two questions, and get a scored breakdown across six dimensions with a ranked plan of what to fix first.', href: '/gulf-readiness-score', status: 'Free · no login' },
  { icon: UserCircleIcon, title: 'Career Profile', desc: 'Your experience, read from your CV once and stored as structured facts. Every other tool draws from it, so you never retype anything.', href: '/signup', status: 'Live' },
  { icon: SparklesIcon, title: 'GCC Resume Optimizer', desc: 'Paste the job description and it reframes your real experience for that role and market — grounded, so it can never invent a job you did not do.', href: '/signup', status: 'Live' },
  { icon: RectangleStackIcon, title: '15 Gulf CV Templates', desc: 'ATS-safe through to photo-led Gulf formats. Switch template, font, colour and photo without retyping a word.', href: '/signup', status: 'Live' },
  { icon: EnvelopeIcon, title: 'Cover Letter', desc: 'Written from the same profile, in the tone you choose — Professional, Short, Technical or Explanatory.', href: '/signup', status: 'Live' },
  { icon: DocumentMagnifyingGlassIcon, title: 'Target Jobs', desc: 'Every role you are going for in one place, with its CV, its letters and its stage — applied, shortlisted, interview, visa, offer.', href: '/signup', status: 'Live' },
]

/** Named honestly as not-yet-built. Shown because the roadmap is part of the pitch. */
const plannedServices = [
  { icon: QuestionMarkCircleIcon, title: 'Interview Q&A Prep', desc: 'Role-specific technical and HR questions, drawn from your own profile.' },
  { icon: ChatBubbleLeftRightIcon, title: 'Mock Interview', desc: 'Practise the conversation with guided feedback.' },
]

/**
 * What actually goes wrong, in the user's words rather than ours.
 *
 * The founder's brief: someone reading this should feel understood before they
 * are sold anything. These are the three things a Gulf applicant can never
 * find out on their own — which is the gap the product exists in.
 */
const problems = [
  {
    icon: ClockIcon,
    title: 'You apply, and nothing comes back',
    body: 'Forty applications, no replies, no reason given. Nobody tells you whether it was the CV, the experience or the fact that you are not in the Gulf yet.',
  },
  {
    icon: DocumentMagnifyingGlassIcon,
    title: 'Your CV is written for the wrong reader',
    body: 'Gulf employers and their screening systems look for a specific shape — client names, standards, scope, visa status. An Indian-format CV can hide a strong career completely.',
  },
  {
    icon: MapPinIcon,
    title: 'Nobody explains the rules',
    body: 'What a PMC expects that an EPC does not. What a transferable visa signals. Which certifications matter for which country. It is learned on site, or not at all.',
  },
]

const journeySteps = [
  { label: 'See where you stand', doing: 'Upload your current CV and answer two questions about your Gulf experience.', gain: 'A scored readiness breakdown and a ranked list of what is holding you back.', free: true },
  { label: 'Build your Career Profile', doing: 'We read your CV and fill in your history, skills and certifications for you.', gain: 'One structured profile that every future application is built from.', free: true },
  { label: 'Target a real job', doing: 'Choose the role you want, and paste the job description if you have one.', gain: 'A match report showing your gaps against that specific job.', free: false },
  { label: 'Generate your Gulf CV', doing: 'The optimizer reframes your real experience for that role and market.', gain: 'An ATS-ready CV in your choice of 15 Gulf formats.', free: false },
  { label: 'Complete the application', doing: 'Add a cover letter in the tone that fits the employer.', gain: 'A full application package, ready to send.', free: false },
]

// Real projects from the founder's own record. Only facts that survive
// verification — no invented figures, percentages or headcounts.
const credentials = [
  { label: 'NEOM Green Hydrogen Complex', detail: "World's largest green hydrogen facility — Duba, Tabuk, Saudi Arabia" },
  { label: 'ADNOC TAKREER', detail: 'Base Oil Unit, direct ADNOC project delivery — Abu Dhabi, UAE' },
  { label: 'Bechtel · Al Taweelah', detail: 'Largest alumina refinery in the Middle East, ADNOC standards — UAE' },
  { label: 'NSRP Refinery, Vietnam', detail: "Asia's largest single-train refinery and petrochemical complex" },
]

// Engineering standards the founder has worked to. NOT a customer list, and
// deliberately labelled as standards wherever it appears.
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

// `live: true` = a real visitor can pay this today. The two bundles exist as
// admin-created service_packages but are unlocked by a promo code the founder
// hands out directly while card checkout stays blocked on KYC — marking them
// `live: false` is what keeps the button honest.
const pricing = [
  { name: 'Free', price: null, tag: 'Gulf Readiness', items: ['Gulf Readiness Score', 'Six-dimension breakdown', 'Ranked improvement plan'], featured: false, live: true },
  { name: 'Resume Optimization', price: '₹499', tag: 'Single resume', items: ['Career Profile', 'GCC-optimized resume', '15 Gulf templates', 'PDF download'], featured: true, live: true },
  { name: 'Resume + Cover Letter', price: '₹999', tag: 'Bundle', items: ['Optimized resume', 'Professional cover letter', 'PDF download'], featured: false, live: false },
  { name: 'Complete Package', price: '₹2,499', tag: 'Full preparation', items: ['Resume + cover letter', 'Multiple target versions', 'Priority support'], featured: false, live: false },
]

const faq = [
  { q: 'Will GCC MENTOR invent anything on my CV?', a: 'No. The optimizer uses only facts in your Career Profile. It improves framing, never your history. Every generated line is validated against your profile before you see it.' },
  { q: 'Which Gulf countries are supported?', a: 'Saudi Arabia, UAE, Qatar, Oman, Kuwait and Bahrain. The CV format and readiness scoring follow conventions shared across the Gulf, so one profile prepares you for all six rather than locking you to one.' },
  { q: 'Are all tools available today?', a: 'No, and we mark which is which in red. The Gulf Readiness Score, Career Profile, resume optimizer, 15 templates, target jobs and cover letters are live. Interview Q&A and Mock Interview are still in development.' },
  { q: 'How do I pay?', a: 'Card checkout is not live yet — we are still completing our payment provider setup. You can use the free Gulf Readiness Score and build your Career Profile today at no cost; when you want a paid service we arrange it with you directly and unlock it on your account.' },
  { q: 'Can I see changes before paying?', a: 'Yes. You see the full optimized resume, and can edit it, before any payment is arranged.' },
  { q: 'How is my data protected?', a: 'Passport and visa fields are encrypted, and every internal access is logged. You can delete your profile and all data at any time from Settings.' },
]

function Eyebrow({ children, onDark = false }: { children: React.ReactNode; onDark?: boolean }) {
  return (
    <span
      className={cn(
        'text-[11.5px] font-bold uppercase tracking-[0.16em]',
        onDark ? 'text-teal-soft' : 'text-teal',
      )}
    >
      {children}
    </span>
  )
}

function SectionHead({
  eyebrow,
  title,
  body,
  onDark = false,
  center = false,
}: {
  eyebrow: string
  title: string
  body?: string
  onDark?: boolean
  center?: boolean
}) {
  return (
    <div className={cn('flex flex-col gap-3', center && 'items-center text-center')}>
      <Eyebrow onDark={onDark}>{eyebrow}</Eyebrow>
      <h2
        className={cn(
          'max-w-[22ch] font-display text-[30px] font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[38px]',
          onDark ? 'text-white' : 'text-ink',
          center && 'max-w-[24ch]',
        )}
      >
        {title}
      </h2>
      {body ? (
        <p
          className={cn(
            'max-w-[58ch] text-[15.5px] leading-relaxed',
            onDark ? 'text-teal-soft/90' : 'text-ink-soft',
          )}
        >
          {body}
        </p>
      ) : null}
    </div>
  )
}

/** Illustrative before/after bar. Labelled as illustrative by its section. */
function ReadinessBar({ label, before, after }: { label: string; before: number; after: number }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-semibold text-ink">{label}</span>
        <span className="text-[12.5px] font-semibold tabular-nums text-ink-muted">
          {before} <span aria-hidden="true">→</span>{' '}
          <span className="text-teal">{after}</span>
        </span>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-line">
        <div className="absolute inset-y-0 left-0 rounded-full bg-line-strong" style={{ width: `${before}%` }} />
        <div className="absolute inset-y-0 left-0 rounded-full bg-teal" style={{ width: `${after}%`, opacity: 0.85 }} />
      </div>
    </div>
  )
}

export default function Home() {
  const countries = GULF_COUNTRIES.filter((c) => c.value !== 'generic_gulf')

  return (
    <div className="w-full overflow-x-clip bg-canvas font-redesign-sans text-ink">
      <SiteNav />
      <main>
        {/* ════════ HERO ════════ */}
        <section className="relative overflow-hidden bg-teal">
          <div className="absolute inset-0">
            {/* `sizes` is required on a `fill` image: without it Next serves its
                largest srcset candidate to a phone, and this is the LCP element.
                `priority` stays for the same reason. */}
            <Image src={photos.plant} alt="" fill priority sizes="100vw" className="object-cover opacity-[0.14]" />
            <div className="absolute inset-0 bg-gradient-to-b from-teal via-teal/95 to-teal" />
          </div>

          <div className="relative mx-auto max-w-[1240px] px-5 pb-16 pt-14 sm:px-8 lg:px-12 lg:pb-24 lg:pt-20">
            <div className="grid items-center gap-12 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16">
              <div className="flex flex-col gap-6">
                <Eyebrow onDark>Built by Middle East EPC &amp; PMC engineers</Eyebrow>
                <h1 className="max-w-[16ch] font-display text-[42px] font-semibold leading-[1.02] tracking-[-0.03em] text-white sm:text-[56px] lg:text-[64px]">
                  Your career,{' '}
                  <span className="text-gold">Gulf-ready.</span>
                </h1>
                <p className="max-w-[52ch] text-[16.5px] leading-relaxed text-teal-soft/90 sm:text-[18px]">
                  One guided platform for Saudi Arabia, UAE, Qatar, Oman, Kuwait and Bahrain —
                  read your CV, score your readiness, fix what is holding you back, and build a
                  Gulf-format application for the job you actually want.
                </p>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/gulf-readiness-score"
                    className={cn(buttonVariants({ variant: 'primary' }), 'px-7 text-[15px]')}
                  >
                    Score my CV free <ArrowRightIcon className="ml-1 size-4" />
                  </Link>
                  <Link
                    href="/signup"
                    className={cn(
                      buttonVariants({ variant: 'secondary' }),
                      'border-white/25 bg-white/10 text-white hover:bg-white/20 text-[15px]',
                    )}
                  >
                    Create free account
                  </Link>
                </div>
                <p className="text-[13px] text-teal-soft/75">
                  No card required. Your score is instant, and nothing is saved unless you sign up.
                </p>

                <ul className="mt-1 flex flex-wrap gap-x-5 gap-y-2">
                  {countries.map((c) => (
                    <li key={c.value} className="flex items-center gap-1.5 text-[13px] font-semibold text-teal-soft/85">
                      <span aria-hidden="true" className="text-[15px] leading-none">{c.flag}</span>
                      {c.label}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Hero visual: a real template, rendered live, with the readiness
                  figure beside it. The number is labelled illustrative — it is
                  not a customer's score. */}
              <div className="relative">
                <div className="rounded-card-lg bg-white/5 p-3 ring-1 ring-white/15 backdrop-blur-sm sm:p-4">
                  <TemplateShowcase variant="page" />
                </div>
                {/* Top-left, not bottom-left: at the bottom it landed on the
                    preview's own caption. */}
                <div className="pointer-events-none absolute -left-3 -top-4 hidden rounded-card border border-line bg-white px-4 py-3 shadow-m-3 lg:block">
                  <p className="text-[10.5px] font-bold uppercase tracking-[0.13em] text-ink-muted">
                    Gulf readiness
                  </p>
                  <p className="mt-0.5 font-display text-[26px] font-semibold leading-none tabular-nums text-teal">
                    87<span className="text-[15px] text-ink-muted">/100</span>
                  </p>
                  <p className="mt-1 text-[10.5px] text-ink-muted">Illustrative, not a customer</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ════════ STANDARDS STRIP ════════ */}
        <section className="border-b border-line bg-white">
          <div className="mx-auto flex max-w-[1240px] flex-col gap-3 px-5 py-6 sm:px-8 lg:flex-row lg:items-center lg:gap-8 lg:px-12">
            <p className="shrink-0 text-[11.5px] font-bold uppercase tracking-[0.14em] text-ink-muted">
              Built to the standards we worked to
            </p>
            <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
              {standards.map((s) => (
                <li key={s} className="font-display text-[15px] font-semibold text-ink-soft">
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ════════ THE PROBLEM ════════ */}
        <section className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
          <SectionHead
            eyebrow="Why applications go quiet"
            title="You are not getting rejected. You are getting no answer."
            body="Which is worse, because there is nothing to learn from. These are the three things a Gulf applicant almost never finds out on their own."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {problems.map((p) => (
              <div key={p.title} className="flex flex-col gap-3 rounded-card border border-line bg-white p-6 shadow-m-1">
                <span className="flex size-11 items-center justify-center rounded-ctl bg-teal-soft text-teal">
                  <p.icon className="size-[22px]" />
                </span>
                <h3 className="font-display text-[17px] font-semibold leading-snug text-ink">{p.title}</h3>
                <p className="text-[14px] leading-relaxed text-ink-soft">{p.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ════════ THE GUIDED PATH ════════ */}
        <section id="how" className="border-y border-line bg-white">
          <div className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
            <SectionHead
              eyebrow="One guided path"
              title="From “I want a Gulf job” to a finished application."
              body="Not a box of tools you have to work out. Five steps, in order, and the platform always tells you which one you are on."
            />
            <ol className="mt-10 grid gap-4 lg:grid-cols-5">
              {journeySteps.map((s, i) => (
                <li key={s.label} className="flex flex-col gap-3 rounded-card border border-line bg-canvas p-5">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-teal font-display text-[14px] font-bold text-white">
                      {i + 1}
                    </span>
                    {s.free ? (
                      <span className="rounded-full bg-teal-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-teal">
                        Free
                      </span>
                    ) : null}
                  </div>
                  <h3 className="font-display text-[15.5px] font-semibold leading-snug text-ink">{s.label}</h3>
                  <p className="text-[13px] leading-relaxed text-ink-soft">{s.doing}</p>
                  <p className="mt-auto border-t border-line pt-3 text-[13px] leading-relaxed text-teal">
                    {s.gain}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ════════ EVERYTHING INCLUDED ════════ */}
        <section id="services" className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
          <SectionHead
            eyebrow="All in one place"
            title="Everything you need, and nothing you have to assemble yourself."
            body="Your profile is read once. Every service below draws from it, so you never retype your career again."
          />
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <Link
                key={s.title}
                href={s.href}
                className="group flex flex-col gap-3 rounded-card border border-line bg-white p-6 shadow-m-1 transition-all hover:-translate-y-0.5 hover:border-teal/40 hover:shadow-m-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex size-11 items-center justify-center rounded-ctl bg-teal-soft text-teal">
                    <s.icon className="size-[22px]" />
                  </span>
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em]',
                      s.status.startsWith('Free')
                        ? 'bg-gold-soft text-gold-ink'
                        : 'bg-teal-soft text-teal',
                    )}
                  >
                    {s.status}
                  </span>
                </div>
                <h3 className="font-display text-[17px] font-semibold leading-snug text-ink">{s.title}</h3>
                <p className="text-[14px] leading-relaxed text-ink-soft">{s.desc}</p>
                <span className="mt-auto inline-flex items-center gap-1 pt-1 text-[13px] font-semibold text-teal">
                  Open <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>

          {/* The roadmap, marked in red — same treatment as everywhere else in
              the product, so a visitor can see exactly what is not built. */}
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {plannedServices.map((s) => (
              <div
                key={s.title}
                className="flex flex-col gap-3 rounded-card border border-dashed border-alert/40 bg-alert-soft/25 p-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex size-11 items-center justify-center rounded-ctl bg-alert-soft text-alert">
                    <s.icon className="size-[22px]" />
                  </span>
                  <NotLive />
                </div>
                <h3 className="font-display text-[17px] font-semibold leading-snug text-ink-muted">{s.title}</h3>
                <p className="text-[14px] leading-relaxed text-ink-muted">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ════════ TEMPLATES ════════ */}
        <section id="templates" className="border-y border-line bg-white">
          <div className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
            <SectionHead
              eyebrow="15 Gulf CV formats"
              title="See the actual page, before you write a word."
              body="These are not screenshots. Each preview is rendered by the same component that builds your PDF, so what you see is exactly what you get."
            />
            <div className="mt-10">
              <TemplateShowcase />
            </div>
          </div>
        </section>

        {/* ════════ BEFORE / AFTER ════════ */}
        <section className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
          <SectionHead
            eyebrow="Same career, read properly"
            title="Your experience does not change. How a Gulf recruiter reads it does."
            body="The optimizer never adds a job, a skill or a date. It reframes what is already true into the shape this market screens for."
          />

          <div className="mt-10 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="flex flex-col gap-4">
              <div className="rounded-card border border-line bg-white p-5 shadow-m-1">
                <p className="text-[10.5px] font-bold uppercase tracking-[0.13em] text-ink-muted">Before</p>
                <p className="mt-2 text-[14.5px] leading-relaxed text-ink-soft">{beforeAfter.before}</p>
              </div>
              <div className="rounded-card border border-teal/30 bg-teal-soft/45 p-5">
                <p className="text-[10.5px] font-bold uppercase tracking-[0.13em] text-teal">After</p>
                <p className="mt-2 text-[14.5px] font-medium leading-relaxed text-ink">{beforeAfter.after}</p>
              </div>
              <p className="text-[12px] leading-relaxed text-ink-muted">
                An illustrative rewrite of a typical instrumentation line — not a real customer
                result. Every claim in it would have to already exist in your profile.
              </p>
            </div>

            <div className="flex flex-col gap-5 rounded-card border border-line bg-white p-6 shadow-m-1">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.13em] text-ink-muted">
                What that moves
              </p>
              {readinessBars.map((b) => (
                <ReadinessBar key={b.label} {...b} />
              ))}
              <p className="mt-auto text-[12px] leading-relaxed text-ink-muted">
                Illustrative figures, not aggregated from customer data.
              </p>
            </div>
          </div>
        </section>

        {/* ════════ WHO BUILT THIS ════════ */}
        <section id="about" className="relative overflow-hidden bg-teal">
          <div className="absolute inset-0">
            <Image src={photos.plantAlt} alt="" fill sizes="100vw" className="object-cover opacity-[0.12]" />
            <div className="absolute inset-0 bg-gradient-to-b from-teal via-teal/95 to-teal" />
          </div>
          <div className="relative mx-auto max-w-[1240px] px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
            <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
              <div className="flex flex-col gap-5">
                <SectionHead
                  onDark
                  eyebrow="Who built this"
                  title="Engineers who worked in the Middle East, not recruiters."
                  body="15+ years on EPC and PMC projects for client companies across the Gulf. The team comes from the same work — which is why the guidance here knows where a CV is strong and where it quietly fails."
                />
                <div className="overflow-hidden rounded-card border border-white/15">
                  <Image
                    src={photos.engineer}
                    alt="Commissioning work on a Gulf industrial site"
                    width={1200}
                    height={800}
                    sizes="(min-width: 1024px) 40vw, 100vw"
                    className="h-52 w-full object-cover sm:h-64"
                  />
                </div>
                {/* Said plainly: illustrative site photography, not the founder. */}
                <p className="text-[12px] text-teal-soft/70">
                  Site photography, illustrative. We do not use stock portraits as customers or
                  as our team.
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <p className="text-[11.5px] font-bold uppercase tracking-[0.14em] text-teal-soft">
                  Projects delivered
                </p>
                {credentials.map((c) => (
                  <div
                    key={c.label}
                    className="flex gap-4 rounded-card border border-white/12 bg-white/[0.06] p-5"
                  >
                    <CheckCircleIcon className="mt-0.5 size-5 shrink-0 text-gold" />
                    <div className="flex flex-col gap-1">
                      <span className="font-display text-[16px] font-semibold text-white">{c.label}</span>
                      <span className="text-[13.5px] leading-relaxed text-teal-soft/85">{c.detail}</span>
                    </div>
                  </div>
                ))}
                <p className="mt-1 text-[12.5px] leading-relaxed text-teal-soft/70">
                  Real projects from the founder&apos;s own record. No invented figures, no
                  headcounts, no success percentages.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ════════ MARKETS ════════ */}
        <section id="markets" className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
          <SectionHead
            center
            eyebrow="Six markets, one profile"
            title="Prepared for the whole Gulf, not locked to one country."
            body="CV format and readiness scoring follow conventions shared across the GCC, so the profile you build works for every one of them."
          />
          <ul className="mx-auto mt-10 grid max-w-[900px] grid-cols-2 gap-4 sm:grid-cols-3">
            {countries.map((c) => (
              <li
                key={c.value}
                className="flex items-center gap-3 rounded-card border border-line bg-white px-5 py-4 shadow-m-1"
              >
                <span aria-hidden="true" className="text-[26px] leading-none">{c.flag}</span>
                <span className="font-display text-[15px] font-semibold text-ink">{c.label}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* ════════ PRICING ════════ */}
        <section id="pricing" className="border-y border-line bg-white">
          <div className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
            <SectionHead
              center
              eyebrow="Pricing"
              title="Start free. Pay only when you want the finished CV."
            />
            <p className="mx-auto mt-4 max-w-[62ch] text-center text-[14px] leading-relaxed text-ink-soft">
              <NotLiveText>Card checkout is not live yet</NotLiveText> — we are finishing our
              payment provider setup. Start free today; when you are ready to buy, we arrange it
              with you directly and unlock it on your account.
            </p>

            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {pricing.map((p) => (
                <div
                  key={p.name}
                  className={cn(
                    'flex flex-col gap-5 rounded-card border bg-white p-6',
                    p.featured ? 'border-teal shadow-m-2 ring-1 ring-teal/25' : 'border-line shadow-m-1',
                  )}
                >
                  {p.featured ? (
                    <span className="w-fit rounded-full bg-teal-soft px-3 py-1 text-[10px] font-bold uppercase tracking-[0.09em] text-teal">
                      Most popular
                    </span>
                  ) : !p.live ? (
                    <NotLive className="w-fit">Checkout not live</NotLive>
                  ) : (
                    <span className="w-fit rounded-full bg-canvas px-3 py-1 text-[10px] font-bold uppercase tracking-[0.09em] text-ink-muted">
                      {p.tag}
                    </span>
                  )}

                  <div>
                    <h3 className="font-display text-[20px] font-semibold text-ink">{p.name}</h3>
                    <p className="mt-0.5 text-[13px] text-ink-muted">{p.tag}</p>
                  </div>

                  <p className="font-display text-[32px] font-semibold leading-none tabular-nums text-ink">
                    {p.price ?? 'Free'}
                  </p>

                  <ul className="flex flex-col gap-2">
                    {p.items.map((i) => (
                      <li key={i} className="flex gap-2 text-[13.5px] leading-snug text-ink-soft">
                        <CheckCircleIcon className="mt-px size-4 shrink-0 text-teal" />
                        {i}
                      </li>
                    ))}
                  </ul>

                  {p.live ? (
                    <Link
                      href={p.price ? '/signup' : '/gulf-readiness-score'}
                      className={cn(
                        buttonVariants({ variant: p.featured ? 'primary' : 'secondary', size: 'sm' }),
                        'mt-auto',
                      )}
                    >
                      {p.price ? 'Get started' : 'Score my CV free'}
                    </Link>
                  ) : (
                    <span
                      className={cn(
                        buttonVariants({ variant: 'secondary', size: 'sm' }),
                        'mt-auto cursor-not-allowed border-alert/40 bg-alert-soft/40 text-alert',
                      )}
                      aria-disabled="true"
                    >
                      Not live yet
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ════════ FAQ ════════ */}
        <section id="faq" className="mx-auto max-w-[900px] px-5 py-20 sm:px-8 lg:py-24">
          <SectionHead center eyebrow="Questions" title="The things people ask before they trust us." />
          <div className="mt-10 flex flex-col gap-3">
            {faq.map((f) => (
              <details
                key={f.q}
                className="group rounded-card border border-line bg-white px-5 py-4 shadow-m-1 open:shadow-m-2"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-[16px] font-semibold text-ink marker:hidden">
                  {f.q}
                  <span
                    aria-hidden="true"
                    className="shrink-0 text-[20px] leading-none text-teal transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 text-[14px] leading-relaxed text-ink-soft">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ════════ FINAL CTA ════════ */}
        <section className="border-t border-line bg-teal">
          <div className="mx-auto flex max-w-[900px] flex-col items-center gap-6 px-5 py-20 text-center sm:px-8 lg:py-24">
            <h2 className="max-w-[20ch] font-display text-[32px] font-semibold leading-[1.1] tracking-[-0.02em] text-white sm:text-[42px]">
              Find out where you stand. It takes one upload.
            </h2>
            <p className="max-w-[54ch] text-[16px] leading-relaxed text-teal-soft/90">
              Free, no card, no login. You get a scored breakdown and a ranked plan of what to fix
              first — whether or not you ever pay us anything.
            </p>
            <Link
              href="/gulf-readiness-score"
              className={cn(buttonVariants({ variant: 'primary' }), 'px-8 text-[15px]')}
            >
              Score my CV free <ArrowRightIcon className="ml-1 size-4" />
            </Link>
            <p className="flex items-center gap-2 text-[13px] text-teal-soft/75">
              <ShieldCheckIcon className="size-4" />
              Only facts already in your profile are ever used. Nothing is invented.
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}
