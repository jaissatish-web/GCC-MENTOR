'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import s from './concept.module.css'
import { useCountUp, useInView, useReducedMotion } from './hooks'
import { Check, Cross, Line, Tag } from './primitives'

/**
 * "Why am I not getting calls?" — the ATS screen, shown rather than told.
 * The same experience goes through the screen twice: once as a generic CV
 * (filtered out), once prepared for the job (passed to a recruiter).
 * No invented statistics: the funnel carries no numbers, and the two match
 * scores are labelled as an example.
 */

const CHECKS = [
  ['Job title', 'Is your target role clear?'],
  ['Keywords & skills', 'Are relevant skills supported by your experience?'],
  ['Readable format', 'Can the software read your layout?'],
  ['Headings & dates', 'Are sections and dates where it expects?'],
  ['Cover letter', 'Does the letter speak to this job?'],
] as const

const FUNNEL = [
  ['Every application sent', 100],
  ['Passes the ATS screen', 62],
  ['Read by a recruiter', 36],
  ['Called for interview', 18],
] as const

function ScanCard({ good, on }: { good: boolean; on: boolean }) {
  const reduced = useReducedMotion()
  const [done, setDone] = useState(false)
  useEffect(() => {
    if (!on) return
    const id = window.setTimeout(() => setDone(true), reduced ? 0 : good ? 2600 : 1900)
    return () => window.clearTimeout(id)
  }, [on, good, reduced])
  const score = useCountUp(0, good ? 88 : 41, done, 900)

  return (
    <div className={cn('relative min-w-0 overflow-hidden rounded-[18px] border bg-white p-3 shadow-lp-card sm:rounded-[20px] sm:p-5', good ? 'border-teal/30' : 'border-line')}>
      <div className="flex items-center justify-between">
        <span className="font-semibold type-caption uppercase tracking-[0.08em] text-ink-muted">{good ? 'Prepared' : 'Generic CV'}</span>
        <Tag tone="muted" className="hidden sm:inline-flex">Example</Tag>
      </div>
      {/* The CV being read */}
      <div className="relative mt-2 overflow-hidden rounded-[12px] border border-line bg-canvas p-2 sm:mt-3 sm:p-3">
        <div className="type-caption font-bold leading-tight text-ink">{good ? 'Senior Accountant — IFRS · UAE VAT' : 'Accountant'}</div>
        <div className="mt-2 flex flex-wrap gap-1">
          {(good ? ['IFRS 16', 'UAE VAT', 'SAP FICO', 'Month-end close'] : ['Accounts', 'Reports', 'Hard working']).map((k) => (
            <span key={k} className={cn('rounded px-1.5 py-0.5 type-caption font-semibold', good ? 'bg-teal-soft text-teal' : 'bg-fill-subtle text-ink-muted')}>{k}</span>
          ))}
        </div>
        <div className="mt-2 hidden space-y-1.5 sm:block">
          <Line w="92%" />
          <Line w="76%" />
          <Line w="84%" />
        </div>
        {on && !done && !reduced ? <span className={s.scanRow} aria-hidden="true" /> : null}
      </div>
      {/* Verdict */}
      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 sm:mt-3">
        <span className={cn('font-mono text-[28px] font-medium leading-none sm:text-[34px]', good ? 'text-teal' : 'text-alert')} aria-label={`${good ? 88 : 41}% match`}>
          {done ? score : '··'}
          <span className="text-[15px] text-ink-muted">%</span>
        </span>
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-1 type-caption font-bold transition-opacity duration-300 sm:gap-1.5 sm:px-3 sm:py-1.5 ',
            done ? 'opacity-100' : 'opacity-0',
            good ? 'bg-ok-soft text-ok' : 'bg-alert-soft text-alert',
          )}
        >
          {good ? <Check className="size-3.5" /> : <Cross className="size-3.5" />}
          {good ? 'Clearer match' : 'Needs tailoring'}
        </span>
      </div>
      <p className="mt-2 hidden type-caption text-ink-muted sm:block">{done ? (good ? 'Same person, same experience — now in the job’s words.' : 'Relevant experience can be harder to identify in a generic CV.') : 'ATS scanning…'}</p>
    </div>
  )
}

export function AtsFilter() {
  const { ref, seen } = useInView<HTMLDivElement>(0.3)
  return (
    <div ref={ref} className="mt-6 grid grid-cols-2 gap-2.5 sm:gap-4 lg:mt-12 lg:grid-cols-[1fr_1fr_0.95fr] lg:gap-5">
      <ScanCard good={false} on={seen} />
      <ScanCard good on={seen} />

      <div className="col-span-2 rounded-[20px] bg-teal p-4 text-white shadow-m-3 sm:p-5 lg:col-span-1 lg:row-span-2">
        <div className="font-semibold type-caption uppercase tracking-[0.08em] text-gold-soft">What a clear application shows</div>
        <ul className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-1">
          {CHECKS.map(([k, q], i) => (
            <li key={k} className={cn(s.rise, 'flex gap-2 rounded-[12px] bg-white/[0.08] p-2.5 last:col-span-2 sm:gap-3 sm:p-3 lg:last:col-span-1')} data-on={seen} style={{ ['--d' as string]: `${300 + i * 120}ms` }}>
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-gold text-ink"><Check className="size-3" /></span>
              <span className="leading-snug">
                <b className="block type-caption">{k}</b>
                <span className="hidden type-caption text-white/75 sm:inline">{q}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 type-helper font-semibold text-gold-soft">GCC Mentor prepares every one of these — for each job.</p>
      </div>

      {/* The funnel: no numbers, only the shape of the problem. */}
      <div className="col-span-2 rounded-[20px] border border-line bg-white p-4 shadow-lp-card sm:p-5">
        <div className="font-semibold type-caption uppercase tracking-[0.08em] text-ink-muted">An example application journey</div>
        <ol className="mt-3 space-y-2">
          {FUNNEL.map(([label, w], i) => (
            <li key={label} className="flex items-center gap-3">
              <span className="w-[42%] shrink-0 type-caption font-semibold leading-tight text-ink sm:w-[34%]">
                {label}
                {i === 1 ? <span className="mt-0.5 block type-caption font-bold text-alert">↓ screening varies by employer</span> : null}
              </span>
              <span className="relative h-7 flex-1 overflow-hidden rounded-[8px] bg-fill-subtle">
                <span
                  className={cn('absolute inset-y-0 left-0 rounded-[8px] transition-[width] duration-1000 ease-out motion-reduce:transition-none', 'bg-teal')}
                  style={{ width: seen ? `${w}%` : '0%', transitionDelay: `${i * 180}ms` }}
                />
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-2 type-caption text-ink-muted">Illustration only. Match scores are guidance, not an employer’s screening result.</p>
      </div>
    </div>
  )
}
