'use client'

import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { DocumentReader } from '@/components/resume/ResumeDocumentView'
import { getTemplate, type TemplateId } from '@/lib/templates'
import { SampleResumePreview } from '@/components/resume/SampleResumePreview'
import { SAMPLE_RESUME_DOCUMENT } from '@/lib/sampleResume'

// A curated view of the real collection: distinct layouts and colours with one shared candidate.
// Each real document mounts once. The selected card itself moves into the
// ellipse; no disconnected, duplicated center renderer is mounted.
type Item = { id: TemplateId }
const ITEMS: Item[] = [
  { id: 'gulf_premium' },
  { id: 'creative_gcc' },
  { id: 'clinical_care' },
  { id: 'ledger_classic' },
  { id: 'project_twocol' },
  { id: 'tech_horizon' },
  { id: 'falcon_executive' },
  { id: 'blueprint_engineer' },
  { id: 'medical_pearl' },
  { id: 'ats_classic' },
]
const N = ITEMS.length
const STEP = (Math.PI * 2) / N
const FRONT = Math.PI / 2
const PAGE_W = 794
const CARD_W = 170
const ORBIT_PADDING = 8
const TURN_MS = 52_000
function orbitLayout(width: number) {
  const compact = width < 480
  const size = compact
    ? Math.max(0.76, Math.min(1, width / 360))
    : Math.max(0.9, Math.min(1.18, 0.8 + width / 4800))
  const orbitScale = (compact ? 0.65 : 1.07) * size
  const box = compact ? 350 : 480 * Math.max(1, size)

  // Reserve room for the widest orbiting card and its focus outline at each edge.
  const radius = Math.max(0, (width - CARD_W * 0.9 * orbitScale) / 2 - ORBIT_PADDING)
  return {
    radius,
    orbitScale,
    focusScale: (compact ? 1.1 : 1.45) * size,
    focusLift: compact ? 14 : 28,
    rise: compact ? 62 : 100,
    box,
    track: box / 2 - (compact ? 5 : 10),
    trackHeight: compact ? 230 : 380,
    innerHeight: compact ? 160 : 240,
  }
}

const ItemRender = memo(function ItemRender({ item }: { item: Item }) {
  return <SampleResumePreview templateId={item.id} />
})
function itemName(item: Item) { return getTemplate(item.id).name }
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
      <div className="absolute top-0" style={{ left: (width - PAGE_W * scale) / 2, width: PAGE_W * scale }}>
        <div ref={page} style={{ width: PAGE_W, zoom: scale, textRendering: 'geometricPrecision', pointerEvents: 'none' }}>
          <ItemRender item={item} />
        </div>
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
  const reduced = useRef(false)
  const focus = useRef(ITEMS.map((_, i) => i === 0 ? 1 : 0))
  const gesture = useRef<{ x: number; y: number } | null>(null)
  const suppressClick = useRef(false)
  const kick = useRef<() => void>(() => {})

  const [sel, setSel] = useState(0)
  const [layout, setLayout] = useState(() => orbitLayout(960))
  const layoutRef = useRef(layout)
  const [zoomed, setZoomed] = useState<Item | null>(null)


  const paint = useCallback(() => {
    const { radius, orbitScale, focusScale, focusLift, rise } = layoutRef.current
    for (let i = 0; i < N; i++) {
      const el = slots.current[i]
      if (!el) continue
      const th = angle.current + i * STEP
      const sn = Math.sin(th)
      const d = (sn + 1) / 2
      const f = focus.current[i]
      const sc = (0.55 + 0.35 * d) * orbitScale * (1 - f) + focusScale * f
      el.style.transform = `translate(-50%, -50%) translate(${(radius * Math.cos(th) * (1 - f)).toFixed(1)}px, ${(rise * sn * (1 - f) - focusLift * f).toFixed(1)}px) scale(${sc.toFixed(3)})`
      el.style.zIndex = String(Math.round((sn > 0 ? 60 + d * 40 : 10 + d * 30) * (1 - f) + 50 * f))
      el.style.opacity = (0.55 + 0.45 * Math.max(d, f)).toFixed(2)
      el.dataset.front = sn > 0 ? '1' : '0'
    }
  }, [])

  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    const measure = () => {
      const measured = orbitLayout(box.clientWidth)
      layoutRef.current = measured
      setLayout(measured)
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
      if (media.matches) {
        playingRef.current = false
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
    kick.current()
  }
  const openPreview = (item: Item) => { pause(); setZoomed(item) }

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
        style={{ height: layout.box, touchAction: 'pan-y' }}
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
        onPointerUp={() => { gesture.current = null; playingRef.current = !reduced.current; kick.current() }}
        onPointerCancel={() => { gesture.current = null; playingRef.current = !reduced.current; kick.current() }}
        onClickCapture={(event) => {
          if (suppressClick.current) { event.preventDefault(); event.stopPropagation(); suppressClick.current = false }
        }}
      >
      <div
        aria-hidden="true"
        className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          top: layout.track,
          width: layout.radius * 2 + 60,
          height: layout.trackHeight,
          borderRadius: 0,
          boxShadow: 'none',
          border: '1px solid var(--lp-line, #E2E8F0)',
        }}
      />
      <div
        aria-hidden="true"
        className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ top: layout.track, width: layout.radius * 1.45, height: layout.innerHeight, borderRadius: 0, border: '1px solid var(--lp-line, #E2E8F0)' }}
      />

      {ITEMS.map((item, i) => {
        const on = i === sel
        const sample = SAMPLE_RESUME_DOCUMENT.header
        return (
          <button
            key={item.id}
            type="button"
            ref={(n) => {
              slots.current[i] = n
            }}
            onClick={() => openPreview(item)}
            data-orbit-centre={on ? 'true' : undefined}
            aria-label={`Open ${itemName(item)}, ${sample.displayName}, ${sample.targetJobTitle}`}
            aria-pressed={on}
            className={cn(
              'absolute left-1/2 rounded-[var(--lp-radius-lg,10px)] border bg-white p-1.5 text-left',
              'transition-colors motion-reduce:transition-none',
            )}
            style={{ top: layout.track, width: CARD_W, boxShadow: 'none', borderColor: on ? 'var(--lp-accent, #B47B2B)' : 'var(--lp-line, #E2E8F0)' }}
          >
            <FittedPage item={item} width={154} height={218} />
            <span className="flex flex-col px-1 pb-[3px] pt-[7px]">
              <span className="text-[length:var(--lp-card,15px)] leading-tight" style={{ color: 'var(--lp-ink, #0B1628)', fontWeight: 'var(--lp-heading-weight, 600)' }}>{itemName(item)}</span>
              <span className="truncate text-[length:var(--lp-label,13px)] uppercase" style={{ color: 'var(--lp-muted, #64748B)', fontWeight: 'var(--lp-body-weight, 400)' }}>{getTemplate(item.id).allowsPhoto ? 'Optional photo' : 'ATS, No photo'}</span>
            </span>
          </button>
        )
      })}

      </div>

      {zoomed ? <FullSize item={zoomed} onClose={() => { setZoomed(null); playingRef.current = !reduced.current; kick.current() }} /> : null}
    </div>
  )
}

/** The landing and saved-resume previews share the same native text reader. */
function FullSize({ item, onClose }: { item: Item; onClose: () => void }) {
  const sample = SAMPLE_RESUME_DOCUMENT.header
  return <DocumentReader title={itemName(item)} caption={`${sample.displayName}, ${sample.targetJobTitle}`} onClose={onClose}><div className="actual-template-orbit-face"><ItemRender item={item} /></div></DocumentReader>
}

