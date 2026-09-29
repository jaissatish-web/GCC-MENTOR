'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { FileText, Mail, MessagesSquare, Mic } from 'lucide-react'
import { cn } from '@/lib/utils'
import s from './concept.module.css'
import { useAutoStep, useInView, useReducedMotion } from './hooks'
import { PERSONAS } from './personas'
import { Check, Meter, PersonaSwitch, Rich, Tag } from './primitives'

/**
 * How it works, as the product really works: ONE profile is built once
 * (steps 1–2), then it BRANCHES into as many target jobs as you apply for
 * (step 3), and every job gets its own pack (steps 4–7). A profession switch
 * on top swaps the example candidate, so nobody reads it as "engineers only".
 */

const TONES = ['Professional', 'Technical', 'Short'] as const
const LANE_H = 96
const LANE_GAP = 12
const TREE_H = LANE_H * 3 + LANE_GAP * 2

function mockFor(overall: number, i: number) {
  return overall - [0, 4, 2][i]
}

export function BranchJourney() {
  const reduced = useReducedMotion()
  const [who, setWho] = useState(1)
  const { ref, visible } = useInView<HTMLDivElement>(0.3)
  const [hover, setHover] = useState(false)
  const { index: lane, choose, setIndex } = useAutoStep(3, 3600, visible && !reduced && !hover)
  const p = PERSONAS[who]
  const job = p.jobs[lane]

  // New profession → start again from its first target job.
  useEffect(() => setIndex(0), [who, setIndex])

  const questions = [p.mock.question, `Why do you want to work in ${job.country}?`, `Describe your experience with ${p.skills[0]}.`]

  return (
    <div ref={ref} className="mt-6 lg:mt-8" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <span className="text-[13px] font-semibold text-ink-soft">See it for:</span>
        <PersonaSwitch personas={PERSONAS} active={who} onChange={setWho} label="Choose a profession" />
      </div>

      <div className="mt-6 rounded-[24px] border border-line bg-canvas p-3 sm:p-5 lg:mt-8 lg:p-8">
        <div className="grid gap-3 lg:grid-cols-[250px_56px_minmax(0,1fr)] lg:items-center lg:gap-0">
          {/* ── Trunk: built once ── */}
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-1 lg:gap-3">
            <div key={`profile-${who}`} className={cn(s.enter, 'rounded-[16px] border border-line bg-white p-3 shadow-m-1 lg:p-4')}>
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-teal">1 · Career Profile</div>
              <div className="mt-2 flex items-center gap-2.5">
                <span className="relative size-10 shrink-0 overflow-hidden rounded-full ring-2 ring-teal-soft">
                  <Image src={p.photo} alt="" fill sizes="40px" className="object-cover" />
                </span>
                <span className="min-w-0 leading-tight">
                  <b className="block truncate text-[13px] text-ink">{p.name}</b>
                  <span className="block truncate text-[11.5px] text-ink-muted">{p.role} · {p.years} yrs</span>
                </span>
              </div>
              <div className="mt-2 hidden text-[11.5px] text-ink-soft sm:block">Built once from your CV. Your source of truth.</div>
            </div>
            <div className="rounded-[16px] border border-line bg-white p-3 shadow-m-1 lg:p-4">
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-teal">2 · Gulf Readiness</div>
              <div className="mt-2 flex items-center gap-2.5">
                <span className="font-mono text-[28px] font-medium leading-none text-teal">{p.readiness[1]}</span>
                <span className="text-[11.5px] leading-tight text-ink-muted">
                  was <s>{p.readiness[0]}</s>
                  <br />
                  gaps fixed first
                </span>
              </div>
              <Meter value={p.readiness[1]} className="mt-2" />
            </div>
          </div>

          {/* ── Branch: desktop curves ── */}
          <svg viewBox={`0 0 56 ${TREE_H}`} width="56" height={TREE_H} className="hidden lg:block" aria-hidden="true">
            {[0, 1, 2].map((i) => {
              const y = i * (LANE_H + LANE_GAP) + LANE_H / 2
              const on = i === lane
              return (
                <path
                  key={i}
                  d={`M0 ${TREE_H / 2} C 30 ${TREE_H / 2}, 26 ${y}, 56 ${y}`}
                  fill="none"
                  stroke={on ? '#0F4C43' : '#D2C9BC'}
                  strokeWidth={on ? 2.5 : 1.5}
                  strokeDasharray={on ? undefined : '4 5'}
                  className="transition-[stroke] duration-300"
                />
              )
            })}
          </svg>
          {/* Branch: phones — a short label instead of curves. */}
          <div className="flex items-center gap-2 px-1 lg:hidden" aria-hidden="true">
            <span className="h-px flex-1 bg-line-strong" />
            <span className="text-[11.5px] font-semibold text-ink-muted">3 · then one branch per target job</span>
            <span className="h-px flex-1 bg-line-strong" />
          </div>

          {/* ── Lanes: one per target job ──
               Phones: a vertical tree — a trunk line on the left with a branch
               into each job card, and each card shows its own 4-step pack.
               Desktop: the same cards as rows, fed by the curves above. */}
          <ol className="relative flex flex-col pl-5 lg:pl-0" style={{ gap: LANE_GAP }} aria-label="Target jobs">
            <span className="absolute bottom-[46px] left-[7px] top-0 w-[2px] rounded-full bg-teal/30 lg:hidden" aria-hidden="true" />
            {p.jobs.map((j, i) => {
              const on = i === lane
              return (
                <li key={`${who}-${i}`} className="relative">
                  {/* the branch into this card (phones) */}
                  <span className={cn('absolute -left-[13px] top-[30px] h-[2px] w-[13px] lg:hidden', on ? 'bg-teal' : 'bg-teal/30')} aria-hidden="true" />
                  <span className={cn('absolute -left-[17px] top-[26px] size-2.5 rounded-full border-2 border-white lg:hidden', on ? 'bg-teal' : 'bg-teal/40')} aria-hidden="true" />
                  <button
                    type="button"
                    onClick={() => choose(i)}
                    aria-pressed={on}
                    className={cn(
                      'grid w-full items-center gap-2 rounded-[16px] border p-2.5 text-left transition-[background-color,border-color,box-shadow,opacity] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal lg:h-[96px] lg:grid-cols-[210px_repeat(4,minmax(0,1fr))] lg:gap-2 lg:p-3',
                      on ? 'border-teal bg-white shadow-m-3' : 'border-line bg-white/80 hover:border-teal/40',
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className={cn('grid size-9 shrink-0 place-items-center rounded-[10px] font-mono text-[12px] font-medium', on ? 'bg-teal text-white' : 'bg-teal-soft text-teal')}>{j.code}</span>
                      <span className="min-w-0 leading-tight">
                        <span className="block font-mono text-[9.5px] uppercase tracking-[0.12em] text-gold-ink">Target job {i + 1} · {j.country}</span>
                        <b className="block truncate text-[13.5px] text-ink">{j.title}</b>
                        <span className="block truncate text-[11px] text-ink-muted">{j.employer}</span>
                      </span>
                    </span>
                    {/* This job's own pack, steps 4–7. A 4-up row on phones; grid cells on desktop. */}
                    <span className="grid grid-cols-4 gap-1 lg:contents">
                      {[
                        [FileText, 'CV', `${j.before}→${j.after}`],
                        [Mail, 'Letter', TONES[i]],
                        [MessagesSquare, 'Q&A', '25'],
                        [Mic, 'Mock', String(mockFor(p.mock.overall, i))],
                      ].map(([Icon, label, val], k) => {
                        const I = Icon as typeof FileText
                        return (
                          <span
                            key={label as string}
                            className={cn(
                              'flex min-w-0 flex-col items-center gap-0.5 rounded-[9px] px-1 py-1.5 text-center lg:flex-row lg:items-center lg:gap-1.5 lg:rounded-[10px] lg:px-2 lg:py-2 lg:text-left',
                              on ? 'bg-ok-soft' : 'bg-fill-subtle',
                            )}
                          >
                            <I className={cn('size-3.5 shrink-0 lg:size-4', on ? 'text-ok' : 'text-ink-muted')} aria-hidden="true" />
                            <span className="min-w-0 max-w-full leading-tight">
                              <span className="block text-[9.5px] font-semibold text-ink-muted lg:text-[10px]">
                                <span className="hidden lg:inline">{k + 4} · </span>
                                {label as string}
                              </span>
                              <span className="block truncate text-[10.5px] font-semibold text-ink lg:text-[12px]">{val as string}</span>
                            </span>
                          </span>
                        )
                      })}
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
        </div>

        {/* ── Selected job: its pack, steps 4–7 ── */}
        <div className="mt-4 lg:mt-6">
          <div className="mb-2.5 flex flex-wrap items-center gap-2 text-[13px] font-semibold text-ink">
            <Tag tone="gold">Target job {lane + 1}</Tag>
            {job.title} · {job.country}
          </div>
          <div key={`${who}-${lane}`} className={cn(s.enter, '-mx-3 flex snap-x gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4 lg:gap-3 [&>*]:w-[78%] [&>*]:shrink-0 [&>*]:snap-start sm:[&>*]:w-auto [&::-webkit-scrollbar]:hidden')}>
            <div className="rounded-[14px] border border-line bg-white p-3.5">
              <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-teal">4 · Optimized CV</div>
              <div className="mt-1.5 flex items-baseline gap-1.5 font-mono">
                <s className="text-[13px] text-alert">{job.before}</s>
                <span className="text-ink-muted">→</span>
                <b className="text-[22px] font-medium text-teal">{job.after}</b>
                <span className="text-[11px] text-ink-muted">ATS</span>
              </div>
              <p className="mt-1.5 text-[12px] leading-snug text-ink-soft"><Rich text={p.bullets[lane % 2]} /></p>
            </div>
            <div className="rounded-[14px] border border-line bg-white p-3.5">
              <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-teal">5 · Cover letter</div>
              <Tag tone="teal" className="mt-1.5">{TONES[lane]} tone</Tag>
              <p className="mt-1.5 text-[12px] leading-snug text-ink-soft">Dear Hiring Manager, {p.cover}</p>
            </div>
            <div className="rounded-[14px] border border-line bg-white p-3.5">
              <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-teal">6 · Interview Q&amp;A</div>
              <div className="mt-1.5 text-[12px] text-ink-muted">25 questions for this job</div>
              <p className="mt-1 text-[12.5px] font-semibold leading-snug text-ink">“{questions[lane]}”</p>
            </div>
            <div className="rounded-[14px] border border-gold/40 bg-gold-soft/60 p-3.5">
              <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-gold-ink">7 · Mock interview</div>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="font-mono text-[22px] font-medium text-ink">{mockFor(p.mock.overall, lane)}</span>
                <span className="text-[11.5px] text-ink-muted">/100 · practice score</span>
              </div>
              <p className="mt-1 text-[12px] leading-snug text-ink-soft">Next: {p.mock.improve}</p>
            </div>
          </div>
          <p className="mt-4 flex items-center justify-center gap-2 rounded-full bg-teal px-4 py-2.5 text-center text-[13px] font-semibold text-white sm:text-[14px]">
            <Check className="size-4 text-gold-soft" /> Every branch ends the same way: better prepared for the real interview.
          </p>
        </div>
      </div>
      <p className="mt-2 text-center text-[11.5px] text-ink-muted">Example candidates, jobs and scores, for illustration.</p>
    </div>
  )
}
