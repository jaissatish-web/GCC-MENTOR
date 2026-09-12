'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CSSProperties, ComponentType } from 'react'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  DocumentMagnifyingGlassIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

type Icon = ComponentType<{ className?: string }>

type PainPoint = {
  icon: Icon
  title: string
  body: string
  signal: string
  lift: string
}

const PAIN_POINTS: readonly PainPoint[] = [
  {
    icon: ClockIcon,
    title: 'Many applications, no replies',
    body: 'You keep applying, but recruiters stay silent. The page tells the truth: the problem is often hidden in matching, format, and Gulf-specific signals.',
    signal: 'Silent recruiter loop',
    lift: 'Find the hidden weak point',
  },
  {
    icon: DocumentMagnifyingGlassIcon,
    title: 'One generic CV for every job',
    body: 'A strong career can look weak when the resume is not rebuilt for the exact job description, keywords, scope, and country expectations.',
    signal: 'Low JD match',
    lift: 'Specialize every application',
  },
  {
    icon: MapPinIcon,
    title: 'Gulf hiring has its own rules',
    body: 'Visa position, site exposure, client standards, certifications, project type, and role level all change how your profile is read.',
    signal: 'Missing GCC signals',
    lift: 'Show Gulf-ready proof',
  },
  {
    icon: ChatBubbleLeftRightIcon,
    title: 'Shortlisted, but not confident',
    body: 'A better CV can win the call. The next challenge is answering from your real experience with confidence, structure, and technical clarity.',
    signal: 'Interview pressure',
    lift: 'Practice with real answers',
  },
]

function wrapIndex(index: number) {
  return (index + PAIN_POINTS.length) % PAIN_POINTS.length
}

function shortestOffset(index: number, active: number) {
  let offset = index - active
  const midpoint = PAIN_POINTS.length / 2

  if (offset > midpoint) offset -= PAIN_POINTS.length
  if (offset < -midpoint) offset += PAIN_POINTS.length

  return offset
}

export function PainPointCarousel() {
  const [active, setActive] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const activePoint = PAIN_POINTS[active]
  const ActiveIcon = activePoint.icon

  const goTo = useCallback((index: number) => {
    setActive(wrapIndex(index))
  }, [])

  const advance = useCallback(() => {
    setActive((current) => wrapIndex(current + 1))
  }, [])

  const activeMeta = useMemo(
    () => ({
      count: String(active + 1).padStart(2, '0'),
      total: String(PAIN_POINTS.length).padStart(2, '0'),
    }),
    [active],
  )

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (isPaused || reduceMotion.matches) return

    const interval = window.setInterval(advance, 5200)
    return () => window.clearInterval(interval)
  }, [advance, isPaused])

  return (
    <div
      aria-roledescription="carousel"
      aria-label="GCC Mentor pain points"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      className="mt-10 w-[calc(100vw-40px)] max-w-full min-w-0 overflow-hidden rounded-card border border-line bg-white shadow-m-2 sm:w-full"
    >
      <div className="grid min-w-0 lg:grid-cols-[0.82fr_1.18fr]">
        <div className="relative min-w-0 overflow-hidden bg-teal p-5 text-white sm:p-7 lg:p-8">
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:38px_38px]"
          />
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-teal-soft">
              <ActiveIcon className="size-4" />
              Pain signal {activeMeta.count}/{activeMeta.total}
            </span>
            <h3 className="mt-5 max-w-[315px] font-display text-[25px] font-semibold leading-[1.06] tracking-[-0.02em] sm:max-w-full sm:text-[34px]">
              {activePoint.title}
            </h3>
            <p aria-live="polite" className="mt-4 max-w-[320px] text-[15px] leading-relaxed text-teal-soft/90 sm:max-w-full">
              {activePoint.body}
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <div className="rounded-card border border-white/12 bg-white/10 p-4">
                <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-teal-soft/80">Problem</span>
                <p className="mt-2 font-display text-[18px] font-semibold leading-snug text-white">{activePoint.signal}</p>
              </div>
              <div className="rounded-card border border-gold/35 bg-gold/15 p-4">
                <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-gold">GCC Mentor action</span>
                <p className="mt-2 font-display text-[18px] font-semibold leading-snug text-white">{activePoint.lift}</p>
              </div>
            </div>

            <div className="mt-7 flex items-center justify-between gap-3">
              <div className="flex gap-2">
                {PAIN_POINTS.map((point, index) => (
                  <button
                    key={point.title}
                    type="button"
                    aria-label={`Show ${point.title}`}
                    aria-current={active === index ? 'true' : undefined}
                    onClick={() => goTo(index)}
                    className={cn(
                      'h-2.5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-teal',
                      active === index ? 'w-9 bg-gold' : 'w-2.5 bg-white/35 hover:bg-white/65',
                    )}
                  />
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  aria-label="Previous pain point"
                  onClick={() => goTo(active - 1)}
                  className="flex size-11 items-center justify-center rounded-ctl border border-white/15 bg-white/10 text-white transition hover:bg-white/18 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-teal"
                >
                  <ArrowLeftIcon className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label="Next pain point"
                  onClick={() => goTo(active + 1)}
                  className="flex size-11 items-center justify-center rounded-ctl bg-gold text-ink transition hover:bg-gold-ink hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-teal"
                >
                  <ArrowRightIcon className="size-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="relative min-h-[360px] min-w-0 overflow-hidden bg-canvas p-5 sm:min-h-[470px] sm:p-7 lg:min-h-[520px] lg:p-8">
          <div aria-hidden="true" className="absolute inset-x-10 top-10 h-28 rounded-full bg-gold/20 blur-3xl" />
          <div aria-hidden="true" className="absolute inset-x-6 bottom-10 h-40 rounded-full bg-teal/10 blur-3xl" />

          <div className="relative mx-auto h-[385px] max-w-[580px] sm:h-[420px] lg:h-[450px]">
            {PAIN_POINTS.map((point, index) => {
              const offset = shortestOffset(index, active)
              const depth = Math.max(0, 1 - Math.abs(offset) * 0.24)
              const isActive = offset === 0
              const isHidden = Math.abs(offset) > 1
              const Icon = point.icon
              const style = {
                opacity: isHidden ? 0 : 0.58 + depth * 0.42,
                pointerEvents: isHidden ? 'none' : 'auto',
                transform: `translate(-50%, -50%) translate(${offset * 42}px, ${Math.abs(offset) * 34 + offset * -8}px) scale(${0.9 + depth * 0.1}) rotate(${offset * -2.5}deg)`,
                zIndex: isActive ? 30 : 20 - Math.abs(offset),
              } satisfies CSSProperties

              return (
                <button
                  key={point.title}
                  type="button"
                  aria-label={`Select ${point.title}`}
                  aria-pressed={isActive}
                  onClick={() => goTo(index)}
                  className={cn(
                    'absolute left-1/2 top-1/2 w-[92%] max-w-[440px] rounded-card border bg-white p-5 text-left shadow-m-3 transition-[opacity,transform,border-color] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 sm:p-6',
                    isActive ? 'border-teal' : 'border-line hover:border-teal/50',
                    !isActive && 'hidden sm:block',
                  )}
                  style={style}
                >
                  <span className="flex items-start justify-between gap-4">
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-ctl bg-teal-soft text-teal shadow-m-1">
                      <Icon className="size-6" />
                    </span>
                    <span className="rounded-full bg-canvas px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  </span>
                  <h4 className="mt-5 font-display text-[20px] font-semibold leading-[1.08] tracking-[-0.01em] text-ink sm:text-[23px]">
                    {point.title}
                  </h4>
                  <p className="mt-3 text-[13.5px] leading-relaxed text-ink-soft sm:text-[14px]">{point.body}</p>
                  <div className="mt-5 flex items-center gap-2 rounded-ctl border border-line bg-canvas p-3">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-gold" />
                    <span className="text-[12.5px] font-semibold leading-snug text-ink">{point.lift}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
