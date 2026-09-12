'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, RefCallback } from 'react'
import {
  ArrowPathIcon,
  MagnifyingGlassPlusIcon,
  PauseIcon,
  PlayIcon,
} from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'
import { getTemplate, type TemplateId } from '@/lib/templates'
import { SAMPLE_RESUME_DOCUMENT } from '@/lib/sampleResume'
import type { GulfPremiumProps } from '@/components/templates/GulfPremium'

const PAGE_W = 794
const PAGE_H = 1123
const MINI_W = 140
const MINI_INNER_W = MINI_W - 12
const MINI_SCALE = MINI_INNER_W / PAGE_W
const MINI_H = 194
const ORBIT_SECONDS = 38
const FRONT_ANGLE = Math.PI / 2

const ORBIT_TEMPLATE_IDS: readonly TemplateId[] = [
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

type StyleVars = CSSProperties & Record<string, string | number>

function TemplateRender({ templateId }: { templateId: TemplateId }) {
  const Template = getTemplate(templateId).component

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
}

function OrbitMiniTemplate({
  id,
  isActive,
  onSelect,
  slotRef,
}: {
  id: TemplateId
  isActive: boolean
  onSelect: () => void
  slotRef: RefCallback<HTMLButtonElement>
}) {
  const template = getTemplate(id)

  return (
    <button
      type="button"
      aria-pressed={isActive}
      aria-label={`Pause and inspect ${template.name}`}
      onClick={onSelect}
      ref={slotRef}
      className="actual-template-orbit-slot absolute left-1/2 focus-visible:outline-none"
    >
      <span
        className={cn(
          'actual-template-orbit-face block overflow-hidden rounded-card border bg-white p-1.5 text-left shadow-m-3 transition-shadow',
          isActive ? 'border-teal ring-2 ring-teal/35' : 'border-line hover:border-teal/70',
        )}
      >
        <span aria-hidden="true" className="relative block overflow-hidden rounded-ctl bg-canvas" style={{ height: MINI_H }}>
          <span
            className="absolute left-0 top-0 block origin-top-left"
            style={{ width: PAGE_W, transform: `scale(${MINI_SCALE})` }}
          >
            <TemplateRender templateId={id} />
          </span>
          <span className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white to-transparent" />
        </span>
        <span className="flex min-h-[54px] flex-col justify-center gap-0.5 px-1.5 py-2">
          <span className="text-[12px] font-bold leading-tight text-ink">{template.name}</span>
          <span className="text-[10.5px] font-semibold uppercase leading-tight text-ink-muted">
            {template.atsLevel === 'maximum' ? 'Maximum ATS' : template.category.replace('_', ' ')}
          </span>
        </span>
      </span>
    </button>
  )
}

function SelectedTemplatePreview({ templateId }: { templateId: TemplateId }) {
  const template = getTemplate(templateId)
  const boxRef = useRef<HTMLDivElement | null>(null)
  const [scale, setScale] = useState(0)

  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const measure = () => setScale(el.clientWidth / PAGE_W)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] lg:items-start">
      <div className="min-w-0">
        <div
          ref={boxRef}
          aria-hidden="true"
          className="relative mx-auto w-full max-w-[390px] overflow-hidden rounded-card border border-line bg-white shadow-m-3"
          style={{ height: scale ? Math.round(PAGE_H * scale * 0.68) : 360 }}
        >
          {scale > 0 ? (
            <div
              className="absolute left-0 top-0 origin-top-left"
              style={{ width: PAGE_W, transform: `scale(${scale})` }}
            >
              <TemplateRender templateId={templateId} />
            </div>
          ) : null}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white to-transparent" />
        </div>
      </div>

      <div className="rounded-card border border-line bg-canvas p-4">
        <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.12em] text-teal">
          <MagnifyingGlassPlusIcon className="size-4" />
          Clicked template
        </div>
        <h4 className="mt-3 font-display text-[22px] font-semibold leading-tight text-ink">{template.name}</h4>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">{template.description}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-white px-2.5 py-1 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-ink-muted">
            {template.atsLevel === 'maximum' ? 'Maximum ATS' : 'High ATS'}
          </span>
          <span className="rounded-full bg-white px-2.5 py-1 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-ink-muted">
            {template.allowsPhoto ? 'Photo option' : 'No photo'}
          </span>
        </div>
        <p className="mt-4 text-[12.5px] leading-relaxed text-ink-muted">
          Rendered from the real resume template engine using the fictional GCC sample CV.
        </p>
      </div>
    </div>
  )
}

export function TemplateOrbit() {
  const templates = useMemo(() => ORBIT_TEMPLATE_IDS.map((id) => getTemplate(id)), [])
  const [activeId, setActiveId] = useState<TemplateId>(ORBIT_TEMPLATE_IDS[0])
  const [paused, setPaused] = useState(false)
  const orbitRef = useRef<HTMLDivElement | null>(null)
  const slotRefs = useRef<Array<HTMLButtonElement | null>>([])
  const phaseRef = useRef(FRONT_ANGLE)
  const pausedRef = useRef(false)

  const applyOrbitFrame = useCallback(() => {
    const step = (Math.PI * 2) / templates.length
    const orbitBox = orbitRef.current
    const width = orbitBox?.clientWidth ?? 620
    const height = orbitBox?.clientHeight ?? 520
    const isCompact = width < 520
    const radiusX = Math.min(isCompact ? 148 : 218, Math.max(isCompact ? 92 : 128, width * 0.34))
    const radiusY = Math.min(isCompact ? 108 : 136, Math.max(isCompact ? 74 : 96, height * 0.21))
    let frontIndex = 0
    let frontDepth = -1

    slotRefs.current.forEach((slot, index) => {
      if (!slot) return
      const face = slot.querySelector<HTMLElement>('.actual-template-orbit-face')

      const angle = phaseRef.current + step * index
      const sin = Math.sin(angle)
      const cos = Math.cos(angle)
      const depth = (sin + 1) / 2
      const scale = (isCompact ? 0.5 : 0.52) + depth * (isCompact ? 0.98 : 1.08)
      const x = cos * radiusX
      const y = sin * radiusY + depth * (isCompact ? 22 : 30) - (1 - depth) * (isCompact ? 12 : 18)
      const opacity = 0.36 + depth * 0.64
      const brightness = 0.82 + depth * 0.2
      const saturation = 0.74 + depth * 0.26

      if (depth > frontDepth) {
        frontDepth = depth
        frontIndex = index
      }

      slot.style.transform = `translate(-50%, -50%) translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${scale.toFixed(3)})`
      slot.style.opacity = opacity.toFixed(3)
      slot.style.zIndex = String(Math.round(depth * 100) + 10)
      if (face) {
        face.style.filter = `saturate(${saturation.toFixed(3)}) brightness(${brightness.toFixed(3)})`
        face.style.transform = 'translateZ(0)'
      }
      slot.classList.toggle('is-visual-front', depth > 0.92)
      slot.classList.toggle('is-visual-back', depth < 0.18)
    })

    slotRefs.current.forEach((slot, index) => {
      slot?.classList.toggle('is-orbit-leader', index === frontIndex)
    })
  }, [templates.length])

  useEffect(() => {
    pausedRef.current = paused
  }, [paused])

  useEffect(() => {
    let last = performance.now()
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

    const tick = () => {
      const now = performance.now()
      const delta = now - last
      last = now

      if (!pausedRef.current && !reduceMotion.matches) {
        phaseRef.current += (delta / (ORBIT_SECONDS * 1000)) * Math.PI * 2
      }

      applyOrbitFrame()
    }

    applyOrbitFrame()
    const interval = window.setInterval(tick, 80)
    return () => window.clearInterval(interval)
  }, [applyOrbitFrame])

  const moveTemplateToFront = (id: TemplateId, index: number) => {
    const step = (Math.PI * 2) / templates.length
    phaseRef.current = FRONT_ANGLE - step * index
    setActiveId(id)
    setPaused(true)
    applyOrbitFrame()
  }

  return (
    <div className="rounded-card border border-line bg-white p-5 shadow-m-2">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-teal">10 actual GCC templates</span>
          <h3 className="mt-2 font-display text-[24px] font-semibold leading-tight text-ink">
            Real resume previews on an upright circular stage.
          </h3>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-soft px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-gold-ink">
          <ArrowPathIcon className="size-3.5" />
          Clockwise
        </span>
      </div>

      <div
        ref={orbitRef}
        className={cn(
          'actual-template-orbit relative mx-auto mt-7 max-w-[620px] overflow-hidden rounded-card border border-line bg-canvas',
          'h-[500px] sm:h-[560px] lg:h-[600px]',
          paused && 'is-paused',
        )}
        style={
          {
            '--orbit-radius': 'clamp(132px, 18vw, 164px)',
            '--orbit-duration': `${ORBIT_SECONDS}s`,
          } as StyleVars
        }
      >
        <div className="actual-template-orbit-path" />
        <div className="actual-template-orbit-track absolute inset-0">
          {templates.map((template, index) => {
            return (
              <OrbitMiniTemplate
                key={template.id}
                id={template.id}
                isActive={template.id === activeId}
                onSelect={() => moveTemplateToFront(template.id, index)}
                slotRef={(node) => {
                  slotRefs.current[index] = node
                }}
              />
            )
          })}
        </div>
        <div className="pointer-events-none absolute bottom-4 left-1/2 z-30 -translate-x-1/2 rounded-full border border-teal/20 bg-white/90 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-teal shadow-m-2">
          front resume is enlarged below
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12.5px] leading-relaxed text-ink-muted">
          Click any resume to stop the circulation and inspect that exact template below.
        </p>
        <button
          type="button"
          onClick={() => setPaused((value) => !value)}
          className="inline-flex items-center justify-center gap-2 rounded-ctl border border-line bg-white px-3 py-2 text-[12.5px] font-bold text-ink shadow-m-1 transition hover:border-teal/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2"
        >
          {paused ? <PlayIcon className="size-4" /> : <PauseIcon className="size-4" />}
          {paused ? 'Resume rotation' : 'Pause rotation'}
        </button>
      </div>

      <div className="mt-5">
        <SelectedTemplatePreview templateId={activeId} />
      </div>
    </div>
  )
}
