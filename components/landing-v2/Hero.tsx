import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { COUNTRY_CHIPS } from './data'
import { ArrowRight, BTN_LINE, BTN_TEAL, Card, SWIPE_ROW, Wrap } from './ui'

const CHIP =
  'inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-white px-3 py-2 text-[13px] font-semibold text-ink-soft lg:gap-2 lg:px-3.5'

function ReadinessRing({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" className="shrink-0" role="img" aria-label="Example Gulf Readiness score 72">
      <circle cx="60" cy="60" r="50" fill="none" stroke="#E4EEEB" strokeWidth="12" />
      <circle cx="60" cy="60" r="50" fill="none" stroke="#0F4C43" strokeWidth="12" strokeLinecap="round" strokeDasharray="226 314" transform="rotate(-90 60 60)" />
      <text x="60" y="69" textAnchor="middle" fontFamily="var(--font-plex-mono), monospace" fontSize="32" fontWeight="600" fill="#14181C">
        72
      </text>
    </svg>
  )
}

function Ctas({ className }: { className?: string }) {
  return (
    <div className={className}>
      <div className="flex flex-col gap-2.5 lg:flex-row lg:flex-wrap lg:gap-3">
        <Link href="/gulf-readiness-score" className={BTN_TEAL}>
          Check my Gulf readiness — free
          <ArrowRight className="hidden lg:block" />
        </Link>
        <Link href="/signup" className={BTN_LINE}>
          Create my career profile
        </Link>
      </div>
      <p className="mt-2.5 text-center text-[13px] text-ink-muted lg:mt-3.5 lg:text-left lg:text-[14px]">
        Free readiness score · no account · no card · one CV upload.
      </p>
    </div>
  )
}

export function Hero() {
  return (
    <section
      id="top"
      className="relative bg-[radial-gradient(80%_50%_at_90%_10%,rgba(15,76,67,0.10),transparent_70%)] pb-2 pt-7 lg:bg-[radial-gradient(55%_60%_at_85%_20%,rgba(15,76,67,0.08),transparent_70%)] lg:pb-16 lg:pt-[72px]"
    >
      <Wrap className="grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center lg:gap-14">
        <div className="min-w-0">
          <span className={CHIP}>
            <span className="size-2 rounded-full bg-ok" aria-hidden="true" />
            The career platform for Gulf jobs
          </span>
          <h1 className="mt-[18px] font-display text-[40px] font-semibold leading-[1.04] tracking-[-0.025em] text-ink lg:mt-6 lg:text-[64px] lg:leading-[1.03]">
            Your experience is Gulf-ready. <br className="hidden lg:block" />
            <em className="font-medium text-teal">Now make your CV say so.</em>
          </h1>
          <p className="mt-3 text-[16px] leading-[1.6] text-ink-soft lg:mt-4 lg:max-w-[660px] lg:text-[19px] lg:leading-[1.65]">
            <span className="lg:hidden">A CV, cover letter and interview prep for every Gulf job you target — </span>
            <span className="hidden lg:inline">
              GCC Mentor turns your real experience into a CV, cover letter and interview preparation for each job you
              target in Saudi Arabia, the UAE, Qatar, Oman, Kuwait and Bahrain —{' '}
            </span>
            <strong className="text-ink">written from your own Career Profile. Anything new is highlighted, and kept only if you confirm it.</strong>
          </p>
          <Ctas className="mt-8 hidden lg:block" />
          <ul aria-label="Supported countries" className="mt-[26px] hidden flex-wrap gap-2 lg:flex">
            {COUNTRY_CHIPS.map(([code, name]) => (
              <li key={code} className={CHIP}>
                <b className="font-mono text-gold-ink">{code}</b>
                {name}
              </li>
            ))}
          </ul>
        </div>

        {/* Visual: photo + workspace card. Stacked on phones, layered on desktop. */}
        <div className="relative mt-[22px] lg:mt-0 lg:h-[580px]">
          <div className="relative h-[250px] overflow-hidden rounded-[22px] shadow-[0_20px_44px_rgba(20,24,28,0.18)] md:h-[340px] lg:absolute lg:right-0 lg:top-0 lg:h-[460px] lg:w-[88%] lg:rounded-3xl lg:shadow-[0_24px_60px_rgba(20,24,28,0.18)]">
            <Image
              src="/landing/hero-plant-night.jpg"
              alt="A Gulf process plant lit at night"
              fill
              priority
              sizes="(min-width: 1024px) 560px, 100vw"
              className="object-cover"
            />
            <span className="absolute left-[18px] top-[18px] hidden rounded-full bg-white/90 px-3 py-2 text-[12px] font-bold text-teal lg:block">
              Your next project is waiting
            </span>
          </div>

          {/* Phone card */}
          <Card className="relative mx-3.5 -mt-[70px] p-4 shadow-[0_22px_44px_rgba(20,24,28,0.16)] md:mx-auto md:max-w-[420px] lg:hidden">
            <div className="flex items-center gap-3">
              <ReadinessRing size={60} />
              <div className="min-w-0 flex-1">
                <div className="text-[12px] text-ink-muted">Gulf Readiness · example</div>
                <div className="text-[15px] font-extrabold">Senior Instrumentation Engineer</div>
                <div className="mt-1 flex items-center gap-1.5 text-[13px]">
                  <span className="text-ink-muted">ATS</span>
                  <span className="font-mono text-alert line-through">49</span>
                  <span aria-hidden="true">→</span>
                  <span className="font-mono text-[16px] font-semibold text-teal">78</span>
                </div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-1.5 text-[12px] font-bold">
              <span className="rounded-[9px] bg-ok-soft px-2.5 py-2 text-ok">✓ Optimized CV</span>
              <span className="rounded-[9px] bg-ok-soft px-2.5 py-2 text-ok">✓ Cover letter</span>
              <span className="rounded-[9px] bg-ok-soft px-2.5 py-2 text-ok">✓ 25 interview Q&amp;A</span>
              <span className="rounded-[9px] bg-gold-soft px-2.5 py-2 text-gold-ink">→ Mock interview</span>
            </div>
          </Card>

          {/* Desktop cards */}
          <Card className="absolute left-0 top-[190px] hidden w-[360px] p-5 shadow-lp-float lg:block">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-extrabold">Your application workspace</span>
              <span className="rounded-full bg-canvas px-2 py-0.5 font-mono text-[10px] text-ink-muted">EXAMPLE</span>
            </div>
            <div className="mt-3.5 flex items-center gap-3.5 border-b border-line pb-3.5">
              <ReadinessRing size={76} />
              <div className="text-[12px] leading-[1.7] text-ink-soft">
                <div className="text-[13px] font-extrabold text-ink">Gulf Readiness</div>
                6 roles · 14 years
                <br />3 GCC projects · 4 certifications
              </div>
            </div>
            <div className="mt-3 text-[12px] text-ink-muted">Target job · Saudi Arabia</div>
            <div className="mt-0.5 text-[15px] font-extrabold">Senior Instrumentation Engineer</div>
            <div className="mt-3 flex flex-col gap-1.5 text-[13px]">
              {(
                [
                  ['Optimized CV · ATS 49 → 78', 'Ready'],
                  ['Cover letter · Professional', 'Ready'],
                  ['Interview Q&A · 25 answers', 'Ready'],
                  ['Mock interview', 'Next'],
                ] as const
              ).map(([label, state]) => (
                <div
                  key={label}
                  className={cn('flex justify-between rounded-[9px] px-2.5 py-2', state === 'Ready' ? 'bg-ok-soft' : 'bg-gold-soft')}
                >
                  <span>{label}</span>
                  <b className={state === 'Ready' ? 'text-ok' : 'text-gold-ink'}>{state}</b>
                </div>
              ))}
            </div>
          </Card>
          <Card className="absolute right-[18px] top-[400px] hidden w-[250px] px-[18px] py-4 shadow-[0_24px_50px_rgba(20,24,28,0.16)] lg:block">
            <div className="font-mono text-[11px] text-ink-muted">ATS MATCH · THIS JOB</div>
            <div className="mt-1.5 flex items-baseline gap-2.5">
              <span className="font-mono text-[22px] text-alert line-through">49</span>
              <span className="text-ink-muted" aria-hidden="true">→</span>
              <span className="font-mono text-[38px] font-semibold text-teal">78</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-teal-soft">
              <div className="h-full w-[78%] rounded-full bg-teal" />
            </div>
          </Card>
        </div>
      </Wrap>

      <Wrap className="lg:hidden">
        <Ctas className="mx-auto mt-[22px] md:max-w-[420px]" />
        <ul aria-label="Supported countries" className={cn(SWIPE_ROW, 'mt-[18px] gap-2 md:justify-center')}>
          {COUNTRY_CHIPS.map(([code, name]) => (
            <li key={code} className={CHIP}>
              <b className="font-mono text-gold-ink">{code}</b>
              {name}
            </li>
          ))}
        </ul>
      </Wrap>
    </section>
  )
}

const STRIP_ICON = 'size-[26px] shrink-0 text-teal'

const STRIP = [
  {
    title: 'Grounded in your profile',
    short: 'Your own facts',
    body: 'Written from your own facts',
    icon: (
      <svg className={STRIP_ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 19V5a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
        <path d="M9 13l2 2 4-4" />
      </svg>
    ),
  },
  {
    title: 'Built for Gulf hiring',
    short: 'Gulf hiring',
    body: 'Visa, notice, GCC projects',
    icon: (
      <svg className={STRIP_ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
      </svg>
    ),
  },
  {
    title: 'CV, letter and interview',
    short: 'CV + letter + prep',
    body: 'One workflow per application',
    icon: (
      <svg className={STRIP_ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M3 10h18M9 4v16" />
      </svg>
    ),
  },
  {
    title: 'All six GCC countries',
    short: 'Six GCC countries',
    body: 'Saudi to Bahrain',
    desktopOnly: true,
    icon: (
      <svg className={STRIP_ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
    ),
  },
  {
    title: 'You approve every line',
    short: 'You approve',
    body: 'Nothing added without you',
    icon: (
      <svg className={STRIP_ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 6L9 17l-5-5" />
      </svg>
    ),
  },
]

export function TrustStrip() {
  return (
    <section aria-label="What makes GCC Mentor different" className="py-[18px] lg:border-y lg:border-line lg:bg-white lg:py-7">
      <Wrap>
        <ul className="grid grid-cols-2 gap-x-3 gap-y-3.5 rounded-[18px] border border-line bg-white p-4 text-[13px] shadow-lp-card md:grid-cols-4 lg:grid-cols-5 lg:gap-6 lg:rounded-none lg:border-0 lg:p-0 lg:shadow-none">
          {STRIP.map((item) => (
            <li key={item.title} className={cn('flex gap-2 lg:gap-3', item.desktopOnly && 'hidden lg:flex')}>
              <span className="font-extrabold text-teal lg:hidden" aria-hidden="true">
                ✓
              </span>
              <span className="hidden lg:block">{item.icon}</span>
              <span>
                <b className="lg:hidden">{item.short}</b>
                <b className="hidden text-[14px] font-extrabold lg:block">{item.title}</b>
                <span className="block text-ink-muted lg:mt-0.5 lg:text-[13px]">{item.body}</span>
              </span>
            </li>
          ))}
        </ul>
      </Wrap>
    </section>
  )
}
