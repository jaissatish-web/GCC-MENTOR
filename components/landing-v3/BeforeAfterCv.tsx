'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import s from './concept.module.css'
import { useCountUp, useInView } from './hooks'
import { PERSONAS, type Persona } from './personas'
import { Check, Line, PersonaSwitch, Rich, Tag } from './primitives'

const PROBLEMS = ['Weak summary', 'Generic duties', 'Missing keywords', 'No Gulf positioning', 'Poor hierarchy'] as const

function Pin({ n, label }: { n: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-alert px-2 py-[3px] text-[11px] font-bold text-white shadow-m-2">
      <span className="font-mono">{n}</span> {label}
    </span>
  )
}

function BeforeCv({ p }: { p: Persona }) {
  return (
    <article aria-label="Example CV before optimizing" className="h-full rounded-[16px] border border-line bg-[#FDFCFA] p-5 text-ink-soft shadow-m-2">
      <div className="text-center">
        <div className="text-[15px] font-bold uppercase tracking-wide text-ink">{p.name}</div>
        <div className="text-[11px]">email · phone · {p.base}</div>
      </div>
      <div className="mt-3 text-[11px] font-bold uppercase">Career Objective</div>
      <p className="mt-1 text-[11.5px] italic leading-snug">{p.before.objective}</p>
      <div className="mt-1.5"><Pin n={1} label="Weak summary" /></div>

      <div className="mt-3 text-[11px] font-bold uppercase">Work Experience</div>
      <div className="mt-1 text-[11.5px] font-semibold text-ink">{p.role}</div>
      <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[11.5px] leading-snug">
        {p.before.duties.map((d) => (
          <li key={d}>{d}</li>
        ))}
      </ul>
      <div className="mt-1.5"><Pin n={2} label="Generic duties" /></div>
      <div className="mt-3 space-y-1.5"><Line w="90%" /><Line w="70%" /><Line w="84%" /></div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Pin n={3} label="Missing keywords" />
        <Pin n={4} label="No Gulf positioning" />
      </div>
      <div className="mt-3 space-y-1.5"><Line w="60%" /><Line w="76%" /></div>
      <div className="mt-3"><Pin n={5} label="Poor hierarchy" /></div>
    </article>
  )
}

function AfterCv({ p }: { p: Persona }) {
  const job = p.jobs[0]
  return (
    <article aria-label="Example CV after optimizing" className="h-full rounded-[16px] border border-teal/25 bg-white p-5 shadow-m-3">
      <div className="flex items-start justify-between gap-3 border-b border-line pb-3">
        <div className="min-w-0">
          <div className="text-[19px] font-bold leading-tight text-ink tracking-[-0.02em]">{p.name}</div>
          <div className="text-[12px] font-semibold text-teal">{job.title}</div>
          <div className="mt-1 text-[11px] text-ink-muted">{p.base} · {p.tags.join(' · ')}</div>
        </div>
        <Tag tone="ok"><Check className="size-3" /> Gulf format</Tag>
      </div>
      <div className="mt-3 text-[11px] font-bold uppercase tracking-[0.1em] text-teal">Profile</div>
      <p className="mt-1 text-[11.5px] leading-snug text-ink-soft"><Rich text={p.summary} mark="bold" /></p>
      <div className="mt-3 text-[11px] font-bold uppercase tracking-[0.1em] text-teal">Experience</div>
      <div className="mt-1 text-[11.5px] font-semibold text-ink">{p.role}</div>
      <ul className="mt-1 space-y-1 text-[11.5px] leading-snug text-ink-soft">
        {p.bullets.map((b) => (
          <li key={b} className="flex gap-1.5"><span className="text-teal">▸</span> <span><Rich text={b} mark="bold" /></span></li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {p.skills.map((k) => (
          <Tag key={k} tone="teal">{k}</Tag>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 border-t border-line pt-3 text-[11px] leading-snug text-ink-soft">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-teal">Certifications</div>
          {p.certs.map((c) => (
            <div key={c} className="mt-1">{c}</div>
          ))}
        </div>
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-teal">Education</div>
          <div className="mt-1">{p.education}</div>
        </div>
      </div>
    </article>
  )
}

function Metric({ label, from, to, suffix = '', seen, delay, lowerIsBetter }: { label: string; from: number; to: number; suffix?: string; seen: boolean; delay: number; lowerIsBetter?: boolean }) {
  const [go, setGo] = useState(false)
  useEffect(() => {
    if (!seen) return
    const id = window.setTimeout(() => setGo(true), delay)
    return () => window.clearTimeout(id)
  }, [seen, delay])
  const v = useCountUp(from, to, go)
  return (
    <div className="rounded-[14px] border border-line bg-white px-3 py-3 text-center shadow-m-1 lg:px-4 lg:py-4 lg:text-left">
      <div className="text-[11px] font-semibold text-ink-muted lg:text-[12px]">{label}</div>
      <div className="mt-1 flex items-baseline justify-center gap-1.5 lg:justify-start">
        <span className="font-mono text-[13px] text-ink-muted line-through">{from}{suffix}</span>
        <span className="text-ink-muted" aria-hidden="true">→</span>
        <span className={cn('font-mono text-[24px] font-medium leading-none lg:text-[30px]', lowerIsBetter ? 'text-ok' : 'text-teal')}>{v}{suffix}</span>
      </div>
    </div>
  )
}

export function BeforeAfterCv() {
  const { ref, seen } = useInView<HTMLDivElement>(0.25)
  const [view, setView] = useState<'before' | 'after'>('after')
  const [who, setWho] = useState(2)
  const p = PERSONAS[who]
  const job = p.jobs[0]

  return (
    <div ref={ref} className="mt-6 lg:mt-10">
      <PersonaSwitch personas={PERSONAS} active={who} onChange={setWho} label="Choose a profession" className="mb-4 sm:justify-center lg:mb-6" />

      <div role="group" aria-label="Show CV version" className="mx-auto mb-4 grid max-w-[320px] grid-cols-2 rounded-full border border-line bg-white p-1 lg:hidden">
        {(['before', 'after'] as const).map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={view === v}
            onClick={() => setView(v)}
            className={cn('min-h-10 rounded-full text-[13.5px] font-bold capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal', view === v ? (v === 'after' ? 'bg-teal text-white' : 'bg-alert text-white') : 'text-ink-soft')}
          >
            {v}
          </button>
        ))}
      </div>

      <div key={who} className={cn(s.enter, 'grid gap-4 lg:grid-cols-[1fr_200px_1fr] lg:items-stretch lg:gap-6')}>
        <div className={cn(view === 'before' ? 'block' : 'hidden', 'lg:block')}>
          <div className="font-semibold mb-2 hidden text-[11px] uppercase tracking-[0.08em] text-alert lg:block">Before · generic</div>
          <BeforeCv p={p} />
        </div>

        <div className="order-last grid grid-cols-3 gap-2 lg:order-none lg:flex lg:flex-col lg:justify-center lg:gap-3">
          <Metric label="Job match" from={job.before} to={job.after} suffix="%" seen={seen} delay={200} />
          <Metric label="Gulf Readiness" from={p.readiness[0]} to={p.readiness[1]} seen={seen} delay={450} />
          <Metric label="Missing keywords" from={p.missing.length + 7} to={2} seen={seen} delay={700} lowerIsBetter />
          <p className="col-span-3 text-center text-[11px] text-ink-muted lg:text-left">Example figures. Results vary by profile and job.</p>
        </div>

        <div className={cn(view === 'after' ? 'block' : 'hidden', 'lg:block')}>
          <div className="font-semibold mb-2 hidden text-[11px] uppercase tracking-[0.08em] text-teal lg:block">After · for {job.title}</div>
          <div className="lg:h-[calc(100%-26px)]">
            <AfterCv p={p} />
          </div>
        </div>
      </div>

      <ul className="mt-5 hidden flex-wrap justify-center gap-2 lg:flex" aria-label="What was fixed">
        {PROBLEMS.map((label, i) => (
          <li key={label} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-[12.5px] font-semibold text-ink-soft">
            <span className="font-mono text-[11px] text-alert line-through">{i + 1}</span> {label} <Check className="size-3.5 text-ok" />
          </li>
        ))}
      </ul>
    </div>
  )
}
