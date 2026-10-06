'use client'

import Image from 'next/image'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import s from './concept.module.css'
import { useAutoStep, useInView, useReducedMotion } from './hooks'
import { PERSONAS, type Persona } from './personas'
import { Check, Cross, Line, Meter, Rich, Tag } from './primitives'

const STEP_MS = 8000

/**
 * The hero visual: one CV moving through the product — original → job match →
 * optimized → interview ready. Each time the four sheets complete, the next
 * example candidate takes over (nurse, accountant, engineer…), so a visitor
 * from any profession sees their own kind of job within a few seconds.
 */
const SHEETS = [
  { key: 'original', label: 'Original CV', short: 'Original' },
  { key: 'match', label: 'Job match', short: 'Match' },
  { key: 'optimized', label: 'Gulf-optimized CV', short: 'Optimized' },
  { key: 'ready', label: 'Interview ready', short: 'Ready' },
] as const

function SheetFrame({ stamp, tone, children }: { stamp: string; tone: 'muted' | 'alert' | 'ok' | 'gold'; children: ReactNode }) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[18px] border border-line bg-white p-4 shadow-[0_2px_4px_rgba(20,24,28,0.05),0_24px_48px_-18px_rgba(20,24,28,0.30)] sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <Tag tone={tone === 'muted' ? 'muted' : tone} className="font-semibold uppercase tracking-[0.08em]">
          {stamp}
        </Tag>
        <span className="font-semibold type-caption uppercase tracking-[0.08em] text-ink-muted">Example</span>
      </div>
      {children}
    </div>
  )
}

function OriginalSheet({ p }: { p: Persona }) {
  return (
    <SheetFrame stamp="Original CV" tone="muted">
      <div className="mt-4 flex items-center gap-3">
        <span className="size-10 rounded-full bg-fill-subtle" aria-hidden="true" />
        <div className="flex-1">
          <div className="type-caption font-bold uppercase tracking-wide text-ink-soft">{p.name}</div>
          <Line w="50%" className="mt-1" />
        </div>
      </div>
      <p className="mt-4 rounded-lg border border-dashed border-alert/40 bg-alert-soft/50 px-2.5 py-2 type-helper italic text-ink-soft">
        “{p.before.objective}”
      </p>
      <ul className="mt-3 list-disc space-y-0.5 pl-4 type-helper text-ink-muted">
        {p.before.duties.map((d) => (
          <li key={d}>{d}</li>
        ))}
      </ul>
      <div className="mt-3 space-y-1.5">
        <Line w="88%" />
        <Line w="70%" />
      </div>
      <ul className="mt-auto space-y-1 pt-3 type-helper font-medium text-alert">
        <li className="flex items-center gap-1.5"><Cross className="size-3.5" /> Generic summary</li>
        <li className="flex items-center gap-1.5"><Cross className="size-3.5" /> No Gulf positioning</li>
        <li className="flex items-center gap-1.5"><Cross className="size-3.5 shrink-0" /> Same file for every job</li>
      </ul>
    </SheetFrame>
  )
}

function MatchSheet({ p }: { p: Persona }) {
  const job = p.jobs[0]
  return (
    <SheetFrame stamp="Job match" tone="alert">
      <div className="mt-4 type-helper text-ink-muted">Target · {job.country}</div>
      <div className="type-label text-ink">{job.title}</div>
      <div className="type-helper text-ink-muted">{job.employer}</div>
      <div className="mt-3 flex items-end gap-2">
        <span className="font-mono text-[46px] font-medium leading-none text-alert">{job.before}</span>
        <span className="pb-1.5 font-mono type-helper text-ink-muted">% ATS match</span>
      </div>
      <Meter value={job.before} tone="alert" className="mt-2.5" />
      <div className="mt-4 type-caption font-semibold uppercase tracking-[0.1em] text-ink-muted">Missing keywords</div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {p.missing.map((k) => (
          <Tag key={k} tone="alert">{k}</Tag>
        ))}
      </div>
      <p className="mt-auto pt-3 type-helper text-ink-soft">The experience is there. The CV just doesn’t say it in this job’s words.</p>
    </SheetFrame>
  )
}

function OptimizedSheet({ p }: { p: Persona }) {
  const job = p.jobs[0]
  return (
    <SheetFrame stamp="Optimized CV" tone="ok">
      <div className="mt-4 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[16px] font-bold leading-tight text-ink tracking-[-0.02em]">{p.name}</div>
          <div className="type-caption font-semibold leading-snug text-teal">{job.title}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-mono text-[28px] font-medium leading-none text-teal">{job.after}</div>
          <div className="font-mono type-helper text-ink-muted">ATS · was {job.before}</div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {p.tags.map((t) => (
          <Tag key={t} tone="teal">{t}</Tag>
        ))}
      </div>
      <div className="mt-3 space-y-2 type-helper text-ink-soft">
        {p.bullets.map((b) => (
          <p key={b}><Rich text={b} /></p>
        ))}
      </div>
      <div className="mt-auto flex items-center gap-1.5 border-t border-line pt-3 type-caption font-semibold text-ok">
        <Check className="size-3.5" /> Your employers, titles and dates stay the same
      </div>
    </SheetFrame>
  )
}

function ReadySheet({ p }: { p: Persona }) {
  const job = p.jobs[0]
  return (
    <SheetFrame stamp="Interview ready" tone="gold">
      <div className="mt-4 type-helper font-bold text-ink">Application pack · {job.title}</div>
      <ul className="mt-3 space-y-2 type-caption">
        {[
          ['Optimized CV', `ATS ${job.after}`],
          ['Cover letter', 'Ready'],
          ['Interview Q&A', '25 answers'],
        ].map(([a, b]) => (
          <li key={a} className="flex flex-wrap items-center justify-between gap-1 rounded-[10px] bg-ok-soft px-3 py-2">
            <span className="flex items-center gap-1.5 font-semibold text-ink"><Check className="size-3.5 text-ok" /> {a}</span>
            <span className="font-mono type-caption text-ok">{b}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 rounded-[12px] border border-gold/40 bg-gold-soft px-3 py-2.5">
        <div className="flex items-center justify-between">
          <span className="type-caption font-bold text-ink">Mock interview</span>
          <span className="font-mono text-[18px] font-medium text-gold-ink">{p.mock.overall}</span>
        </div>
        <Meter value={p.mock.overall} tone="gold" className="mt-1.5" />
        <p className="mt-1.5 type-caption text-ink-soft">Next: {p.mock.improve.charAt(0).toLowerCase() + p.mock.improve.slice(1)}</p>
      </div>
    </SheetFrame>
  )
}

const RENDER = [OriginalSheet, MatchSheet, OptimizedSheet, ReadySheet]

export function HeroStack() {
  const reduced = useReducedMotion()
  const { ref, visible } = useInView<HTMLDivElement>(0.2)
  const [paused, setPaused] = useState(false)
  const [userPaused, setUserPaused] = useState(false)
  const { index, choose, manual, resume } = useAutoStep(SHEETS.length, STEP_MS, visible && !paused && !userPaused && !reduced)
  const [who, setWho] = useState(0)
  const prev = useRef(index)
  const n = SHEETS.length

  // A full lap (last sheet → first) hands over to the next candidate.
  useEffect(() => {
    if (prev.current === n - 1 && index === 0) setWho((w) => (w + 1) % PERSONAS.length)
    prev.current = index
  }, [index, n])

  const p = PERSONAS[who]

  return (
    <div
      ref={ref}
      className={cn(s.stage, 'relative mx-auto w-full max-w-[340px] sm:max-w-[380px] lg:max-w-[420px]')}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {/* Who this example is — changes by profession. */}
      <div key={who} className={cn(s.enter, 'mb-1 flex items-center gap-2.5 lg:mb-0')} aria-live="polite">
        <span className="relative size-10 shrink-0 overflow-hidden rounded-full ring-2 ring-white shadow-m-2">
          <Image src={p.photo} alt="" fill sizes="40px" className="object-cover" />
        </span>
        <span className="min-w-0 type-caption leading-tight">
          <b className="block break-words type-helper text-ink">{p.name} · {p.role}</b>
          <span className="text-ink-muted">Example candidate · {p.sector}</span>
        </span>
      </div>

      {/* Fixed height: the deck never pushes the page around as sheets change. */}
      <div className="relative h-[520px] pr-[22px] pt-[32px] sm:h-[520px] lg:h-[560px] lg:pr-[70px] lg:pt-[56px]">
        <div className={cn(s.deck, 'h-full')} aria-roledescription="carousel" aria-label="One CV, prepared step by step">
          {SHEETS.map((sheet, i) => {
            const pos = (i - index + n) % n
            const Sheet = RENDER[i]
            return (
              <div key={sheet.key} className={s.sheet} data-pos={pos} aria-hidden={pos !== 0} role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${n}: ${sheet.label}`}>
                <Sheet p={p} />
                {pos === 0 && i === 2 && !reduced ? (
                  <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-[18px]" aria-hidden="true">
                    <span className={s.scan} />
                  </span>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>

      {!reduced ? (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            aria-pressed={userPaused || manual}
            onClick={() => {
              if (userPaused || manual) { setUserPaused(false); resume() }
              else setUserPaused(true)
            }}
            className="min-h-11 rounded-ctl px-3 type-caption font-semibold text-teal hover:bg-teal-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
          >
            {userPaused || manual ? 'Resume examples' : 'Pause examples'}
          </button>
        </div>
      ) : null}

      <div className="mt-2 grid grid-cols-4 gap-1.5 lg:mt-7" role="tablist" aria-label="Choose a stage">
        {SHEETS.map((sheet, i) => (
          <button
            key={sheet.key}
            type="button"
            role="tab"
            aria-selected={i === index}
            onClick={() => choose(i)}
            className="group flex min-h-11 flex-col items-start gap-1.5 rounded-lg px-1 pt-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
          >
            <span className="relative block h-[3px] w-full overflow-hidden rounded-full bg-line">
              {i < index ? <span className="absolute inset-0 bg-teal" /> : null}
              {i === index ? (
                <span
                  key={`${index}-${paused}-${reduced}-${who}`}
                  className={cn('absolute inset-0 bg-teal', !paused && !reduced && visible && s.progressFill)}
                  style={{ ['--step-ms' as string]: `${STEP_MS}ms` }}
                />
              ) : null}
            </span>
            <span className={cn('type-caption font-semibold leading-tight transition-colors ', i === index ? 'text-ink' : 'text-ink-muted group-hover:text-ink-soft')}>
              <span className="hidden font-mono type-helper text-ink-muted sm:inline">0{i + 1} </span>
              {sheet.short}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
