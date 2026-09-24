import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { NotLiveText } from '@/components/ui/NotLive'
import { AVAILABLE_TEMPLATE_COUNT, CONTACT_EMAIL, FAQ } from './data'
import { BTN, BTN_LINE, BTN_TEAL, Card, Eyebrow, H2, Wrap } from './ui'

function Tick() {
  return <span className="text-ok">✓</span>
}

/** No price is printed while checkout is not live (founder decision M10, reconfirmed 2026-09-24). */
export function Pricing() {
  return (
    <section id="pricing" className="pb-10 lg:border-t lg:border-line lg:bg-white lg:py-[104px]">
      <Wrap>
        <div className="lg:text-center">
          <Eyebrow>Pricing</Eyebrow>
          <H2>
            Start free. <em>Add application services when you need them.</em>
          </H2>
        </div>
        <div className="mx-auto mt-[18px] grid max-w-[960px] gap-3 md:grid-cols-2 lg:mt-11 lg:gap-5">
          <Card className="flex flex-col gap-2 p-5 lg:gap-3.5 lg:bg-canvas lg:p-[34px]">
            <div className="font-mono text-[11px] text-ink-muted lg:text-[12px]">FREE</div>
            <div className="font-display text-[22px] font-semibold lg:text-[30px]">Know where you stand</div>
            <ul className="flex flex-col gap-1 text-[14px] leading-[1.6] text-ink-soft lg:gap-2.5 lg:text-[15px]">
              <li><Tick /> Gulf Readiness score — no account or card</li>
              <li><Tick /> Career Profile, read from your CV</li>
              <li className="hidden lg:list-item"><Tick /> Strengths, gaps and what to fix first</li>
              <li><Tick /> Browse all {AVAILABLE_TEMPLATE_COUNT} resume templates</li>
              <li className="hidden lg:list-item"><Tick /> Delete your data at any time</li>
            </ul>
            <Link href="/gulf-readiness-score" className={cn(BTN_LINE, 'mt-auto')}>
              Check my readiness — free
            </Link>
          </Card>
          <Card className="relative flex flex-col gap-2 border-2 border-teal p-5 lg:gap-3.5 lg:p-[34px]">
            <span className="absolute -top-[13px] left-5 rounded-full bg-gold px-3 py-[5px] text-[11px] font-extrabold tracking-[0.08em] text-ink lg:left-[34px]">
              APPLICATION SERVICES
            </span>
            <div className="mt-2 font-mono text-[11px] text-gold-ink lg:mt-0 lg:text-[12px]">PRICED PER JOB · CONFIRM DIRECTLY</div>
            <div className="font-display text-[22px] font-semibold lg:text-[30px]">Build and prepare for each job</div>
            <ul className="flex flex-col gap-1 text-[14px] leading-[1.6] text-ink-soft lg:gap-2.5 lg:text-[15px]">
              <li><Tick /> Optimized CV with ATS score before and after</li>
              <li><Tick /> Review page — edit and approve every change</li>
              <li><Tick /> PDF download in any GCC template</li>
              <li><Tick /> Cover letter in four tones</li>
              <li><Tick /> Interview Q&amp;A and written mock interview</li>
            </ul>
            <Link href="/signup" className={cn(BTN_TEAL, 'mt-auto')}>
              Create my account
            </Link>
          </Card>
        </div>
        <p className="mt-3 text-[12px] text-ink-muted lg:mt-5 lg:text-center lg:text-[13px]">
          <NotLiveText>Card checkout is not live yet.</NotLiveText> Current access is shown in your account. Confirm any
          price and what it includes directly with GCC Mentor before paying.
        </p>
      </Wrap>
    </section>
  )
}

export function Faq() {
  return (
    <section id="faq" className="pb-10 lg:py-[104px]">
      <Wrap className="grid gap-[18px] lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:gap-16">
        <div>
          <Eyebrow>Questions</Eyebrow>
          <H2 className="lg:text-[40px]">
            Before <em>you start.</em>
          </H2>
          <div className="relative mt-7 hidden h-[260px] overflow-hidden rounded-[18px] lg:block">
            <Image src="/landing/faq-handshake.jpg" alt="Two professionals shaking hands across a table" fill sizes="400px" className="object-cover" />
          </div>
          <p className="mt-4 hidden leading-[1.6] text-ink-soft lg:block">
            Still unsure? Email{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-teal hover:underline">
              {CONTACT_EMAIL}
            </a>
          </p>
        </div>
        <div className="flex flex-col gap-2 lg:gap-2.5">
          {FAQ.map(([q, a], i) => (
            <details key={q} open={i === 0} className="group overflow-hidden rounded-[18px] border border-line bg-white shadow-lp-card">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-[15px] font-bold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal lg:min-h-[60px] lg:gap-4 lg:px-[22px] lg:py-[18px] lg:text-[16px] [&::-webkit-details-marker]:hidden">
                {q}
                <span aria-hidden="true" className="shrink-0 text-[20px] leading-none text-ink-muted group-open:hidden">+</span>
                <span aria-hidden="true" className="hidden shrink-0 text-[20px] leading-none text-teal group-open:inline">−</span>
              </summary>
              <p className="px-4 pb-4 text-[14px] leading-[1.6] text-ink-soft lg:px-[22px] lg:pb-5 lg:text-[15px] lg:leading-[1.65]">{a}</p>
            </details>
          ))}
          <p className="mt-2 text-[14px] text-ink-soft lg:hidden">
            Still unsure? Email{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-teal">
              {CONTACT_EMAIL}
            </a>
          </p>
        </div>
      </Wrap>
    </section>
  )
}

export function FinalCta() {
  return (
    <section id="score" className="pb-8 lg:pb-[104px]">
      <Wrap>
        <div className="relative overflow-hidden rounded-3xl lg:rounded-[28px]">
          <Image src="/landing/cta-dubai-night.jpg" alt="Dubai skyline at night" fill sizes="(min-width: 1024px) 1120px, 100vw" className="object-cover" />
          <div className="absolute inset-0 bg-[rgba(15,76,67,0.88)] lg:bg-[rgba(15,76,67,0.86)]" />
          <div className="relative grid gap-[18px] px-[22px] py-[30px] text-center text-white lg:grid-cols-2 lg:items-center lg:gap-12 lg:px-[60px] lg:py-[72px] lg:text-left">
            <div>
              <h2 className="font-display text-[28px] font-semibold leading-[1.1] tracking-[-0.02em] lg:text-[48px] lg:leading-[1.08]">
                See where you stand <em className="font-medium text-gold-soft">today.</em>{' '}
                <span className="hidden lg:inline">
                  <em className="font-medium text-gold-soft">Build your next application from there.</em>
                </span>
              </h2>
              <p className="mt-2.5 text-[14.5px] leading-[1.6] text-white/85 lg:mt-4 lg:text-[18px] lg:leading-[1.65]">
                Upload your CV for a free Gulf Readiness score. If you continue, the same upload starts your Career Profile.
              </p>
            </div>
            <div className="lg:rounded-[20px] lg:border-2 lg:border-dashed lg:border-gold-soft/70 lg:bg-white/[0.08] lg:p-[34px] lg:text-center">
              <Link
                href="/gulf-readiness-score"
                className="block rounded-[18px] border-2 border-dashed border-gold-soft/70 bg-white/[0.08] px-4 py-[22px] transition-colors hover:bg-white/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:hover:bg-transparent"
              >
                <svg className="mx-auto size-9 lg:size-12" viewBox="0 0 24 24" fill="none" stroke="#F7EFDD" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 16V4" />
                  <path d="M7 9l5-5 5 5" />
                  <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
                </svg>
                <div className="mt-1.5 font-extrabold lg:mt-3 lg:text-[18px]">Upload your CV</div>
                <div className="text-[12.5px] opacity-80 lg:mt-1.5 lg:text-[14px]">PDF or Word · no account · no card</div>
              </Link>
              <div className="mt-3 flex flex-col justify-center gap-2.5 lg:mt-[22px] lg:flex-row lg:flex-wrap">
                <Link href="/gulf-readiness-score" className={cn(BTN, 'hidden bg-white text-teal hover:bg-canvas focus-visible:ring-white lg:inline-flex')}>
                  Check my Gulf readiness — free
                </Link>
                <Link href="/login" className={cn(BTN, 'border border-white/50 text-white hover:bg-white/10 focus-visible:ring-white')}>
                  I already have an account
                </Link>
              </div>
            </div>
          </div>
        </div>
      </Wrap>
    </section>
  )
}

/** Phones and tablets only. The page adds bottom padding so it never covers the footer. */
export function MobileStickyCta() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-2.5 border-t border-line bg-white/95 px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom,0px))] backdrop-blur-[10px] lg:hidden">
      <div className="flex-1 text-[12px] leading-[1.35] text-ink-muted">
        <b className="text-[13.5px] text-ink">Free Gulf Readiness</b>
        <br />1 upload · no card
      </div>
      <Link href="/gulf-readiness-score" className={cn(BTN_TEAL, 'min-h-12 text-[14px]')}>
        Score my CV
      </Link>
    </div>
  )
}
