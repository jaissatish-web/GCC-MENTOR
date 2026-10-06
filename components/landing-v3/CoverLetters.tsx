'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import s from './concept.module.css'
import { PERSONAS, type Persona, type Job } from './personas'
import { PersonaSwitch, Rich, Tag } from './primitives'

/**
 * One person, three jobs, three different letters. Each opens on its own
 * company and role, leads with the evidence that job asks for, and uses a
 * different tone (the product has four: Professional, Technical, Short,
 * Explanatory). Letters are assembled from the example persona's facts, so
 * nothing in them is new — the point this section makes.
 */
const TONES = ['Professional', 'Technical', 'Short'] as const

function letter(p: Persona, job: Job, i: number) {
  const b = (n: number) => p.bullets[n].replace(/^./, (c) => c.toLowerCase())
  if (i === 0) {
    return {
      open: `I am applying for the **${job.title}** role with your ${job.employer.split(' · ')[0].toLowerCase()} in ${job.employer.split(' · ')[1]}.`,
      body: `In ${p.years} years as a ${p.role}, I ${b(0)}`,
      close: `I would welcome the chance to bring this experience to your team in ${job.country}.`,
    }
  }
  if (i === 1) {
    return {
      open: `Your ${job.title} vacancy asks for **${p.skills[0]}**, **${p.skills[1]}** and **${p.skills[2]}** — the work I have done for ${p.years} years.`,
      body: `Most recently, I ${b(1)}`,
      close: `I hold ${p.certs[0]} and can share detail on any of this at interview.`,
    }
  }
  return {
    open: `Please consider me for **${job.title}** in ${job.country}.`,
    body: `${p.years} years as a ${p.role}. Recent result: ${b(0)}`,
    close: 'Available to interview at short notice.',
  }
}

export function CoverLetters() {
  const [who, setWho] = useState(0)
  const p = PERSONAS[who]

  return (
    <div className="mt-6 lg:mt-10">
      <PersonaSwitch personas={PERSONAS} active={who} onChange={setWho} label="Choose a profession" className="sm:justify-center" />
      <ol key={who} className="-mx-4 mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 lg:mt-8 lg:gap-5 [&::-webkit-scrollbar]:hidden">
        {p.jobs.map((job, i) => {
          const L = letter(p, job, i)
          return (
            <li
              key={job.title}
              className={cn(s.enter, 'relative w-[84%] shrink-0 snap-center md:w-auto')}
              style={{ animationDelay: `${i * 120}ms` }}
            >
              {/* A sheet of paper, slightly lifted, like a real letter */}
              <article
                aria-label={`Example cover letter for ${job.title}, ${job.country}`}
                className={cn(
                  'relative h-full rounded-[6px] border border-line bg-white px-5 pb-6 pt-5 shadow-[0_1px_2px_rgba(20,24,28,0.06),0_22px_40px_-20px_rgba(20,24,28,0.35)] transition-transform duration-300 hover:-translate-y-1 motion-reduce:transition-none',
                  i === 1 ? 'md:rotate-0' : i === 0 ? 'md:-rotate-[0.6deg]' : 'md:rotate-[0.6deg]',
                )}
              >
                <span className="absolute inset-x-0 top-0 h-1 rounded-t-[6px] bg-teal" aria-hidden="true" />
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[15px] font-bold leading-tight text-ink tracking-[-0.02em]">{p.name}</div>
                    <div className="type-helper text-ink-muted">{p.role}</div>
                  </div>
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-teal-soft font-mono type-caption text-teal">{job.code}</span>
                </div>
                <div className="mt-3 border-t border-line pt-3 type-helper text-ink-muted">
                  Hiring Manager · {job.employer}
                  <div className="mt-0.5 font-semibold text-ink">Re: {job.title}</div>
                </div>
                <div className="mt-3 space-y-2 font-redesign-sans type-body text-ink-soft">
                  <p>Dear Hiring Manager,</p>
                  <p><Rich text={L.open} mark="bold" /></p>
                  <p><Rich text={L.body} mark="bold" /></p>
                  <p>{L.close}</p>
                  <p className="pt-1">Sincerely,<br /><span className="text-ink">{p.name}</span></p>
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  <Tag tone="teal">{TONES[i]} tone</Tag>
                  <Tag tone="gold">For {job.country}</Tag>
                </div>
              </article>
            </li>
          )
        })}
      </ol>
      <p className="mt-2 text-center type-helper text-ink-muted">Example letters built from one example profile. Each letter is tailored to a different job.</p>
    </div>
  )
}
