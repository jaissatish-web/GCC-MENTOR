'use client'

import Image from 'next/image'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import s from './concept.module.css'
import { useAutoStep, useCountUp, useInView, useReducedMotion } from './hooks'
import { PERSONAS } from './personas'
import { Check, PersonaSwitch } from './primitives'

/** The report's four scores are the product's real ones (components/mock-interview/InterviewReport.tsx). */
const LABELS = ['Technical command', 'Role fit', 'Gulf readiness', 'Answer structure'] as const

const PHASES = ['Question', 'Answer', 'Report'] as const
const BARS = Array.from({ length: 28 }, (_, i) => ((i * 37) % 11) * 70)

export function MockInterviewPreview() {
  const reduced = useReducedMotion()
  const { ref, visible, seen } = useInView<HTMLDivElement>(0.3)
  const [hover, setHover] = useState(false)
  const [who, setWho] = useState(1)
  const p = PERSONAS[who]
  const SCORES = LABELS.map((l, i) => [l, p.mock.scores[i]] as const)
  const { index: phase, choose } = useAutoStep(PHASES.length, 3400, visible && !reduced && !hover)
  const showReport = phase === 2 || reduced
  const overall = useCountUp(0, p.mock.overall, seen && showReport, 900)

  return (
    <div
      ref={ref}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="relative mt-8 overflow-hidden rounded-[26px] bg-teal p-3 text-white shadow-lp-float sm:p-5 lg:mt-12 lg:p-8"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_85%_0%,rgba(201,150,46,0.22),transparent_70%)]" aria-hidden="true" />

      <PersonaSwitch personas={PERSONAS} active={who} onChange={setWho} label="Choose a profession" dark className="relative mb-3" />

      {/* Phase switch */}
      <div className="relative mb-4 flex gap-1.5 rounded-full bg-white/10 p-1 sm:w-fit lg:mb-6" role="tablist" aria-label="Mock interview stages">
        {PHASES.map((p, i) => (
          <button
            key={p}
            type="button"
            role="tab"
            aria-selected={phase === i}
            onClick={() => choose(i)}
            className={cn(
              'min-h-10 flex-1 rounded-full px-3 text-[12.5px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold sm:flex-none sm:px-4',
              phase === i ? 'bg-white text-teal' : 'text-white/80 hover:text-white',
            )}
          >
            <span className="font-mono text-[10.5px] opacity-70">{i + 1}</span> {p}
          </button>
        ))}
      </div>

      <div className="relative grid gap-3 lg:grid-cols-[1.05fr_0.95fr] lg:gap-6">
        {/* The room */}
        <div className="rounded-[20px] bg-white/[0.07] p-4 ring-1 ring-white/15 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="relative size-14 shrink-0 overflow-hidden rounded-full ring-2 ring-gold/70 sm:size-16">
              <Image src="/interviewers/arab-man.webp" alt="" fill sizes="64px" className="object-cover" />
            </div>
            <div className="min-w-0">
              <div className="text-[14px] font-bold">Hiring Manager</div>
              <div className="text-[12px] leading-snug text-white/70">{p.jobs[0].country} · {p.jobs[0].title}</div>
            </div>
            <span className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 font-mono text-[10.5px]">
              <span className={cn('size-2 rounded-full', phase === 1 ? cn('bg-[#F08A7A]', s.pulse) : 'bg-white/40')} aria-hidden="true" />
              {phase === 1 ? 'REC 01:24' : 'LIVE'}
            </span>
          </div>

          <div className="mt-4 rounded-[16px] rounded-tl-[4px] bg-white p-4 text-ink">
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-teal">Question 3 of 8</div>
            <p key={who} className="mt-1 font-display text-[18px] font-semibold leading-snug sm:text-[20px]">“{p.mock.question}”</p>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <span className={cn('grid size-11 shrink-0 place-items-center rounded-full transition-colors', phase === 1 ? 'bg-gold text-ink' : 'bg-white/15 text-white')} aria-hidden="true">
              <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="9" y="3" width="6" height="12" rx="3" />
                <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
              </svg>
            </span>
            <div className={cn(s.wave, 'flex h-10 flex-1 items-center gap-[3px] text-gold')} data-idle={phase !== 1} aria-hidden="true">
              {BARS.map((d, i) => (
                <span key={i} style={{ ['--d' as string]: `${d}ms` }} />
              ))}
            </div>
          </div>
          <p className="mt-3 min-h-[40px] text-[13px] leading-snug text-white/80">
            {phase === 0 && 'Asked from your CV and this job — not a generic list.'}
            {phase === 1 && p.mock.answer}
            {phase === 2 && 'Answer scored. Your report is ready.'}
          </p>
        </div>

        {/* The report */}
        <div className="rounded-[20px] bg-white p-4 text-ink sm:p-5">
          <div className="flex items-center gap-4">
            <div className="relative grid size-[76px] shrink-0 place-items-center">
              <svg viewBox="0 0 80 80" className="absolute inset-0 -rotate-90" aria-hidden="true">
                <circle cx="40" cy="40" r="34" fill="none" stroke="#F7EFDD" strokeWidth="8" />
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  fill="none"
                  stroke="#C9962E"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${(showReport ? overall : 0) * 2.136} 214`}
                  className="transition-[stroke-dasharray] duration-300"
                />
              </svg>
              <span className="font-mono text-[24px] font-medium" aria-label={`Overall ${showReport ? p.mock.overall : 0} out of 100`}>{showReport ? overall : '—'}</span>
            </div>
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">Overall · example</div>
              <div className="font-display text-[20px] font-semibold">{showReport ? 'Interview ready' : 'Scoring your answer…'}</div>
              <div className="text-[12px] text-ink-muted">{showReport ? 'Targeted refinement' : 'Report appears when you finish'}</div>
            </div>
          </div>
          <ul className="mt-4 space-y-2.5">
            {SCORES.map(([k, v], i) => (
              <li key={k} className="text-[12.5px]">
                <span className="flex justify-between"><span className="text-ink-soft">{k}</span><span className="font-mono text-ink">{showReport ? v : '··'}</span></span>
                <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-line" aria-hidden="true">
                  <span
                    className={cn('block h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none', v < 75 ? 'bg-gold' : 'bg-teal')}
                    style={{ width: showReport ? `${v}%` : '0%', transitionDelay: `${i * 90}ms` }}
                  />
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 grid gap-2 text-[12.5px] leading-snug sm:grid-cols-2">
            <div className="hidden rounded-[12px] bg-ok-soft p-3 sm:block">
              <div className="flex items-center gap-1 font-bold text-ok"><Check className="size-3.5" /> What was good</div>
              <p className="mt-1 text-ink-soft">{p.mock.good}</p>
            </div>
            <div className="rounded-[12px] bg-gold-soft p-3">
              <div className="font-bold text-gold-ink">↑ Improve</div>
              <p className="mt-1 text-ink-soft">{p.mock.improve}</p>
            </div>
          </div>
          <details className="group mt-2 rounded-[12px] border border-line px-3 py-2 text-[12.5px]">
            <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between font-bold text-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal [&::-webkit-details-marker]:hidden">
              Suggested answer <span aria-hidden="true" className="transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="pb-1 pt-1 text-ink-soft">{p.mock.suggested}</p>
          </details>
        </div>
      </div>
    </div>
  )
}
