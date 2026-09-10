import Image from 'next/image'
import Link from 'next/link'
import { cn, GULF_COUNTRIES } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/Button'
import { NotLive, NotLiveText } from '@/components/ui/NotLive'
import { SiteNav } from '@/components/marketing/SiteNav'
import { TemplateShowcase } from '@/components/landing/TemplateShowcase'
import {
  ReadinessVisual,
  ProfileVisual,
  TargetJobsVisual,
  OptimizerVisual,
  LetterVisual,
} from '@/components/landing/Stations'
import {
  ShieldCheckIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  ChatBubbleLeftRightIcon,
  QuestionMarkCircleIcon,
  BookmarkIcon,
  ClockIcon,
  DocumentMagnifyingGlassIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline'

/**
 * The landing page — built as the path, not as a feature list.
 *
 * WHY THE STRUCTURE IS UNUSUAL, 2026-09-09. The previous version was the
 * ordinary SaaS shape: hero, three benefit cards, a feature grid, pricing, FAQ.
 * The founder's objection was right — that page makes a visitor assemble the
 * product in their own head from a pile of parts, and this product's whole
 * claim is that they do NOT have to.
 *
 * So the spine of this page is the journey itself. Six numbered stations, in
 * the order a real user meets them, each showing the service, what they do,
 * what they get, and whether it costs anything. There is no separate "how it
 * works" and no separate "features" grid, because those were the same thing
 * told twice. Scrolling this page IS being walked through the platform.
 *
 * WHAT IS AND IS NOT HERE. `01_PRODUCT.md` §3: this audience is actively worked
 * by placement scams, so the line matters more here than on any other screen.
 *   · The template preview is REAL — the component that builds the PDF.
 *   · The station visuals are built from the real screens' own shapes and
 *     tokens, and every figure in them is labelled illustrative on the page.
 *   · The founder's projects are real and verifiable, from his own record.
 *   · NO testimonials, NO customer photos, NO success statistics. A stock
 *     portrait captioned as a customer is the scam's own move. When real
 *     consented stories exist, they belong beside station six.
 *   · Photography is industrial and illustrative, and captioned as such.
 *   · Everything unbuilt is red, here and inside the product.
 */

const photos = {
  // Gulf industrial plant — hero backdrop. Illustrative, no people.
  plant: 'https://images.unsplash.com/photo-1509390288171-ce2088f7d08e?auto=format&fit=crop&w=1920&q=80',
  // Second plant — the "who built this" band.
  plantAlt: 'https://images.unsplash.com/photo-1588011930968-eadac80e6a5a?auto=format&fit=crop&w=1600&q=80',
  // Commissioning work on site. NOT a portrait of the founder, never captioned as one.
  engineer: 'https://images.unsplash.com/photo-1622612023350-b15f063eabe6?auto=format&fit=crop&w=1200&q=80',
}

/** The three things a Gulf applicant is never told. */
const problems = [
  {
    icon: ClockIcon,
    title: 'You apply, and nothing comes back',
    body: 'Forty applications, no replies, no reason given. Nobody tells you whether it was the CV, the experience, or the fact that you are not in the Gulf yet.',
  },
  {
    icon: DocumentMagnifyingGlassIcon,
    title: 'Your CV is written for the wrong reader',
    body: 'Gulf employers and their screening systems look for a specific shape — client names, standards, scope, visa status. An Indian-format CV can hide a strong career completely.',
  },
  {
    icon: MapPinIcon,
    title: 'Nobody explains the rules',
    body: 'What a PMC expects that an EPC does not. What a transferable visa signals. Which certification matters in which country. It is learned on site, or not at all.',
  },
]

/**
 * The path. Each station is a REAL service with its real status.
 *
 * `href` only ever points where an anonymous visitor can actually land — the
 * scorecard needs no login; everything else goes to signup rather than to a
 * protected route that would bounce them to a login screen mid-click.
 */
type Station = {
  n: string
  eyebrow: string
  title: string
  you: string
  get: string
  free: boolean
  href: string
  cta: string
  visual: 'readiness' | 'profile' | 'target' | 'optimizer' | 'templates' | 'letter'
}

const stations: Station[] = [
  {
    n: '01',
    eyebrow: 'Free · no login',
    title: 'Find out where you actually stand',
    you: 'Upload your current CV and answer two questions about your Gulf experience.',
    get: 'A score out of 100 across six dimensions, and a ranked list of what to fix first — starting with whichever is costing you the most.',
    free: true,
    href: '/gulf-readiness-score',
    cta: 'Score my CV free',
    visual: 'readiness',
  },
  {
    n: '02',
    eyebrow: 'Free',
    title: 'Your career, read once and kept',
    you: 'We read your CV and fill in your roles, dates, skills, education and certifications for you. You correct anything we got wrong.',
    get: 'One structured Career Profile. Every CV, cover letter and score after this is built from it, so you never retype your career again.',
    free: true,
    href: '/signup',
    cta: 'Create free account',
    visual: 'profile',
  },
  {
    n: '03',
    eyebrow: 'Free to set up',
    title: 'Add the job you are going for',
    you: 'Give us the role, the country, the employer, and paste the advert if you have it.',
    get: 'A target job that holds its own CV, its own letters and its own stage — applied, shortlisted, interview, visa processing, offer — so you always know where every application stands.',
    free: true,
    href: '/signup',
    cta: 'Start a target job',
    visual: 'target',
  },
  {
    n: '04',
    eyebrow: 'From ₹499',
    title: 'Rewritten for the Gulf, never invented',
    you: 'Choose what to optimize. The engine matches your real experience against that specific advert and market.',
    get: 'Your experience reframed the way a Gulf recruiter and their screening system reads it — plus a match report showing your gaps against that job.',
    free: false,
    href: '/signup',
    cta: 'See how it works',
    visual: 'optimizer',
  },
  {
    n: '05',
    eyebrow: 'Included',
    title: 'Fifteen Gulf formats, one click apart',
    you: 'Pick a template, a font, a colour, and whether to show your photo.',
    get: 'An ATS-safe or photo-led Gulf CV as a PDF, rebuilt instantly — the same words, presented for whoever is reading them.',
    free: false,
    href: '/signup',
    cta: 'Browse the formats',
    visual: 'templates',
  },
  {
    n: '06',
    eyebrow: 'From ₹999',
    title: 'Finish the application',
    you: 'Add a cover letter in the tone that fits the employer.',
    get: 'A complete package for that one job — CV and letter, built from the same profile, saying the same true things.',
    free: false,
    href: '/signup',
    cta: 'Create free account',
    visual: 'letter',
  },
]

/** Named honestly as not built. Shown because the roadmap is part of the pitch. */
const planned = [
  { icon: QuestionMarkCircleIcon, title: 'Interview Q&A Prep', desc: 'Role-specific technical and HR questions, drawn from your own profile.' },
  { icon: ChatBubbleLeftRightIcon, title: 'Mock Interview', desc: 'Practise the conversation with guided feedback.' },
  { icon: BookmarkIcon, title: 'Saved Jobs', desc: 'Keep roles you want to come back to.' },
]

// Real projects from the founder's own record. No invented figures, headcounts
// or success percentages.
const credentials = [
  { label: 'NEOM Green Hydrogen Complex', detail: "World's largest green hydrogen facility — Duba, Tabuk, Saudi Arabia" },
  { label: 'ADNOC TAKREER', detail: 'Base Oil Unit, direct ADNOC project delivery — Abu Dhabi, UAE' },
  { label: 'Bechtel · Al Taweelah', detail: 'Largest alumina refinery in the Middle East, ADNOC standards — UAE' },
  { label: 'NSRP Refinery, Vietnam', detail: "Asia's largest single-train refinery and petrochemical complex" },
]

// Engineering standards worked to. NOT a customer list, and labelled as such.
const standards = ['Saudi Aramco', 'ADNOC', 'Bechtel', 'Shell DEP', 'QatarEnergy']

const pricing = [
  { name: 'Free', price: null, tag: 'Stations 1–3', items: ['Gulf Readiness Score', 'Career Profile', 'Target jobs and stages'], featured: false, live: true },
  { name: 'Resume Optimization', price: '₹499', tag: 'One job', items: ['Everything free, plus', 'GCC-optimized resume', '15 Gulf templates', 'PDF download'], featured: true, live: true },
  { name: 'Resume + Cover Letter', price: '₹999', tag: 'One job, complete', items: ['Optimized resume', 'Professional cover letter', 'PDF download'], featured: false, live: false },
  { name: 'Complete Package', price: '₹2,499', tag: 'Full preparation', items: ['Resume + cover letter', 'Multiple target versions', 'Priority support'], featured: false, live: false },
]

const faq = [
  { q: 'Will GCC MENTOR invent anything on my CV?', a: 'No. The optimizer uses only facts in your Career Profile. It improves framing, never your history. Every generated line is validated against your profile before you see it.' },
  { q: 'Which Gulf countries are supported?', a: 'Saudi Arabia, UAE, Qatar, Oman, Kuwait and Bahrain. The CV format and readiness scoring follow conventions shared across the Gulf, so one profile prepares you for all six rather than locking you to one.' },
  { q: 'Do I have to pay to find out whether this helps me?', a: 'No. Stations one to three are free — the readiness score, your Career Profile and your target jobs. You only pay when you want the optimized CV itself.' },
  { q: 'Are all the services available today?', a: 'No, and we mark which is which in red. Stations one to six are live. Interview Q&A, Mock Interview and Saved Jobs are still in development and are labelled everywhere they appear.' },
  { q: 'How do I pay?', a: 'Card checkout is not live yet — we are still completing our payment provider setup. Everything free works today; when you want a paid service we arrange it with you directly and unlock it on your account.' },
  { q: 'How is my data protected?', a: 'Passport and visa fields are encrypted, and every internal access is logged. You can delete your profile and all data at any time from Settings.' },
]

function Eyebrow({ children, onDark = false }: { children: React.ReactNode; onDark?: boolean }) {
  return (
    <span className={cn('text-[11.5px] font-bold uppercase tracking-[0.16em]', onDark ? 'text-teal-soft' : 'text-teal')}>
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
          'max-w-[24ch] font-display text-[30px] font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[38px]',
          onDark ? 'text-white' : 'text-ink',
        )}
      >
        {title}
      </h2>
      {body ? (
        <p className={cn('max-w-[60ch] text-[15.5px] leading-relaxed', onDark ? 'text-teal-soft/90' : 'text-ink-soft')}>
          {body}
        </p>
      ) : null}
    </div>
  )
}

function StationVisual({ kind }: { kind: Station['visual'] }) {
  if (kind === 'readiness') return <ReadinessVisual />
  if (kind === 'profile') return <ProfileVisual />
  if (kind === 'target') return <TargetJobsVisual />
  if (kind === 'optimizer') return <OptimizerVisual />
  if (kind === 'letter') return <LetterVisual />
  return <TemplateShowcase variant="page" />
}

export default function Home() {
  const countries = GULF_COUNTRIES.filter((c) => c.value !== 'generic_gulf')

  return (
    <div className="w-full overflow-x-clip bg-canvas font-redesign-sans text-ink">
      <SiteNav />
      <main>
        {/* ════════ HERO ════════
            Centred and narrow, not the usual copy-left / screenshot-right. The
            page's whole argument is that this is ONE path, so the hero ends by
            pointing down it rather than showing a product shot that competes
            with the stations below. */}
        <section className="relative overflow-hidden bg-teal">
          <div className="absolute inset-0">
            {/* `sizes` is required on a `fill` image: without it Next serves its
                largest srcset candidate to a phone, and this is the LCP element. */}
            <Image src={photos.plant} alt="" fill priority sizes="100vw" className="object-cover opacity-[0.13]" />
            <div className="absolute inset-0 bg-gradient-to-b from-teal via-teal/95 to-teal" />
          </div>

          <div className="relative mx-auto flex max-w-[900px] flex-col items-center gap-7 px-5 py-20 text-center sm:px-8 lg:py-28">
            <Eyebrow onDark>Built by Middle East EPC &amp; PMC engineers</Eyebrow>
            <h1 className="max-w-[18ch] font-display text-[40px] font-semibold leading-[1.03] tracking-[-0.03em] text-white sm:text-[56px] lg:text-[64px]">
              One guided path to a <span className="text-gold">Gulf job.</span>
            </h1>
            <p className="max-w-[58ch] text-[16.5px] leading-relaxed text-teal-soft/90 sm:text-[18px]">
              Not a CV tool. A platform that reads your career once, tells you exactly where you
              stand for the Gulf, fixes what is holding you back, and walks you to a finished
              application — for every job you go after.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/gulf-readiness-score" className={cn(buttonVariants({ variant: 'primary' }), 'px-7 text-[15px]')}>
                Start free — score my CV <ArrowRightIcon className="ml-1 size-4" />
              </Link>
              <a
                href="#path"
                className={cn(
                  buttonVariants({ variant: 'secondary' }),
                  'border-white/25 bg-white/10 text-white hover:bg-white/20 text-[15px]',
                )}
              >
                See the whole path
              </a>
            </div>
            <p className="text-[13px] text-teal-soft/75">
              No card. Nothing saved unless you sign up. Stations 1&ndash;3 are free.
            </p>
            {/* For the returning user on a phone, where the header has room for
                "Log in" but not "Sign up": both, one line, above the fold. */}
            <p className="text-[14px] text-teal-soft/90">
              Already have an account?{' '}
              <Link href="/login" className="font-semibold text-white underline underline-offset-4 hover:text-gold">
                Log in
              </Link>
              <span aria-hidden="true" className="mx-2 text-teal-soft/50">·</span>
              <Link href="/signup" className="font-semibold text-white underline underline-offset-4 hover:text-gold">
                Create free account
              </Link>
            </p>

            {/* The six markets at full size — "specially for the Gulf" is the
                whole claim, so this is the one place the flags are large. */}
            <ul className="mt-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 border-t border-white/15 pt-7">
              {countries.map((c) => (
                <li key={c.value} className="flex items-center gap-2 text-[13.5px] font-semibold text-teal-soft/85">
                  <span aria-hidden="true" className="text-[20px] leading-none">{c.flag}</span>
                  {c.label}
                </li>
              ))}
            </ul>
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
                <li key={s} className="font-display text-[15px] font-semibold text-ink-soft">{s}</li>
              ))}
            </ul>
          </div>
        </section>

        {/* ════════ THE PROBLEM ════════ */}
        <section className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
          <SectionHead
            eyebrow="Why applications go quiet"
            title="You are not being rejected. You are getting no answer at all."
            body="Which is worse, because there is nothing in it to learn from. These are the three things a Gulf applicant almost never finds out on their own — and all three are fixable."
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

        {/* ════════ THE PATH ════════
            The spine of the page, and of the product. Stations alternate sides
            on desktop and stack on a phone, with the rail on the left below
            `lg` so the numbering never breaks. */}
        <section id="path" className="border-y border-line bg-white">
          <div className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
            <SectionHead
              center
              eyebrow="The whole platform"
              title="Six stations. You are never left to work out what comes next."
              body="This is the entire product, in the order you meet it. The first three cost nothing — you can find out whether this helps you before you spend anything."
            />

            <ol className="relative mt-14 flex flex-col gap-14 lg:gap-20">
              {/* The rail. Decorative — the ordered list already carries the
                  sequence for assistive tech. */}
              <span
                aria-hidden="true"
                className="absolute left-[19px] top-2 hidden h-[calc(100%-2rem)] w-px bg-line sm:block lg:left-1/2"
              />

              {stations.map((s, i) => (
                <li key={s.n} className="relative grid gap-6 lg:grid-cols-2 lg:items-center lg:gap-14">
                  {/* IN THE FLOW ON A PHONE, on the rail above it.
                      Absolutely positioning this at every width put it exactly
                      on top of the "Free" badge below 640px — both landed at
                      left 20, top 1480 — because the copy column only gains its
                      left padding at `sm`. Measured, not guessed. So on a phone
                      the number is simply the first line of the station; from
                      `sm` it lifts onto the rail, and from `lg` onto the centre
                      spine. */}
                  <span
                    aria-hidden="true"
                    className="mb-1 flex size-10 items-center justify-center rounded-full border border-line bg-white font-display text-[14px] font-bold text-teal shadow-m-1 sm:absolute sm:left-0 sm:top-0 sm:mb-0 lg:left-1/2 lg:-translate-x-1/2"
                  >
                    {s.n}
                  </span>

                  {/* Copy — swaps side on odd stations so the eye zig-zags down
                      the rail rather than reading two parallel columns. */}
                  <div className={cn('flex flex-col gap-4 sm:pl-14 lg:pl-0', i % 2 === 1 && 'lg:order-2 lg:pl-14')}>
                    <span
                      className={cn(
                        'w-fit rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.09em]',
                        s.free ? 'bg-teal-soft text-teal' : 'bg-gold-soft text-gold-ink',
                      )}
                    >
                      {s.eyebrow}
                    </span>
                    <h3 className="font-display text-[24px] font-semibold leading-[1.15] tracking-[-0.02em] text-ink sm:text-[28px]">
                      {s.title}
                    </h3>
                    <div className="flex flex-col gap-3">
                      <p className="text-[14.5px] leading-relaxed text-ink-soft">
                        <span className="font-semibold text-ink">You do:</span> {s.you}
                      </p>
                      <p className="border-l-2 border-teal pl-4 text-[14.5px] leading-relaxed text-ink-soft">
                        <span className="font-semibold text-teal">You get:</span> {s.get}
                      </p>
                    </div>
                    <Link
                      href={s.href}
                      className={cn(buttonVariants({ variant: s.free ? 'primary' : 'secondary', size: 'sm' }), 'w-fit')}
                    >
                      {s.cta}
                    </Link>
                  </div>

                  {/* Visual */}
                  <div className={cn('sm:pl-14 lg:pl-0', i % 2 === 1 && 'lg:order-1')}>
                    <StationVisual kind={s.visual} />
                    {s.visual !== 'templates' ? (
                      <p className="mt-2.5 text-center text-[11.5px] text-ink-muted">
                        Illustrative — figures are examples, not customer data.
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ════════ WHAT IS NOT BUILT ════════ */}
        <section id="roadmap" className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
          <SectionHead
            eyebrow="What comes after station six"
            title="What we have not built yet — said before you ask."
            body="These are on the roadmap and they are not live. We mark them in red everywhere they appear, including inside the product, because a “coming soon” that never comes is what this market has been burned by."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {planned.map((p) => (
              <div key={p.title} className="flex flex-col gap-3 rounded-card border border-dashed border-alert/40 bg-alert-soft/25 p-6">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex size-11 items-center justify-center rounded-ctl bg-alert-soft text-alert">
                    <p.icon className="size-[22px]" />
                  </span>
                  <NotLive />
                </div>
                <h3 className="font-display text-[17px] font-semibold leading-snug text-ink-muted">{p.title}</h3>
                <p className="text-[14px] leading-relaxed text-ink-muted">{p.desc}</p>
              </div>
            ))}
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
                <p className="text-[12px] text-teal-soft/70">
                  Site photography, illustrative. We do not use stock portraits as customers or as
                  our team, and there are no testimonials on this page until there are real ones.
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <p className="text-[11.5px] font-bold uppercase tracking-[0.14em] text-teal-soft">
                  Projects delivered
                </p>
                {credentials.map((c) => (
                  <div key={c.label} className="flex gap-4 rounded-card border border-white/12 bg-white/[0.06] p-5">
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

        {/* ════════ PRICING ════════ */}
        <section id="pricing" className="border-y border-line bg-white">
          <div className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
            <SectionHead center eyebrow="Pricing" title="Free until the CV itself." />
            <p className="mx-auto mt-4 max-w-[62ch] text-center text-[14px] leading-relaxed text-ink-soft">
              <NotLiveText>Card checkout is not live yet</NotLiveText> — we are finishing our
              payment provider setup. Everything free works today; when you are ready to buy, we
              arrange it with you directly and unlock it on your account.
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
                      {p.price ? 'Get started' : 'Start free'}
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
              <details key={f.q} className="group rounded-card border border-line bg-white px-5 py-4 shadow-m-1 open:shadow-m-2">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-[16px] font-semibold text-ink marker:hidden">
                  {f.q}
                  <span aria-hidden="true" className="shrink-0 text-[20px] leading-none text-teal transition-transform group-open:rotate-45">
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
              Station one takes one upload.
            </h2>
            <p className="max-w-[54ch] text-[16px] leading-relaxed text-teal-soft/90">
              Free, no card, no login. You get a scored breakdown and a ranked plan of what to fix
              first — whether or not you ever pay us anything.
            </p>
            <Link href="/gulf-readiness-score" className={cn(buttonVariants({ variant: 'primary' }), 'px-8 text-[15px]')}>
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
