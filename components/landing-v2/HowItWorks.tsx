'use client'

import Image from 'next/image'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { EXAMPLE_JOBS } from './data'
import { Eyebrow, H2, Wrap } from './ui'

/**
 * "One Career Profile. Every job you target." — design §5.
 * Built once (steps 1–2) → branches to three example target jobs (step 3) →
 * the selected job's pack (steps 4–7), tinted in that job's colour.
 * State is local so tapping a job never re-renders the rest of the page.
 */

const IDLE_LINE = '#E2DCD2'

function PackIcon({ children, color }: { children: ReactNode; color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}

const PACK = [
  {
    n: '04',
    title: 'Optimized CV',
    short: 'For this job description',
    long: 'Rewritten for this job description, with a review page.',
    icon: (
      <>
        <path d="M6 3h8l4 4v14H6z" />
        <path d="M14 3v4h4" />
        <path d="M9 12h6M9 16h4" />
      </>
    ),
  },
  {
    n: '05',
    title: 'Cover letter',
    short: 'Same story as the CV',
    long: 'Tells the same story as this CV.',
    icon: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 7l9 6 9-6" />
      </>
    ),
  },
  {
    n: '06',
    title: 'Interview Q&A',
    short: 'Questions for this role',
    long: 'Likely questions for this role, from your experience.',
    icon: (
      <>
        <path d="M4 5h12v9H9l-4 3v-3H4z" />
        <path d="M16 9h4v8h-1v3l-3-3h-5v-3" />
      </>
    ),
  },
  {
    n: '07',
    title: 'Mock interview',
    short: 'Practice + feedback',
    long: 'Written practice with a feedback report.',
    icon: (
      <>
        <rect x="9" y="3" width="6" height="11" rx="3" />
        <path d="M5 11a7 7 0 0 0 14 0" />
        <path d="M12 18v3" />
      </>
    ),
  },
] as const

function BuiltOnceCard({ n, title, short, long }: { n: string; title: string; short: string; long: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/25 bg-white/10 p-3.5 backdrop-blur-[6px] lg:gap-3.5 lg:rounded-[18px] lg:p-[18px]">
      <span className="flex size-[42px] shrink-0 items-center justify-center rounded-xl bg-gold-soft font-mono text-[14px] font-semibold text-teal lg:size-12 lg:rounded-[14px] lg:text-[15px]">
        {n}
      </span>
      <div>
        <div className="text-[15.5px] font-extrabold text-white lg:text-[17px]">{title}</div>
        <div className="mt-0.5 text-[12.5px] leading-[1.45] text-white/80 lg:mt-[3px] lg:text-[13.5px] lg:leading-[1.5]">
          <span className="lg:hidden">{short}</span>
          <span className="hidden lg:inline">{long}</span>
        </div>
      </div>
    </div>
  )
}

export function HowItWorks() {
  const [selected, setSelected] = useState(0)
  const job = EXAMPLE_JOBS[selected]
  const line = (i: number) => (i === selected ? EXAMPLE_JOBS[i].color : IDLE_LINE)
  const chips = [`ATS ${job.before} → ${job.after}`, job.tone, '25 answers', job.mock]

  return (
    <section id="journey" className="border-y border-line bg-white py-12 lg:py-[104px]">
      <Wrap>
        <div className="lg:flex lg:items-end lg:justify-between lg:gap-10">
          <div>
            <Eyebrow>How it works</Eyebrow>
            <H2>
              One Career Profile. <br className="hidden lg:block" />
              <em>Every job you target.</em>
            </H2>
          </div>
          <p className="mt-3 text-[16px] leading-[1.6] text-ink-soft lg:m-0 lg:max-w-[380px] lg:leading-[1.65]">
            <span className="lg:hidden">Build once. Then each job gets its own pack.</span>
            <span className="hidden lg:inline">
              Build your profile and readiness once. Then, for every job you target, you get a separate CV, cover letter,
              interview Q&amp;A and mock interview — all from the same facts.
            </span>
          </p>
        </div>

        <div className="mt-[22px] flex flex-col rounded-[26px] border border-line bg-canvas p-3 lg:mt-11 lg:rounded-[30px] lg:bg-white lg:p-[26px] lg:shadow-[0_30px_80px_rgba(20,24,28,0.08)]">
          {/* Steps 1–2: built once */}
          <div className="relative overflow-hidden rounded-[20px] bg-teal lg:rounded-3xl">
            <Image src="/landing/phase1-profile.jpg" alt="" fill sizes="(min-width: 1024px) 1100px, 100vw" className="object-cover opacity-[0.22]" />
            <div className="absolute inset-0 bg-[linear-gradient(160deg,rgba(15,76,67,.97),rgba(11,58,51,.9))] lg:bg-[linear-gradient(100deg,rgba(15,76,67,.98)_0%,rgba(15,76,67,.86)_45%,rgba(11,58,51,.9)_100%)]" />
            <div className="relative flex flex-col gap-2.5 p-[18px] lg:grid lg:grid-cols-[230px_minmax(0,1fr)_40px_minmax(0,1fr)] lg:items-center lg:gap-4 lg:p-7">
              <div className="flex items-baseline justify-between lg:block">
                <div className="font-mono text-[11px] font-semibold tracking-[0.1em] text-gold-soft max-lg:order-2 lg:text-[12px] lg:tracking-[0.12em]">
                  STEPS 1–2
                </div>
                <div className="font-display text-[24px] font-semibold leading-[1.05] text-white lg:mt-1.5 lg:text-[34px]">
                  Built <em className="font-medium">once.</em>
                </div>
                <div className="mt-2 hidden text-[14px] leading-[1.5] text-white/80 lg:block">Shared by every job you target.</div>
              </div>
              <BuiltOnceCard
                n="01"
                title="Career Profile"
                short="Upload your CV once — one checked record."
                long="Upload your CV once. Roles, projects, skills and certificates become one checked record."
              />
              <div className="-my-0.5 flex justify-center text-gold-soft lg:my-0">
                <svg className="size-4 lg:size-[26px] lg:-rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 4v16" />
                  <path d="M6 14l6 6 6-6" />
                </svg>
              </div>
              <BuiltOnceCard
                n="02"
                title="Gulf Readiness"
                short="A free score, plus what to fix first."
                long="A free score across six areas Gulf employers check, with what to fix first."
              />
            </div>
          </div>

          {/* Step 3: the branch */}
          <div className="relative h-16 lg:h-[78px]">
            <svg className="block h-full w-full" viewBox="0 0 1000 78" preserveAspectRatio="none" fill="none" aria-hidden="true">
              <path d="M500 0 V26 C500 50 167 40 167 78" stroke={line(0)} strokeWidth="3" vectorEffect="non-scaling-stroke" className="transition-[stroke] duration-300" />
              <path d="M500 0 V78" stroke={line(1)} strokeWidth="3" vectorEffect="non-scaling-stroke" className="transition-[stroke] duration-300" />
              <path d="M500 26 C500 50 833 40 833 78" stroke={line(2)} strokeWidth="3" vectorEffect="non-scaling-stroke" className="transition-[stroke] duration-300" />
            </svg>
            <div className="absolute left-1/2 top-3.5 -translate-x-1/2 whitespace-nowrap rounded-full border border-[#C9DCD6] bg-white px-3.5 py-[7px] text-[12.5px] font-extrabold text-teal shadow-[0_6px_16px_rgba(15,76,67,0.12)] lg:top-5 lg:px-[18px] lg:py-2 lg:text-[14px]">
              <span className="lg:hidden">Step 3 · Pick a target job</span>
              <span className="hidden lg:inline">Step 3 · Then, for each job you target — tap one</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 lg:gap-4" role="group" aria-label="Example target jobs">
            {EXAMPLE_JOBS.map((j, i) => {
              const on = i === selected
              return (
                <button
                  key={j.code}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setSelected(i)}
                  className="flex flex-col overflow-hidden rounded-2xl border-[3px] bg-white text-left transition-[border-color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 lg:rounded-[22px]"
                  style={{
                    borderColor: on ? j.color : '#EAE4DB',
                    boxShadow: on ? '0 18px 40px rgba(20,24,28,.16)' : '0 4px 12px rgba(20,24,28,.04)',
                  }}
                >
                  <span className="relative block h-[78px] w-full lg:h-[150px]">
                    <Image src={j.img} alt={j.alt} fill sizes="(min-width: 1024px) 360px, 33vw" className="object-cover" />
                    <span className="absolute inset-0 bg-[linear-gradient(0deg,rgba(20,24,28,.55),rgba(20,24,28,0)_55%)]" />
                    <span className="absolute left-[7px] top-[7px] rounded-[7px] bg-white px-[7px] py-[3px] font-mono text-[11px] font-semibold lg:left-3.5 lg:top-3.5 lg:rounded-[9px] lg:px-2.5 lg:py-[5px] lg:text-[13px]" style={{ color: j.color }}>
                      {j.code}
                    </span>
                    <span
                      className="absolute right-3.5 top-3.5 hidden rounded-full px-2.5 py-[5px] text-[12px] font-extrabold lg:block"
                      style={{ background: on ? j.color : 'rgba(255,255,255,.92)', color: on ? '#FFFFFF' : '#414B55' }}
                    >
                      {on ? '✓ Selected' : 'Tap to view'}
                    </span>
                    <span className="absolute bottom-3 left-3.5 hidden text-[12px] font-extrabold tracking-[0.1em] text-white lg:block">
                      TARGET JOB {i + 1}
                    </span>
                  </span>
                  <span className="flex flex-col px-[9px] pb-2.5 pt-2 lg:gap-[3px] lg:px-[18px] lg:pb-[18px] lg:pt-4">
                    <span className="text-[12.5px] font-extrabold text-ink lg:hidden">Job {i + 1}</span>
                    <span className="hidden text-[17px] font-extrabold leading-[1.3] text-ink lg:block">{j.title}</span>
                    <span className="text-[11px] text-ink-muted lg:text-[13.5px]">{j.country}</span>
                  </span>
                </button>
              )
            })}
          </div>

          <div className="flex justify-center" aria-hidden="true">
            <svg className="h-[30px] w-4 lg:h-10 lg:w-5" viewBox="0 0 20 40" fill="none" stroke={job.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 2v34" />
              <path d="M3 29l7 7 7-7" />
            </svg>
          </div>

          {/* Steps 4–7: the pack for the selected job */}
          <div
            aria-live="polite"
            className="rounded-[20px] border-2 p-3.5 transition-colors duration-300 lg:rounded-3xl lg:p-6"
            style={{ background: job.soft, borderColor: job.color }}
          >
            <div className="lg:flex lg:items-center lg:justify-between lg:gap-4">
              <div>
                <div className="font-mono text-[10.5px] font-semibold tracking-[0.1em] lg:text-[12px] lg:tracking-[0.12em]" style={{ color: job.color }}>
                  <span className="lg:hidden">STEPS 4–7 · PACK FOR JOB {selected + 1}</span>
                  <span className="hidden lg:inline">STEPS 4–7 · YOUR PACK FOR TARGET JOB {selected + 1}</span>
                </div>
                <div className="mt-[3px] font-display text-[19px] font-semibold leading-[1.25] lg:mt-1 lg:text-[26px]">
                  {job.title}
                  <span className="hidden font-medium text-ink-muted lg:inline"> · {job.country}</span>
                </div>
                <div className="mt-0.5 text-[12.5px] text-ink-muted lg:hidden">{job.country} · written for this job only</div>
              </div>
              <span className="hidden shrink-0 rounded-full bg-white px-3.5 py-2 text-[13px] font-extrabold lg:block" style={{ color: job.color }}>
                Written for this job only
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 lg:mt-5 lg:grid-cols-4 lg:gap-3.5">
              {PACK.map((p, i) => (
                <div key={p.n} className="relative flex flex-col gap-1.5 overflow-hidden rounded-2xl bg-white p-3.5 shadow-[0_8px_20px_rgba(20,24,28,0.07)] lg:gap-2 lg:rounded-[18px] lg:p-5">
                  <div className="absolute inset-x-0 top-0 h-1 transition-colors duration-300" style={{ background: job.color }} />
                  <div className="flex items-center justify-between">
                    <span className="flex size-[38px] items-center justify-center rounded-[11px] lg:size-[46px] lg:rounded-[14px]" style={{ background: job.soft }}>
                      <PackIcon color={job.color}>{p.icon}</PackIcon>
                    </span>
                    <span className="font-mono text-[12px] font-semibold text-[#B9AE9E] lg:text-[13px]">{p.n}</span>
                  </div>
                  <div className="mt-0.5 text-[14.5px] font-extrabold lg:mt-1 lg:text-[17px]">{p.title}</div>
                  <span className="self-start rounded-full px-[9px] py-1 text-[12px] font-extrabold lg:px-[11px] lg:py-[5px] lg:text-[13px]" style={{ background: job.soft, color: job.color }}>
                    {chips[i]}
                  </span>
                  <div className="text-[12px] leading-[1.4] text-ink-muted lg:text-[13px] lg:leading-[1.5]">
                    <span className="lg:hidden">{p.short}</span>
                    <span className="hidden lg:inline">{p.long}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-2.5 flex justify-center lg:mt-[18px]">
            <div className="flex w-full items-center justify-center gap-2.5 rounded-xl border-[1.5px] border-dashed border-line-strong bg-white px-3 py-[11px] text-center text-[12.5px] font-bold text-ink-muted lg:inline-flex lg:w-auto lg:bg-canvas lg:px-4 lg:py-2.5 lg:text-[13px]">
              <svg className="hidden size-4 lg:block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span className="lg:hidden">+ Add job 4, 5, 6… — same profile, new pack each</span>
              <span className="hidden lg:inline">Add target job 4, 5, 6… — same profile, a new pack for each</span>
            </div>
          </div>
        </div>
        <p className="mt-3 text-center text-[12.5px] text-ink-muted lg:text-[13px]">Example jobs and scores, for illustration.</p>
      </Wrap>
    </section>
  )
}
