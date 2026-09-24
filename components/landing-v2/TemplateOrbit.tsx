'use client'

import Link from 'next/link'
import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { getTemplate, type TemplateId } from '@/lib/templates'
import { SAMPLE_RESUME_DOCUMENT } from '@/lib/sampleResume'
import type { GulfPremiumProps } from '@/components/templates/GulfPremium'

/**
 * Templates orbit — landing v2 (design §6).
 *
 * Ten REAL templates, each rendering the fictional sample CV at small scale,
 * ride an ellipse around a centre stage that shows the front-most one large.
 *   θ = angle + i·2π/10 · x = rx·cosθ · y = ry·sinθ · depth d = (sinθ+1)/2
 *   scale (0.6 + 0.42d)·k · opacity 0.5 + 0.5d · z front 60+40d, back 10+30d
 * The stage sits at z 50, so back cards pass behind it.
 *
 * PERFORMANCE. The frame loop writes styles straight onto the ten slots — no
 * React render per frame. React only re-renders when the front-most card
 * changes (every ~3.8s) or on a control. The loop runs only while the orbit is
 * on screen, the tab is visible and something is actually moving.
 * Reduced motion: no auto-rotation; prev/next and tap jump straight there.
 */

const IDS: readonly TemplateId[] = [
  'gulf_premium',
  'ats_classic',
  'gcc_engineering',
  'executive_gcc',
  'modern_professional',
  'senior_compact',
  'gulf_minimal',
  'corporate_band',
  'technical_sidebar',
  'project_twocol',
]

const N = IDS.length
const STEP = (Math.PI * 2) / N
const FRONT = Math.PI / 2
const PAGE_W = 794
// Card: 150 wide, 5px padding + 2px border → a 136px window onto the page.
const MINI_W = 136
const MINI_H = 190
const STAGE_W = 330
const STAGE_H = 380
const TURN_MS = 38_000

const LAYOUTS = {
  wide: { k: 1, ry: 140, box: 800, track: 440, trackW: 900, trackH: 290, innerW: 640, innerH: 170, stageTop: 24, stageScale: 1 },
  compact: { k: 0.62, ry: 54, box: 650, track: 340, trackW: 340, trackH: 124, innerW: 240, innerH: 76, stageTop: 12, stageScale: 0.72 },
} as const

const TemplateRender = memo(function TemplateRender({ id }: { id: TemplateId }) {
  const Template = getTemplate(id).component
  return (
    <Template
      {...({
        document: SAMPLE_RESUME_DOCUMENT,
        profile: undefined,
        optimizedContent: undefined,
        skillsOrder: [],
        fieldVisibility: null,
      } as unknown as GulfPremiumProps)}
    />
  )
})

function tags(id: TemplateId) {
  const t = getTemplate(id)
  return [t.atsLevel === 'maximum' ? 'Maximum ATS' : 'High ATS', t.allowsPhoto ? 'Photo option' : 'No photo']
}

function frontIndex(angle: number) {
  let best = 0
  let bestV = -2
  for (let i = 0; i < N; i++) {
    const v = Math.sin(angle + i * STEP)
    if (v > bestV) {
      bestV = v
      best = i
    }
  }
  return best
}

export function TemplateOrbit({ className }: { className?: string }) {
  const boxRef = useRef<HTMLDivElement | null>(null)
  const slots = useRef<Array<HTMLButtonElement | null>>([])
  const angle = useRef(FRONT)
  const target = useRef<number | null>(null)
  const playingRef = useRef(true)
  const selRef = useRef(0)
  const rxRef = useRef(440)
  const compactRef = useRef(false)
  const reduced = useRef(false)
  const kick = useRef<() => void>(() => {})

  const [sel, setSel] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [compact, setCompact] = useState(false)
  const [rx, setRx] = useState(440)

  const L = compact ? LAYOUTS.compact : LAYOUTS.wide

  const paint = useCallback(() => {
    const lay = compactRef.current ? LAYOUTS.compact : LAYOUTS.wide
    const rx = rxRef.current
    for (let i = 0; i < N; i++) {
      const el = slots.current[i]
      if (!el) continue
      const th = angle.current + i * STEP
      const sn = Math.sin(th)
      const d = (sn + 1) / 2
      const sc = (0.6 + 0.42 * d) * lay.k
      el.style.transform = `translate(-50%, -50%) translate(${(rx * Math.cos(th)).toFixed(1)}px, ${(lay.ry * sn).toFixed(1)}px) scale(${sc.toFixed(3)})`
      el.style.zIndex = String(sn > 0 ? 60 + Math.round(d * 40) : 10 + Math.round(d * 30))
      el.style.opacity = (0.5 + 0.5 * d).toFixed(2)
      el.style.filter = `saturate(${(0.55 + 0.45 * d).toFixed(2)}) brightness(${(0.9 + 0.1 * d).toFixed(2)})`
      el.dataset.front = sn > 0 ? '1' : '0'
    }
  }, [])

  // Size → layout. Compact below 768px; the wide ellipse shrinks to fit a
  // tablet-width box instead of being clipped.
  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    const measure = () => {
      const w = box.clientWidth
      const isCompact = w < 768
      compactRef.current = isCompact
      rxRef.current = isCompact ? Math.min(140, (w - 100) / 2) : Math.min(440, (w - 170) / 2)
      setCompact(isCompact)
      setRx(rxRef.current)
      paint()
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(box)
    return () => ro.disconnect()
  }, [paint])

  useEffect(() => {
    const box = boxRef.current
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    reduced.current = media.matches
    if (media.matches) {
      playingRef.current = false
      setPlaying(false)
    }
    let visible = false
    let frame = 0
    let last = 0

    const loop = (now: number) => {
      const dt = last ? Math.min(now - last, 100) : 16
      last = now
      if (target.current !== null) {
        const diff = target.current - angle.current
        if (Math.abs(diff) < 0.003) {
          angle.current = target.current
          target.current = null
        } else {
          // 0.16 per 33ms step in the design, made frame-rate independent.
          angle.current += diff * (1 - Math.pow(0.84, dt / 33))
        }
      } else if (playingRef.current) {
        angle.current -= (dt / TURN_MS) * Math.PI * 2
        const f = frontIndex(angle.current)
        if (f !== selRef.current) {
          selRef.current = f
          setSel(f)
        }
      }
      paint()
      frame = 0
      sync()
    }

    const sync = () => {
      const moving = target.current !== null || playingRef.current
      const run = visible && moving && document.visibilityState === 'visible'
      if (run && !frame) {
        frame = requestAnimationFrame(loop)
      } else if (!run) {
        if (frame) cancelAnimationFrame(frame)
        frame = 0
        last = 0
      }
    }
    kick.current = sync

    const io = new IntersectionObserver((entries) => {
      visible = entries.some((e) => e.isIntersecting)
      sync()
    })
    if (box) io.observe(box)
    const onMedia = () => {
      reduced.current = media.matches
      if (media.matches) {
        playingRef.current = false
        setPlaying(false)
      }
      sync()
    }
    media.addEventListener('change', onMedia)
    document.addEventListener('visibilitychange', sync)
    paint()
    return () => {
      if (frame) cancelAnimationFrame(frame)
      io.disconnect()
      media.removeEventListener('change', onMedia)
      document.removeEventListener('visibilitychange', sync)
      kick.current = () => {}
    }
  }, [paint])

  const bringToFront = (i: number) => {
    const idx = ((i % N) + N) % N
    let delta = FRONT - (angle.current + idx * STEP)
    delta = Math.atan2(Math.sin(delta), Math.cos(delta))
    playingRef.current = false
    setPlaying(false)
    selRef.current = idx
    setSel(idx)
    if (reduced.current) {
      angle.current += delta
      target.current = null
      paint()
    } else {
      target.current = angle.current + delta
    }
    kick.current()
  }

  const toggle = () => {
    const next = !playingRef.current
    playingRef.current = next
    target.current = null
    setPlaying(next)
    kick.current()
  }

  const selected = getTemplate(IDS[sel])

  return (
    <div
      ref={boxRef}
      className={cn('relative w-full overflow-hidden', className)}
      style={{ height: L.box }}
      aria-roledescription="carousel"
      aria-label="GCC resume templates"
    >
      {/* track */}
      <div
        aria-hidden="true"
        className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-teal/20 shadow-[inset_0_-22px_46px_rgba(15,76,67,.08),0_26px_56px_rgba(15,76,67,.10)]"
        style={{
          top: L.track,
          width: Math.min(L.trackW, rx * 2 + 60),
          height: L.trackH,
          background:
            'radial-gradient(ellipse at 50% 82%, rgba(201,150,46,.20), transparent 34%), radial-gradient(ellipse at center, rgba(237,226,205,.45), rgba(219,236,232,.25) 58%, transparent 64%)',
        }}
      />
      <div
        aria-hidden="true"
        className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-teal/15"
        style={{ top: L.track, width: Math.min(L.innerW, rx * 1.45), height: L.innerH }}
      />

      {/* orbiting cards */}
      {IDS.map((id, i) => {
        const t = getTemplate(id)
        const on = i === sel
        return (
          <button
            key={id}
            type="button"
            ref={(n) => {
              slots.current[i] = n
            }}
            onClick={() => bringToFront(i)}
            aria-label={`Show ${t.name}`}
            aria-pressed={on}
            className={cn(
              'absolute left-1/2 w-[150px] rounded-[14px] border-2 bg-white p-[5px] text-left will-change-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal',
              'shadow-[0_8px_20px_rgba(15,76,67,.06)] data-[front=1]:shadow-[0_18px_34px_rgba(15,76,67,.16),0_34px_78px_rgba(15,76,67,.14)]',
              on ? 'border-teal' : 'border-line',
            )}
            style={{ top: L.track }}
          >
            <span aria-hidden="true" className="relative block overflow-hidden rounded-[9px] border border-[#F0ECE5] bg-white" style={{ height: MINI_H }}>
              <span className="absolute left-0 top-0 block origin-top-left" style={{ width: PAGE_W, transform: `scale(${MINI_W / PAGE_W})` }}>
                <TemplateRender id={id} />
              </span>
              <span className="absolute inset-x-0 bottom-0 h-[30px] bg-gradient-to-t from-white to-transparent" />
            </span>
            <span className="flex flex-col px-1 pb-[3px] pt-[7px]">
              <span className="text-[11.5px] font-extrabold leading-tight text-ink">{t.name}</span>
              <span className="text-[9.5px] font-bold uppercase text-ink-muted">
                {t.atsLevel === 'maximum' ? 'Maximum ATS' : t.category.replace('_', ' ')}
              </span>
            </span>
          </button>
        )
      })}

      {/* centre stage */}
      <div
        className="absolute left-1/2 z-50 origin-top"
        style={{ top: L.stageTop, width: STAGE_W, transform: `translateX(-50%) scale(${L.stageScale})` }}
      >
        <div
          className="relative overflow-hidden rounded-[18px] border border-line bg-white shadow-[0_30px_70px_rgba(15,76,67,.20),0_8px_18px_rgba(20,24,28,.08)]"
          style={{ height: STAGE_H }}
        >
          <div aria-hidden="true" className="absolute left-0 top-0 origin-top-left" style={{ width: PAGE_W, transform: `scale(${(STAGE_W - 2) / PAGE_W})` }}>
            <TemplateRender id={IDS[sel]} />
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[70px] bg-gradient-to-t from-white to-transparent" />
          <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full border border-line bg-white/95 px-2.5 py-[5px] text-[10px] font-extrabold tracking-[0.08em] text-teal">
            <span className={cn('size-[7px] rounded-full', playing ? 'bg-ok' : 'bg-gold')} />
            {playing ? 'ROTATING · TAP ANY RESUME' : 'PAUSED · FULL PREVIEW'}
          </div>
        </div>
      </div>

      {/* info + controls */}
      <div className="absolute inset-x-0 z-[120] flex justify-center px-3" style={{ bottom: compact ? 10 : 18 }}>
        <div
          className={cn(
            'flex flex-wrap items-center justify-center rounded-[18px] border border-line bg-white/95 shadow-[0_16px_40px_rgba(20,24,28,.10)]',
            compact ? 'gap-2.5 p-3' : 'gap-[18px] py-3 pl-[22px] pr-3.5',
          )}
        >
          <div className={cn(compact ? 'w-full text-center' : 'min-w-[250px] text-left')} aria-live="polite">
            <div className={cn('flex items-baseline gap-2.5', compact && 'justify-center')}>
              <span className="font-display text-[22px] font-semibold">{selected.name}</span>
              <span className="font-mono text-[12px] text-ink-muted">
                {String(sel + 1).padStart(2, '0')} / {String(N).padStart(2, '0')}
              </span>
            </div>
            <div className={cn('mt-1.5 flex items-center gap-1.5', compact && 'justify-center')}>
              {tags(IDS[sel]).map((tag) => (
                <span key={tag} className="rounded-full bg-canvas px-[9px] py-[3px] text-[10.5px] font-bold uppercase tracking-[0.06em] text-ink-muted">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          {!compact && <div className="h-11 w-px bg-line" aria-hidden="true" />}
          <button type="button" onClick={() => bringToFront(sel - 1)} aria-label="Previous template" className="flex size-11 items-center justify-center rounded-full border border-line bg-white text-ink hover:border-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </button>
          <button type="button" onClick={toggle} className="flex min-h-11 items-center gap-2 rounded-full bg-teal px-4 text-[13px] font-bold text-white hover:bg-[#0B3A33] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2">
            {playing ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <path d="M15.75 5.25v13.5M8.25 5.25v13.5" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M7 5v14l12-7z" />
              </svg>
            )}
            {playing ? 'Pause rotation' : 'Resume rotation'}
          </button>
          <button type="button" onClick={() => bringToFront(sel + 1)} aria-label="Next template" className="flex size-11 items-center justify-center rounded-full border border-line bg-white text-ink hover:border-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
          {!compact && (
            <Link href="/templates" className="flex min-h-11 items-center rounded-full border border-teal px-4 text-[13px] font-extrabold text-teal hover:bg-teal-soft">
              Use this template
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
