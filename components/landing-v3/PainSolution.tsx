'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import s from './concept.module.css'
import { useCountUp, useInView } from './hooks'
import { Check, Line, Meter, Tag } from './primitives'

/**
 * Four familiar Gulf-application problems, each shown as a picture of the
 * problem and a picture of the fix. The words are the tab labels; the panel
 * itself is almost all UI.
 */
const PAINS = [
  { key: 'same', label: 'Same CV for every job', fix: 'A CV for each job' },
  { key: 'reject', label: 'No idea why you’re rejected', fix: 'See the gap first' },
  { key: 'files', label: 'CV-final-final2.pdf', fix: 'One organised library' },
  { key: 'interview', label: 'Random interview prep', fix: 'Prep from your CV + the job' },
] as const

function Panel({ problem, fix, on }: { problem: ReactNode; fix: ReactNode; on: boolean }) {
  return (
    <div className="grid items-stretch gap-3 md:grid-cols-[1fr_auto_1fr] md:gap-4">
      <div className="flex flex-col rounded-[18px] border border-dashed border-line-strong bg-fill-warm p-4 sm:p-5">
        <div className="font-semibold mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.08em] text-alert">
          <span className="size-1.5 rounded-full bg-alert" aria-hidden="true" /> Today
        </div>
        <div className="flex flex-1 flex-col justify-center">{problem}</div>
      </div>
      <div className="flex items-center justify-center text-teal" aria-hidden="true">
        <span className="grid size-10 place-items-center rounded-full border border-line bg-white shadow-m-2 md:size-12">
          <svg className="size-5 rotate-90 md:rotate-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </span>
      </div>
      <div className={cn(s.rise, 'rounded-[18px] border border-teal/25 bg-white p-4 shadow-lp-card sm:p-5')} data-on={on} style={{ ['--d' as string]: '120ms' }}>
        <div className="font-semibold mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.08em] text-teal">
          <span className="size-1.5 rounded-full bg-teal" aria-hidden="true" /> With GCC Mentor
        </div>
        {fix}
      </div>
    </div>
  )
}

function DocIcon({ className }: { className?: string }) {
  return (
    <span className={cn('relative inline-block h-11 w-9 rounded-[5px] border border-line-strong bg-white p-1.5 shadow-m-1', className)} aria-hidden="true">
      <Line w="80%" />
      <Line w="60%" className="mt-1" />
      <Line w="70%" className="mt-1" />
    </span>
  )
}

function SameCv({ on }: { on: boolean }) {
  const jobs = [
    ['QA', 'ICU Staff Nurse', 86],
    ['SA', 'Registered Nurse', 84],
    ['AE', 'Critical Care Nurse', 85],
  ] as const
  return (
    <Panel
      on={on}
      problem={
        <div className="flex items-center gap-4">
          <DocIcon className="h-14 w-11" />
          <ul className="flex-1 space-y-2">
            {jobs.map(([c, t]) => (
              <li key={c} className="flex items-center gap-2 text-[12.5px] text-ink-soft">
                <span className="h-px w-5 bg-line-strong" aria-hidden="true" />
                <span className="font-mono text-[11px] text-ink-muted">{c}</span> {t}
                <span className="ml-auto font-mono text-[11px] text-alert">same file</span>
              </li>
            ))}
          </ul>
        </div>
      }
      fix={
        <ul className="space-y-2">
          {jobs.map(([c, t, score], i) => (
            <li key={c} className={cn(s.rise, 'flex items-center gap-3 rounded-[12px] bg-canvas px-3 py-2')} data-on={on} style={{ ['--d' as string]: `${200 + i * 120}ms` }}>
              <DocIcon className="h-9 w-7 p-1" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-ink">{t}</span>
                <span className="font-mono text-[11px] text-gold-ink">{c} · its own keywords</span>
              </span>
              <span className="font-mono text-[15px] font-medium text-teal">{score}</span>
            </li>
          ))}
        </ul>
      }
    />
  )
}

function Rejected({ on }: { on: boolean }) {
  const score = useCountUp(73, 91, on, 1300)
  const missing = ['IFRS 16', 'UAE VAT', 'SAP FICO', 'Month-end close']
  return (
    <Panel
      on={on}
      problem={
        <div>
          <div className="rounded-[12px] border border-line bg-white p-3">
            <div className="text-[11px] font-semibold text-ink-muted">Finance Manager job asks for</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {missing.map((k) => (
                <Tag key={k} tone="alert">{k}</Tag>
              ))}
            </div>
          </div>
          <p className="mt-3 text-[13px] leading-snug text-ink-soft">
            Your CV never says them, so the screen passes you over — and nobody tells you why.
          </p>
        </div>
      }
      fix={
        <div>
          <div className="flex items-end gap-3">
            <span className="font-mono text-[15px] text-ink-muted line-through">73%</span>
            <span className="font-mono text-[42px] font-medium leading-none text-teal" aria-label="Job match 91 percent">{score}%</span>
            <span className="pb-1 text-[12px] font-semibold text-ink-soft">job match</span>
          </div>
          <Meter value={on ? score : 73} className="mt-2.5" />
          <div className="mt-3 flex flex-wrap gap-1.5">
            {missing.map((k, i) => (
              <Tag key={k} tone="ok">
                <span className={s.rise} data-on={on} style={{ ['--d' as string]: `${400 + i * 110}ms` }}>
                  ✓ {k}
                </span>
              </Tag>
            ))}
          </div>
          <p className="mt-2.5 text-[11.5px] text-ink-muted">Only where your profile already shows it. Example figures.</p>
        </div>
      }
    />
  )
}

function Files({ on }: { on: boolean }) {
  const mess = [
    ['CV-final.pdf', '-rotate-3'],
    ['CV-final2.pdf', 'rotate-2 translate-x-4'],
    ['CV-new-UPDATED.docx', '-rotate-1 -translate-x-1'],
    ['CV-Saudi-final (3).pdf', 'rotate-3 translate-x-6'],
  ] as const
  const lib = [
    ['SA', 'Saudi Arabia', 'Project Manager', 'CV · Letter · Q&A'],
    ['OM', 'Oman', 'Construction Manager', 'CV · Letter'],
    ['QA', 'Qatar', 'Project Controls Lead', 'CV · Letter · Mock'],
  ] as const
  return (
    <Panel
      on={on}
      problem={
        <ul className="space-y-1.5 py-1">
          {mess.map(([f, t]) => (
            <li key={f} className={cn('flex w-fit items-center gap-2 rounded-[8px] border border-line bg-white px-2.5 py-1.5 font-mono text-[11.5px] text-ink-soft shadow-m-1', t)}>
              <span className="h-3.5 w-2.5 rounded-[2px] bg-alert/70" aria-hidden="true" /> {f}
            </li>
          ))}
        </ul>
      }
      fix={
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[13px] font-bold text-ink">Resume Library</span>
            <Tag tone="muted">3 jobs</Tag>
          </div>
          <ul className="divide-y divide-line rounded-[12px] border border-line">
            {lib.map(([c, country, role, has], i) => (
              <li key={c} className={cn(s.rise, 'flex items-center gap-3 px-3 py-2')} data-on={on} style={{ ['--d' as string]: `${200 + i * 120}ms` }}>
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-teal-soft font-mono text-[11px] font-medium text-teal">{c}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-semibold text-ink">{country} — {role}</span>
                  <span className="text-[11px] text-ink-muted">{has}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      }
    />
  )
}

function Interview({ on }: { on: boolean }) {
  const flow = [
    ['Your CV + the job', 'Input'],
    ['25 interview questions', 'Q&A'],
    ['Mock interview', 'Practice'],
    ['Performance report', 'Improve'],
  ] as const
  return (
    <Panel
      on={on}
      problem={
        <div className="relative h-[132px]">
          {[
            ['“Top 50 interview questions”', 'left-0 top-0 -rotate-2'],
            ['“Tell me about yourself”?', 'right-0 top-8 rotate-2'],
            ['YouTube · 43 min', 'left-4 top-[70px] rotate-1'],
            ['???', 'right-6 bottom-0 -rotate-3'],
          ].map(([t, c]) => (
            <span key={t} className={cn('absolute rounded-full border border-line bg-white px-3 py-1.5 text-[12px] text-ink-soft shadow-m-1', c)}>
              {t}
            </span>
          ))}
        </div>
      }
      fix={
        <ol className="relative space-y-2">
          <span className="absolute bottom-3 left-[13px] top-3 w-px bg-teal/25" aria-hidden="true" />
          {flow.map(([t, k], i) => (
            <li key={t} className={cn(s.rise, 'relative flex items-center gap-3')} data-on={on} style={{ ['--d' as string]: `${150 + i * 130}ms` }}>
              <span className="z-[1] grid size-[27px] shrink-0 place-items-center rounded-full bg-teal font-mono text-[11px] text-white">{i + 1}</span>
              <span className="flex-1 text-[13px] font-semibold text-ink">{t}</span>
              <Tag tone={i === 3 ? 'gold' : 'teal'}>{k}</Tag>
            </li>
          ))}
        </ol>
      }
    />
  )
}

const RENDER = [SameCv, Rejected, Files, Interview]

export function PainSolution() {
  const [active, setActive] = useState(0)
  const { ref, seen } = useInView<HTMLDivElement>(0.25)
  const Active = RENDER[active]

  return (
    <div ref={ref} className="mt-7 lg:mt-10">
      <div role="tablist" aria-label="Common Gulf job-search problems" className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden">
        {PAINS.map((p, i) => (
          <button
            key={p.key}
            id={`pain-tab-${p.key}`}
            type="button"
            role="tab"
            aria-selected={i === active}
            aria-controls="pain-panel"
            onClick={() => setActive(i)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                e.preventDefault()
                const next = (i + (e.key === 'ArrowRight' ? 1 : PAINS.length - 1)) % PAINS.length
                setActive(next)
                document.getElementById(`pain-tab-${PAINS[next].key}`)?.focus()
              }
            }}
            tabIndex={i === active ? 0 : -1}
            className={cn(
              'min-h-11 shrink-0 snap-start rounded-full border px-4 text-left text-[13.5px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2',
              i === active ? 'border-teal bg-teal text-white' : 'border-line bg-white text-ink-soft hover:border-teal/50 hover:text-ink',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div id="pain-panel" role="tabpanel" aria-labelledby={`pain-tab-${PAINS[active].key}`} className="mt-4 lg:mt-6">
        <div className="mb-3 flex items-center gap-2 text-[14px] font-semibold text-teal">
          <Check className="size-4" /> {PAINS[active].fix}
        </div>
        <ActiveKeyed key={active} Comp={Active} seen={seen} />
      </div>
    </div>
  )
}

/** Remounts per tab so the "fix" side replays its entrance each time. */
function ActiveKeyed({ Comp, seen }: { Comp: (p: { on: boolean }) => ReactNode; seen: boolean }) {
  const [on, setOn] = useState(false)
  useEffect(() => {
    if (!seen) return
    // One frame at "off" first, so the entrance transition actually plays.
    const id = requestAnimationFrame(() => setOn(true))
    return () => cancelAnimationFrame(id)
  }, [seen])
  return <Comp on={on} />
}
