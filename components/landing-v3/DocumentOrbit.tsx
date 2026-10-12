'use client'

import Link from 'next/link'
import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { availableTemplates, getTemplate, type TemplateId } from '@/lib/templates'
import type { GulfPremiumProps } from '@/components/templates/GulfPremium'
import { PERSONAS } from './personas'
import { SAMPLE_CVS } from './sampleCvs'

// A curated view of the real collection: distinct layouts, colours and careers.
// Each real document mounts once. The selected card itself moves into the
// ellipse; no disconnected, duplicated center renderer is mounted.
type Item = { id: TemplateId; who: string }
const ITEMS: Item[] = [
  { id: 'gulf_premium', who: 'engineering' },
  { id: 'creative_gcc', who: 'hr' },
  { id: 'clinical_care', who: 'healthcare' },
  { id: 'ledger_classic', who: 'finance' },
  { id: 'project_twocol', who: 'construction' },
  { id: 'tech_horizon', who: 'it' },
  { id: 'falcon_executive', who: 'hr' },
  { id: 'blueprint_engineer', who: 'engineering' },
  { id: 'medical_pearl', who: 'healthcare' },
  { id: 'ats_classic', who: 'finance' },
]
const N = ITEMS.length
const STEP = (Math.PI * 2) / N
const FRONT = Math.PI / 2
const PAGE_W = 794
const TURN_MS = 52_000
const LAYOUTS = {
  wide: { k: 1, ry: 115, box: 540, track: 260, trackW: 1000, trackH: 350, innerW: 700, innerH: 220 },
  compact: { k: 0.65, ry: 62, box: 350, track: 170, trackW: 340, trackH: 230, innerW: 240, innerH: 160 },
} as const
const persona = (key: string) => PERSONAS.find((p) => p.key === key)!
const ItemRender = memo(function ItemRender({ item }: { item: Item }) {
  const Template = getTemplate(item.id).component
  return <Template {...({ document: SAMPLE_CVS[item.who], profile: undefined, optimizedContent: undefined, skillsOrder: [], fieldVisibility: null, styleOverrides: { size: 'large' } } as unknown as GulfPremiumProps)} />
})
function itemName(item: Item) { return getTemplate(item.id).name }
function itemTags(item: Item) {
  const t = getTemplate(item.id)
  return [t.atsLevel === 'maximum' ? 'ATS-focused layout' : 'Review parsing for your application', t.allowsPhoto ? 'Photo option' : 'No photo']
}

// Measure the actual template, including longer examples, and contain the
// entire page without clipping its footer or changing the document renderer.
const FittedPage = memo(function FittedPage({ item, width, height }: { item: Item; width: number; height: number }) {
  const page = useRef<HTMLDivElement>(null)
  const [pageH, setPageH] = useState(1123)
  useEffect(() => {
    const el = page.current
    if (!el) return
    const measure = () => setPageH(Math.max(1123, el.scrollHeight))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [item])
  const scale = Math.min(width / PAGE_W, height / pageH)
  return (
    <div aria-hidden="true" className="actual-template-orbit-face relative overflow-hidden bg-white" style={{ width, height }}>
      <div ref={page} className="absolute top-0" style={{ width: PAGE_W, left: (width - PAGE_W * scale) / 2, transform: `scale(${scale})`, transformOrigin: 'top left', pointerEvents: 'none' }}>
        <ItemRender item={item} />
      </div>
    </div>
  )
})

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

export function DocumentOrbit({ className }: { className?: string }) {
  const boxRef = useRef<HTMLDivElement | null>(null)
  const slots = useRef<Array<HTMLButtonElement | null>>([])
  const angle = useRef(FRONT)
  const target = useRef<number | null>(null)
  const playingRef = useRef(true)
  const selRef = useRef(0)
  const rxRef = useRef(460)
  const compactRef = useRef(false)
  const reduced = useRef(false)
  const focus = useRef(ITEMS.map((_, i) => i === 0 ? 1 : 0))
  const gesture = useRef<{ x: number; y: number } | null>(null)
  const suppressClick = useRef(false)
  const kick = useRef<() => void>(() => {})

  const [sel, setSel] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [compact, setCompact] = useState(false)
  const [rx, setRx] = useState(460)
  const [zoomed, setZoomed] = useState(false)


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
      const f = focus.current[i]
      const sc = (0.55 + 0.35 * d) * lay.k * (1 - f) + (compactRef.current ? 1.1 : 1.5) * f
      el.style.transform = `translate(-50%, -50%) translate(${(rx * Math.cos(th) * (1 - f)).toFixed(1)}px, ${(lay.ry * sn * (1 - f) - (compactRef.current ? 14 : 28) * f).toFixed(1)}px) scale(${sc.toFixed(3)})`
      el.style.zIndex = String(Math.round((sn > 0 ? 60 + d * 40 : 10 + d * 30) * (1 - f) + 50 * f))
      el.style.opacity = (0.55 + 0.45 * Math.max(d, f)).toFixed(2)
      el.dataset.front = sn > 0 ? '1' : '0'
    }
  }, [])

  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    const measure = () => {
      const w = box.clientWidth
      const isCompact = w < 768
      compactRef.current = isCompact
      rxRef.current = isCompact ? Math.max(65, Math.min(140, (w - 104) / 2)) : Math.min(470, (w - 170) / 2)
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
      if (last && now - last < 32) {
        frame = requestAnimationFrame(loop)
        return
      }
      const dt = last ? Math.min(now - last, 100) : 33
      last = now
      if (target.current !== null) {
        const diff = target.current - angle.current
        if (Math.abs(diff) < 0.003) {
          angle.current = target.current
          target.current = null
        } else {
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
      for (let i = 0; i < N; i++) {
        const goal = i === selRef.current ? 1 : 0
        focus.current[i] += (goal - focus.current[i]) * (1 - Math.pow(0.78, dt / 33))
        if (Math.abs(goal - focus.current[i]) < 0.001) focus.current[i] = goal
      }
      paint()
      frame = 0
      sync()
    }

    const sync = () => {
      const settling = focus.current.some((f, i) => f !== (i === selRef.current ? 1 : 0))
      const moving = target.current !== null || settling || (playingRef.current)
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
        playingRef.current = !media.matches
      setPlaying(!media.matches)
      if (media.matches) {
        playingRef.current = false
        setPlaying(false)
        if (target.current !== null) angle.current = target.current
        target.current = null
        focus.current = ITEMS.map((_, i) => i === selRef.current ? 1 : 0)
        paint()
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
    selRef.current = idx
    setSel(idx)
    if (reduced.current) {
      angle.current += delta
      focus.current = ITEMS.map((_, i) => i === idx ? 1 : 0)
      target.current = null
      paint()
    } else {
      target.current = angle.current + delta
    }
    kick.current()
  }

  const pause = () => {
    playingRef.current = false
    setPlaying(false)
    kick.current()
  }
  const openPreview = () => { pause(); setZoomed(true) }
  const selected = ITEMS[sel]
  const who = persona(selected.who)

  return (
    <div
      ref={boxRef}
      className={cn('relative isolate w-full overflow-hidden', className)}
      role="region"
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault()
          bringToFront(selRef.current + (event.key === 'ArrowLeft' ? -1 : 1))
        }
      }}
      aria-roledescription="carousel"
      aria-label="Resume template collection"
    >
      <div
        className="relative"
        style={{ height: L.box, touchAction: 'pan-y' }}
        onPointerDown={(event) => {
          if (!event.isPrimary) return
          gesture.current = { x: event.clientX, y: event.clientY }
          suppressClick.current = false
          pause()
        }}
        onPointerMove={(event) => {
          if (!gesture.current) return
          const dx = event.clientX - gesture.current.x
          const dy = event.clientY - gesture.current.y
          if (Math.abs(dx) > 32 && Math.abs(dx) > Math.abs(dy) * 1.25) {
            suppressClick.current = true
            gesture.current = null
            bringToFront(selRef.current + (dx < 0 ? 1 : -1))
          }
        }}
        onPointerUp={() => { gesture.current = null; playingRef.current = !reduced.current; setPlaying(!reduced.current); kick.current() }}
        onPointerCancel={() => { gesture.current = null; playingRef.current = !reduced.current; setPlaying(!reduced.current); kick.current() }}
        onClickCapture={(event) => {
          if (suppressClick.current) { event.preventDefault(); event.stopPropagation(); suppressClick.current = false }
        }}
      >
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

      {ITEMS.map((item, i) => {
        const on = i === sel
        const p = persona(item.who)
        return (
          <button
            key={item.id}
            type="button"
            ref={(n) => {
              slots.current[i] = n
            }}
            onClick={() => on ? openPreview() : bringToFront(i)}
            data-orbit-centre={on ? 'true' : undefined}
            aria-label={`${on ? 'Open' : 'Show'} ${itemName(item)} — ${p.name}, ${p.role}`}
            aria-pressed={on}
            className={cn(
              'absolute left-1/2 w-[170px] rounded-[12px] border-2 bg-white p-1.5 text-left will-change-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal',
              'shadow-[0_8px_20px_rgba(15,76,67,.06)] data-[front=1]:shadow-[0_18px_34px_rgba(15,76,67,.16),0_34px_78px_rgba(15,76,67,.14)]',
              on ? 'border-[#C9962E]' : 'border-line',
            )}
            style={{ top: L.track }}
          >
            <FittedPage item={item} width={154} height={218} />
            <span className="flex flex-col px-1 pb-[3px] pt-[7px]">
              <span className="text-[11.5px] font-extrabold leading-tight text-ink">{itemName(item)}</span>
              <span className="truncate text-[11px] font-bold uppercase text-ink-muted">{p.sector}</span>
            </span>
          </button>
        )
      })}

      </div>

      <p className="relative px-4 text-center text-[12px] text-ink-muted">Select a design{compact ? ' or swipe' : ''} · Open the complete page</p>
      {/* Controls stay in flow, so wrapping never overlaps a resume. */}
      <div className="relative z-[120] mt-4 flex justify-center px-3 pb-5">
        <div
          className={cn(
            'flex min-w-0 max-w-full flex-wrap items-center justify-center rounded-[18px] border border-line bg-white/95 shadow-[0_16px_40px_rgba(20,24,28,.10)]',
            compact ? 'gap-2.5 p-3' : 'gap-[18px] py-3 pl-[22px] pr-3.5',
          )}
        >
          <div className={cn(compact ? 'w-full min-w-0 text-center' : 'min-w-[270px] text-left')} aria-live={playing ? 'off' : 'polite'}>
            <div className={cn('flex items-baseline gap-2.5', compact && 'justify-center')}>
              <span className="type-card font-bold tracking-[-0.02em]">{itemName(selected)}</span>
              <span className="font-mono text-[12px] text-ink-muted">
                {String(sel + 1).padStart(2, '0')} / {String(N).padStart(2, '0')}
              </span>
            </div>
            <div className="mt-0.5 truncate text-[12.5px] text-ink-soft">
              Example · {who.name} · {who.role}
            </div>
            <div className={cn('mt-1.5 flex flex-wrap items-center gap-1.5', compact && 'justify-center')}>
              {itemTags(selected).map((tag) => (
                <span key={tag} className="rounded-full bg-canvas px-[9px] py-[3px] text-[11px] font-bold uppercase tracking-[0.06em] text-ink-muted">
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

          <button type="button" onClick={() => bringToFront(sel + 1)} aria-label="Next template" className="flex size-11 items-center justify-center rounded-full border border-line bg-white text-ink hover:border-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
          <button type="button" onClick={openPreview} className="min-h-11 rounded-full border border-line px-4 type-label text-ink hover:border-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal">View full size</button>
          {(
            <Link href="/templates" className="flex min-h-11 items-center rounded-full border border-teal px-4 text-[13px] font-extrabold text-teal hover:bg-teal-soft">
              Explore all {availableTemplates().length} templates
            </Link>
          )}
        </div>
      </div>
      {zoomed ? <FullSize item={selected} onClose={() => { setZoomed(false); playingRef.current = !reduced.current; setPlaying(!reduced.current); kick.current() }} /> : null}
    </div>
  )
}

/** Full-size, crisp preview in a native modal dialog (Esc and backdrop close it). */
function FullSize({ item, onClose }: { item: Item; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement | null>(null)
  const [w, setW] = useState(PAGE_W)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    setW(Math.min(PAGE_W, window.innerWidth - 40))
    d.showModal()
    const close = () => onClose()
    d.addEventListener('close', close)
    return () => d.removeEventListener('close', close)
  }, [onClose])
  const p = persona(item.who)
  return (
    <dialog
      ref={ref}
      aria-label={`${itemName(item)} — full size`}
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close()
      }}
      className="m-auto max-h-[92vh] w-fit max-w-[calc(100vw-16px)] overflow-hidden rounded-[16px] bg-transparent p-0 backdrop:bg-ink/70 backdrop:backdrop-blur-sm"
    >
      <div className="flex max-h-[92vh] flex-col overflow-hidden rounded-[16px] bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div className="min-w-0 leading-tight">
            <b className="block truncate text-[14px] text-ink">{itemName(item)}</b>
            <span className="block truncate text-[12px] text-ink-muted">Example · {p.name}, {p.role}</span>
          </div>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            className="grid size-10 shrink-0 place-items-center rounded-full border border-line text-ink hover:border-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
            aria-label="Close preview"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain bg-canvas p-2 sm:p-4">
          <div className="actual-template-orbit-face mx-auto bg-white shadow-m-2" style={{ width: w }}>
            <div style={{ width: PAGE_W, zoom: w / PAGE_W }}>
              <ItemRender item={item} />
            </div>
          </div>
        </div>
      </div>
    </dialog>
  )
}
