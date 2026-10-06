'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import s from './concept.module.css'
import { Check, Meter, Tag } from './primitives'

/**
 * The optimization level the user chooses — the product's REAL three levels
 * and target bands (app/optimize/setup/page.tsx, lib/optimizer/suggestions.ts
 * LEVEL_TARGET_BAND): Easy 60–75, Moderate 75–85, High 85–95.
 * The example bullet shows what each level does to the same line.
 */
const LEVELS = [
  {
    key: 'easy',
    label: 'Easy',
    tag: 'Light touch',
    band: [60, 75] as const,
    score: 70,
    what: ['Your summary and duties reworded in the job’s keywords', 'Only what your profile already says', 'No suggested lines'],
    bullet: 'Handled month-end closing and **VAT** returns for the group.',
    suggestion: null,
  },
  {
    key: 'moderate',
    label: 'Moderate',
    tag: 'Balanced',
    band: [75, 85] as const,
    score: 82,
    what: ['Everything in Easy', 'Suggested lines for the job’s must-haves', 'Suggestions in yellow — keep only what’s true'],
    bullet: 'Led **month-end close** and **UAE VAT** returns for 3 entities on **SAP FICO**.',
    suggestion: 'Prepared IFRS 16 lease schedules',
  },
  {
    key: 'high',
    label: 'High',
    tag: 'Strongest',
    band: [85, 95] as const,
    score: 91,
    what: ['The strongest rewrite, results first', 'Suggestions for every requirement', 'Be ready to talk about every line you keep'],
    bullet: 'Cut **month-end close** from 9 to 5 days across 3 entities on **SAP FICO**; owned **UAE VAT** filing.',
    suggestion: 'Led IFRS 16 adoption for 40 store leases',
  },
] as const

function Bold({ text }: { text: string }) {
  return (
    <>
      {text.split(/\*\*(.+?)\*\*/g).map((p, i) => (i % 2 ? <b key={i} className="rounded bg-teal-soft px-0.5 font-semibold text-teal">{p}</b> : <span key={i}>{p}</span>))}
    </>
  )
}

export function OptimizationLevels() {
  const [lvl, setLvl] = useState(1)
  const L = LEVELS[lvl]

  return (
    <div className="mt-8 grid gap-4 lg:mt-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-stretch lg:gap-6">
      <div>
        <div role="radiogroup" aria-label="Optimization level" className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {LEVELS.map((l, i) => (
            <button
              key={l.key}
              type="button"
              role="radio"
              aria-checked={i === lvl}
              onClick={() => setLvl(i)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                  e.preventDefault()
                  setLvl((v) => (v + (e.key === 'ArrowRight' ? 1 : 2)) % 3)
                }
              }}
              className={cn(
                'relative flex min-h-[92px] flex-col items-start justify-between rounded-[16px] border-2 p-3 text-left transition-[border-color,background-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 sm:p-4',
                i === lvl ? 'border-teal bg-white shadow-m-3' : 'border-line bg-white/60 hover:border-teal/40',
              )}
            >
              <span className="font-semibold hidden type-caption uppercase tracking-[0.08em] text-ink-muted sm:block">{l.tag}</span>
              <span className="text-[17px] font-bold text-ink min-[400px]:text-[20px] sm:text-[22px] tracking-[-0.02em]">{l.label}</span>
              <span className="font-mono type-caption text-gold-ink">aims {l.band[0]}–{l.band[1]}</span>
              {/* Intensity pips */}
              <span className="absolute right-3 top-3 hidden gap-0.5 sm:flex" aria-hidden="true">
                {[0, 1, 2].map((p) => (
                  <span key={p} className={cn('h-3 w-1.5 rounded-full', p <= i ? 'bg-gold' : 'bg-line')} />
                ))}
              </span>
            </button>
          ))}
        </div>
        <ul key={L.key} className={cn(s.enter, 'mt-4 space-y-2')}>
          {L.what.map((w) => (
            <li key={w} className="flex gap-2.5 type-helper leading-snug text-ink-soft">
              <Check className="mt-0.5 text-ok" /> {w}
            </li>
          ))}
        </ul>
      </div>

      {/* The same line at the chosen level */}
      <div className="rounded-[20px] border border-line bg-white p-4 shadow-lp-card sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold type-caption uppercase tracking-[0.08em] text-ink-muted">Same experience · {L.label} level</span>
          <Tag tone="muted">Example</Tag>
        </div>
        <div className="mt-4 flex items-end gap-3">
          <span className="font-mono type-helper text-ink-muted line-through">52</span>
          <span className="font-mono text-[44px] font-medium leading-none text-teal">{L.score}</span>
          <span className="pb-1 type-caption font-semibold text-ink-soft">ATS match for this job</span>
        </div>
        <div className="relative mt-3">
          <Meter value={L.score} />
          {/* The level's target band */}
          <span
            className="absolute -top-1 h-3.5 rounded-sm border border-gold bg-gold/15 transition-all duration-500 motion-reduce:transition-none"
            style={{ left: `${L.band[0]}%`, width: `${L.band[1] - L.band[0]}%` }}
            aria-hidden="true"
          />
        </div>
        <div className="mt-5 space-y-2 type-helper leading-snug">
          <p className="rounded-[12px] bg-alert-soft/60 px-3 py-2.5 text-ink-muted line-through decoration-alert/40">Responsible for accounts and reports.</p>
          <p key={L.key} className={cn(s.enter, 'rounded-[12px] bg-ok-soft px-3 py-2.5 text-ink')}>
            <Bold text={L.bullet} />
          </p>
          {L.suggestion ? (
            <p key={`${L.key}-s`} className={cn(s.enter, 'flex flex-wrap items-start justify-between gap-3 rounded-[12px] border border-gold/50 bg-gold-soft px-3 py-2.5 text-ink')}>
              <span>
                <span className="font-semibold mr-1.5 type-caption uppercase tracking-[0.08em] text-gold-ink">Suggested</span>
                {L.suggestion}
              </span>
              <span className="flex shrink-0 gap-1">
                <span className="rounded-md bg-teal px-2 py-0.5 type-caption font-bold text-white">Keep if true</span>
              </span>
            </p>
          ) : null}
        </div>
        <p className="mt-4 type-helper text-ink-muted">You review and approve every change before it goes into your CV.</p>
      </div>
    </div>
  )
}
