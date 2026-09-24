'use client'

import { useState } from 'react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Card, Eyebrow, H2, Lead, Wrap } from './ui'

function Mark({ tone, children }: { tone: 'kw' | 'ok' | 'gold'; children: ReactNode }) {
  return (
    <span
      className={cn(
        'rounded-md px-1.5 py-0.5 [box-decoration-break:clone]',
        tone === 'kw' && 'bg-blue-soft text-blue',
        tone === 'ok' && 'bg-ok-soft text-ok',
        tone === 'gold' && 'bg-gold-soft text-gold-ink',
      )}
    >
      {children}
    </span>
  )
}

/** Generic → targeted. One toggle; the CV card swaps between the two lines. */
export function BeforeAfter() {
  const [view, setView] = useState<'before' | 'after'>('after')
  const before = view === 'before'
  const scoreColor = before ? '#A33528' : '#0F4C43'

  const tab = (on: boolean, isBefore: boolean) =>
    cn(
      'min-h-11 rounded-[10px] px-[22px] text-[14px] font-extrabold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal lg:font-bold',
      on ? (isBefore ? 'bg-[#FBF1EF] text-alert' : 'bg-teal text-white') : 'text-ink-muted hover:text-ink',
    )

  return (
    <section id="scan" className="py-12 lg:border-y lg:border-line lg:bg-white lg:py-[104px]">
      <Wrap>
        <div className="lg:mx-auto lg:max-w-[760px] lg:text-center">
          <Eyebrow>Generic to targeted</Eyebrow>
          <H2>
            <span className="lg:hidden">
              Same experience. <em>Written for this job.</em>
            </span>
            <span className="hidden lg:inline">
              The same experience, <em>written for the job you want.</em>
            </span>
          </H2>
          <Lead className="hidden lg:mx-auto lg:block">
            GCC Mentor does not change what you did. It changes how clearly your CV shows it to this employer.
          </Lead>
        </div>

        <div className="mt-[18px] flex justify-center lg:mt-8">
          <div role="group" aria-label="Show the CV line before or after" className="grid w-full grid-cols-2 gap-1 rounded-[14px] border border-line bg-white p-1 lg:inline-flex lg:w-auto lg:bg-canvas lg:p-[5px]">
            <button type="button" aria-pressed={before} onClick={() => setView('before')} className={tab(before, true)}>
              Before<span className="hidden lg:inline"> · generic</span>
            </button>
            <button type="button" aria-pressed={!before} onClick={() => setView('after')} className={tab(!before, false)}>
              After<span className="hidden lg:inline"> · for this job</span>
            </button>
          </div>
        </div>

        <div className="mt-3 grid items-center lg:mt-9 lg:grid-cols-[minmax(0,0.9fr)_80px_minmax(0,1.1fr)]">
          <Card className="hidden bg-canvas p-[26px] lg:block">
            <div className="font-mono text-[11px] text-ink-muted">JOB DESCRIPTION · SAUDI ARABIA</div>
            <div className="mt-2.5 text-[18px] font-extrabold">Senior E&amp;I Commissioning Engineer</div>
            <p className="mt-3 text-[15px] leading-[1.9] text-ink-soft">
              Lead <Mark tone="kw">E&amp;I testing</Mark> and <Mark tone="kw">pre-commissioning</Mark>, including{' '}
              <Mark tone="kw">loop checks</Mark> and <Mark tone="kw">client coordination</Mark> through to{' '}
              <Mark tone="kw">handover</Mark>. GCC project experience required.
            </p>
          </Card>
          <div className="hidden justify-center text-teal lg:flex" aria-hidden="true">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" />
              <path d="M13 6l6 6-6 6" />
            </svg>
          </div>
          <Card className="border-2 p-[18px] transition-colors lg:p-[26px]" style={{ borderColor: scoreColor }}>
            <div aria-live="polite">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] text-ink-muted">
                  <span className="lg:hidden">YOUR CV LINE</span>
                  <span className="hidden lg:inline">YOUR CV · EXPERIENCE LINE</span>
                </span>
                <span className="flex items-baseline gap-1.5">
                  <span className="font-mono text-[11px] text-ink-muted">ATS</span>
                  <span className="font-mono text-[28px] font-semibold lg:text-[32px]" style={{ color: scoreColor }}>
                    {before ? 49 : 78}
                  </span>
                </span>
              </div>
              {before ? (
                <>
                  <p className="mt-2.5 text-[16px] leading-[1.65] text-ink-soft lg:mt-3.5 lg:text-[18px] lg:leading-[1.7]">
                    Responsible for electrical and instrumentation activities at site. Worked with the team on testing and
                    completed tasks as assigned.
                  </p>
                  <ul className="mt-3 flex flex-col gap-1 text-[13px] text-alert lg:mt-4 lg:gap-1.5 lg:text-[14px]">
                    <li>✕ No keywords from the job advert</li>
                    <li>✕ Your own role is unclear</li>
                    <li>✕ Nothing a recruiter can search for</li>
                  </ul>
                </>
              ) : (
                <>
                  <p className="mt-2.5 text-[16px] leading-[1.95] lg:mt-3.5 lg:text-[18px] lg:leading-[1.9]">
                    <Mark tone="ok">Led</Mark> <Mark tone="kw">E&amp;I testing</Mark> and <Mark tone="kw">pre-commissioning</Mark>{' '}
                    on site, coordinating <Mark tone="kw">loop checks</Mark> with the client team{' '}
                    <Mark tone="gold">through to handover</Mark>.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-ink-soft lg:mt-4 lg:text-[13px]">
                    <span><span className="text-ok">■</span> Green: reworded from your profile</span>
                    <span><span className="text-blue">■</span> Blue: keyword from the job</span>
                    <span><span className="text-gold">■</span> Yellow: kept only if you confirm</span>
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>
        <p className="mt-[18px] text-center text-[12.5px] text-ink-muted lg:text-[13px]">
          Example text. The review page shows your own CV in these colours so you can see, edit and approve every change.
        </p>
      </Wrap>
    </section>
  )
}
