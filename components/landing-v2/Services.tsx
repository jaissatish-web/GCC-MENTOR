import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { NotLiveText } from '@/components/ui/NotLive'
import { AVAILABLE_TEMPLATE_COUNT } from './data'
import { Bar, Card, Eyebrow, H2, Lead, SWIPE_ROW, Wrap } from './ui'

const PHASES = [
  {
    n: 1,
    img: '/landing/phase1-profile.jpg',
    alt: 'Hands typing on a laptop',
    title: 'Know where you stand',
    note: 'Free',
    mobileTag: '1 · FREE',
    mobileList: ['Career Profile', 'Gulf Readiness score'],
  },
  {
    n: 2,
    img: '/landing/phase2-cover-letter.jpg',
    alt: 'Writing notes beside a laptop',
    title: 'Build the application',
    note: 'For each target job',
    mobileTag: '2 · PER JOB',
    mobileList: ['Resume Optimizer (ATS before/after)', `${AVAILABLE_TEMPLATE_COUNT} GCC templates · PDF`, 'Cover letter in 4 tones', 'Resume Library'],
  },
  {
    n: 3,
    img: '/landing/phase3-interview-panel.jpg',
    alt: 'A candidate facing an interview panel',
    title: 'Prepare for the interview',
    note: 'From your optimized CV',
    mobileTag: '3 · PER JOB',
    mobileList: ['Interview Q&A (up to 25)', 'Written mock interview + feedback'],
  },
] as const

function PhasePhoto({ phase, className }: { phase: (typeof PHASES)[number]; className?: string }) {
  return (
    <Card className={cn('relative min-h-[300px] overflow-hidden', className)}>
      <Image src={phase.img} alt={phase.alt} fill sizes="440px" className="object-cover" />
      <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(15,76,67,.92),rgba(15,76,67,0)_60%)]" />
      <div className="absolute bottom-[22px] left-6 text-white">
        <div className="font-mono text-[12px] opacity-85">PHASE {phase.n}</div>
        <div className="font-display text-[28px] font-semibold">{phase.title}</div>
        <div className="mt-1 inline-block rounded-full bg-white/20 px-2.5 py-1 text-[13px] font-bold">{phase.note}</div>
      </div>
    </Card>
  )
}

function ServiceCard({ title, body, href, cta, children }: { title: string; body: string; href?: string; cta?: string; children?: ReactNode }) {
  return (
    <Card className="flex flex-col gap-2.5 p-6">
      <div className="text-[19px] font-extrabold">{title}</div>
      <div className="text-[14px] leading-[1.6] text-ink-soft">{body}</div>
      {children}
      {href && cta ? (
        <Link href={href} className="mt-auto pt-1 text-[14px] font-extrabold text-teal hover:text-[#0B3A33]">
          {cta} →
        </Link>
      ) : null}
    </Card>
  )
}

function Pills({ items }: { items: ReadonlyArray<readonly [string, string]> }) {
  return (
    <div className="flex flex-wrap gap-1.5 text-[11px] font-bold">
      {items.map(([label, cls]) => (
        <span key={label} className={cn('rounded-full px-[9px] py-1', cls)}>
          {label}
        </span>
      ))}
    </div>
  )
}

const MUTED_PILL = 'bg-canvas text-ink-muted'

export function Services() {
  return (
    <section id="services" className="border-y border-line bg-white py-10 lg:border-0 lg:bg-transparent lg:py-[104px]">
      <Wrap>
        <Eyebrow>Services</Eyebrow>
        <H2>
          Everything a Gulf application needs, <em>in one place.</em>
        </H2>
        <Lead className="hidden lg:block">
          Each service uses your Career Profile and the job you are targeting, and keeps its results with that job.
        </Lead>

        {/* Phones and tablets: one swipe card per phase */}
        <ul className={cn(SWIPE_ROW, 'mt-[18px] lg:hidden')}>
          {PHASES.map((p) => (
            <li key={p.n} className="w-[290px] shrink-0 snap-start md:w-[320px]">
              <Card className="h-full overflow-hidden">
                <div className="relative h-[130px]">
                  <Image src={p.img} alt={p.alt} fill sizes="320px" className="object-cover" />
                  <span className="absolute left-3 top-3 rounded-full bg-white px-2.5 py-1 text-[11px] font-extrabold text-teal">{p.mobileTag}</span>
                </div>
                <div className="p-4">
                  <div className="font-display text-[20px] font-semibold">{p.title}</div>
                  <ul className="mt-2 text-[13.5px] leading-[1.7] text-ink-soft">
                    {p.mobileList.map((item) => (
                      <li key={item}>✓ {item}</li>
                    ))}
                  </ul>
                </div>
              </Card>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[12.5px] text-ink-muted lg:hidden">Swipe for all three phases →</p>

        {/* Desktop: photo + service cards per phase */}
        <div className="hidden lg:block">
          <div className="mt-11 grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] items-stretch gap-5">
            <PhasePhoto phase={PHASES[0]} />
            <div className="grid grid-cols-2 gap-4">
              <ServiceCard title="Career Profile" body="Your roles, projects, skills, education and certificates in one place. Every document is written only from it." href="/signup" cta="Create my profile">
                <div className="mt-1 flex flex-col gap-1.5 text-[13px]">
                  <div><span className="text-ok">✓</span> Personal &amp; contact — visa and notice</div>
                  <div><span className="text-ok">✓</span> Work experience — 4 roles read</div>
                  <div><span className="text-gold-ink">·</span> Certifications — add yours</div>
                </div>
              </ServiceCard>
              <ServiceCard title="Gulf Readiness" body="A score across six areas Gulf employers look at — with what to fix before you apply. No account needed." href="/gulf-readiness-score" cta="Check my readiness">
                <div className="mt-1 flex flex-col gap-1.5 text-[12px]">
                  {(
                    [
                      ['Gulf position', 80, 'teal'],
                      ['Experience', 74, 'teal'],
                      ['CV targeting', 46, 'gold'],
                    ] as const
                  ).map(([label, v, tone]) => (
                    <div key={label} className="flex items-center gap-2">
                      <span className="w-[92px]">{label}</span>
                      <Bar value={v} tone={tone} className="flex-1" />
                    </div>
                  ))}
                </div>
              </ServiceCard>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] items-stretch gap-5">
            <div className="grid grid-cols-2 gap-4">
              <ServiceCard title="Resume Optimizer" body="Your CV rewritten for one job title and description, with a review page to edit it." href="/signup" cta="Optimize a CV">
                <div className="mt-1 flex flex-col gap-2 text-[12px]">
                  <div className="flex items-center gap-2">
                    <span className="w-[42px] text-ink-muted">Before</span>
                    <Bar value={49} tone="muted" className="h-2 flex-1" />
                    <span className="font-mono">49</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-[42px] text-ink-muted">After</span>
                    <Bar value={78} className="h-2 flex-1" />
                    <span className="font-mono text-teal">78</span>
                  </div>
                </div>
              </ServiceCard>
              <ServiceCard
                title="GCC resume templates"
                body={`${AVAILABLE_TEMPLATE_COUNT} layouts, plain ATS-safe to photo-led. Switch template, font and colour without retyping. PDF download.`}
                href="#templates"
                cta="See the templates"
              />
              <ServiceCard title="Resume Library" body="Every target job with its CV, letter and interview prep — saved, applied, interview, offer.">
                <Pills items={[['Saved', MUTED_PILL], ['Applied', 'bg-blue-soft text-blue'], ['Interview', 'bg-gold-soft text-gold-ink'], ['Offer', 'bg-ok-soft text-ok']]} />
              </ServiceCard>
              <ServiceCard title="Cover Letter" body="A letter for the same job, from the same CV — so both tell one story.">
                <Pills items={[['Professional', 'bg-teal-soft text-teal'], ['Short', MUTED_PILL], ['Technical', MUTED_PILL], ['Explanatory', MUTED_PILL]]} />
              </ServiceCard>
            </div>
            <PhasePhoto phase={PHASES[1]} />
          </div>

          <div className="mt-5 grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] items-stretch gap-5">
            <PhasePhoto phase={PHASES[2]} className="min-h-[280px]" />
            <div className="grid grid-cols-2 gap-4">
              <ServiceCard title="Interview Q&A" body="Up to 25 likely questions for this job, with answers from your own experience — saved with the job." href="/signup" cta="Get started" />
              <ServiceCard title="Mock Interview" body="A written practice interview, one question at a time, with a saved feedback report." href="/signup" cta="Get started" />
            </div>
          </div>
          <p className="mt-4 text-[13px] text-ink-muted">
            <NotLiveText>Planned:</NotLiveText> Saved Jobs, to keep roles you want to apply to. Not available yet.
          </p>
        </div>
      </Wrap>
    </section>
  )
}

export function Markets() {
  const small = [
    ['QA', 'Qatar', 'Doha · Ras Laffan'],
    ['OM', 'Oman', 'Muscat · Sohar · Duqm'],
    ['KW', 'Kuwait', 'Kuwait City · Ahmadi'],
    ['BH', 'Bahrain', 'Manama · Sitra'],
  ] as const
  const big = [
    ['SA', 'Saudi Arabia', 'Riyadh · Jeddah · Dammam · Jubail', '/landing/market-saudi-riyadh.jpg', 'Riyadh skyline at sunset'],
    ['AE', 'United Arab Emirates', 'Dubai · Abu Dhabi · Sharjah · Ruwais', '/landing/market-uae-dubai.jpg', 'Dubai skyline at night over the water'],
  ] as const
  return (
    <section className="pb-10 pt-2 lg:pb-[104px] lg:pt-5">
      <Wrap>
        <Eyebrow>Six GCC markets</Eyebrow>
        <H2>
          Written for how <em>Gulf employers</em> read a CV.
        </H2>
        <Lead className="hidden md:block">
          Visa and notice status, GCC project exposure, client and industry standards, certifications and measurable
          scope — the details Gulf recruiters look for, presented clearly.
        </Lead>
        <div className="mt-[18px] grid grid-cols-2 gap-2.5 lg:mt-9 lg:grid-cols-4 lg:gap-4">
          {big.map(([code, name, cities, img, alt]) => (
            <div key={code} className="relative col-span-2 h-40 overflow-hidden rounded-[18px] md:col-span-1 md:h-[220px] lg:col-span-2 lg:h-[270px] lg:rounded-[20px]">
              <Image src={img} alt={alt} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
              <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(20,24,28,0.82),rgba(20,24,28,0)_60%)]" />
              <div className="absolute bottom-3.5 left-4 text-white lg:bottom-[22px] lg:left-6">
                <div className="hidden font-mono text-[12px] text-gold-soft lg:block">{code}</div>
                <div className="text-[20px] font-extrabold lg:text-[26px]">{name}</div>
                <div className="text-[12.5px] opacity-90 lg:text-[14px]">{cities}</div>
              </div>
            </div>
          ))}
          {small.map(([code, name, cities]) => (
            <Card key={code} className="p-3.5 lg:p-[22px]">
              <div className="hidden font-mono text-[12px] text-gold-ink lg:block">{code}</div>
              <div className="font-extrabold lg:mt-1.5 lg:text-[20px]">{name}</div>
              <div className="text-[12.5px] text-ink-muted lg:mt-1 lg:text-[14px]">{cities}</div>
            </Card>
          ))}
        </div>
        <p className="mt-3 text-[12px] text-ink-muted lg:mt-4 lg:text-[13px]">
          GCC Mentor prepares your application. It is not a recruitment agency and does not list jobs, place candidates or
          promise employment in any country.
        </p>
      </Wrap>
    </section>
  )
}
