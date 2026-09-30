'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import s from './concept.module.css'
import { useInView } from './hooks'
import { PERSONAS } from './personas'
import { Check, PersonaSwitch, Tag } from './primitives'

/**
 * Job description on one side, the candidate's own profile on the other, and
 * a wire between every requirement and the fact that answers it. The last row
 * is the point of the whole section: a requirement the profile does NOT meet
 * is asked about, never filled in. Switchable by profession.
 */
const OUTPUTS = ['Optimized CV', 'Cover letter', 'Interview questions', 'Mock interview'] as const

export function MatchEngine() {
  const { ref, seen } = useInView<HTMLDivElement>(0.25)
  const [who, setWho] = useState(0)
  const p = PERSONAS[who]
  const job = p.jobs[0]

  return (
    <div ref={ref} className="mt-6 lg:mt-10">
      <PersonaSwitch personas={PERSONAS} active={who} onChange={setWho} label="Choose a profession" className="sm:justify-center" />

      <div className="mt-4 rounded-[22px] border border-line bg-white p-3 shadow-lp-card sm:p-5 lg:mt-6 lg:p-8">
        <div className="hidden grid-cols-[1fr_120px_1fr] items-end pb-4 md:grid">
          <div>
            <div className="font-semibold text-[11px] uppercase tracking-[0.08em] text-blue">The job asks for</div>
            <div className="mt-1 text-[15px] font-bold text-ink">{job.title} · {job.country}</div>
          </div>
          <div />
          <div>
            <div className="font-semibold text-[11px] uppercase tracking-[0.08em] text-teal">Your Career Profile has</div>
            <div className="mt-1 text-[15px] font-bold text-ink">{p.name} · example profile</div>
          </div>
        </div>
        <div className="mb-3 text-[13px] font-bold text-ink md:hidden">
          {job.title} · {job.country}
        </div>

        <ul key={who} className="space-y-2">
          {p.match.map((r, i) => (
            <li key={r.kind} className={cn('grid gap-0 rounded-[14px] bg-canvas p-2.5 md:grid-cols-[1fr_120px_1fr] md:items-center md:bg-transparent md:p-0', i >= 3 && 'max-sm:hidden')}>
              <div className={cn(s.rise, 'px-1 md:rounded-[12px] md:border md:border-blue/20 md:bg-blue-soft/50 md:px-3 md:py-2.5')} data-on={seen} style={{ ['--d' as string]: `${i * 120}ms` }}>
                <div className="font-semibold text-[11px] uppercase tracking-[0.08em] text-blue">{r.kind}</div>
                <div className="text-[13.5px] font-semibold text-ink">{r.job}</div>
              </div>
              <div className="hidden items-center justify-center md:flex" aria-hidden="true">
                <span className="relative h-[2px] w-full">
                  <span className={cn(s.wire, 'absolute inset-0 bg-gradient-to-r from-blue/50 to-teal')} data-on={seen} style={{ ['--d' as string]: `${i * 120 + 220}ms` }} />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                    <span className={cn(s.rise, 'grid size-6 place-items-center rounded-full bg-teal text-white shadow-m-2')} data-on={seen} style={{ ['--d' as string]: `${i * 120 + 520}ms` }}>
                      <Check className="size-3.5" />
                    </span>
                  </span>
                </span>
              </div>
              <div className={cn(s.rise, 'mt-1.5 rounded-[12px] border border-teal/25 bg-white px-3 py-2 md:mt-0 md:bg-teal-soft/40 md:py-2.5')} data-on={seen} style={{ ['--d' as string]: `${i * 120 + 400}ms` }}>
                <div className="font-semibold text-[11px] uppercase tracking-[0.08em] text-teal">From your profile</div>
                <div className="text-[13.5px] font-semibold text-ink">{r.you}</div>
              </div>
            </li>
          ))}

          <li className="grid gap-0 rounded-[14px] bg-gold-soft/50 p-2.5 md:grid-cols-[1fr_120px_1fr] md:items-center md:bg-transparent md:p-0">
            <div className={cn(s.rise, 'px-1 md:rounded-[12px] md:border md:border-dashed md:border-line-strong md:px-3 md:py-2.5')} data-on={seen} style={{ ['--d' as string]: '700ms' }}>
              <div className="font-semibold text-[11px] uppercase tracking-[0.08em] text-ink-muted">Also asked</div>
              <div className="text-[13.5px] font-semibold text-ink">{p.gap}</div>
            </div>
            <div className="hidden items-center justify-center md:flex" aria-hidden="true">
              <span className="w-full border-t-2 border-dashed border-gold/60" />
            </div>
            <div className={cn(s.rise, 'mt-1.5 rounded-[12px] border border-gold/40 bg-gold-soft px-3 py-2 md:mt-0 md:py-2.5')} data-on={seen} style={{ ['--d' as string]: '900ms' }}>
              <div className="font-semibold text-[11px] uppercase tracking-[0.08em] text-gold-ink">Not in your profile</div>
              <div className="text-[13.5px] font-semibold text-ink">We ask you. Never added on its own.</div>
            </div>
          </li>
        </ul>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 lg:mt-6">
        {OUTPUTS.map((o, i) => (
          <span key={o} className="flex items-center gap-2 sm:gap-2.5">
            <span className={cn(s.rise, 'inline-flex min-h-10 items-center gap-1.5 rounded-full border border-line bg-white px-3.5 text-[13px] font-semibold text-ink shadow-m-1')} data-on={seen} style={{ ['--d' as string]: `${1100 + i * 160}ms` }}>
              <Check className="size-3.5 text-ok" /> {o}
            </span>
            {i < OUTPUTS.length - 1 ? <span className="text-ink-muted" aria-hidden="true">→</span> : null}
          </span>
        ))}
      </div>
      <p className="mt-3 text-center">
        <Tag tone="muted">Example job and profile, for illustration</Tag>
      </p>
    </div>
  )
}
