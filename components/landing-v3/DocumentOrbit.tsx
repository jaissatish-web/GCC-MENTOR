'use client'

import Link from 'next/link'
import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { getTemplate, type TemplateId } from '@/lib/templates'
import type { GulfPremiumProps } from '@/components/templates/GulfPremium'
import { PERSONAS, type Persona } from './personas'
import { SAMPLE_CVS } from './sampleCvs'

/**
 * Document orbit — the live landing page's template orbit
 * (components/landing-v2/TemplateOrbit.tsx), copied rather than imported so the
 * concept can change it without touching the live page.
 *
 * What changed for the concept:
 *  · the ten REAL templates each render a DIFFERENT fictional candidate
 *    (six professions, Gulf and expatriate), built by the real document builder;
 *  · three non-CV documents join the ring — a cover letter, an interview
 *    question paper and a mock-interview scorecard — so the ring shows the
 *    whole application pack, not only CVs.
 *
 * Mechanics are unchanged: the frame loop writes transforms straight onto the
 * slots (no React render per frame), runs only while on screen, and stops
 * under reduced motion.
 */

type DocKind = 'cover' | 'questions' | 'scorecard'
type Item = { kind: 'template'; id: TemplateId; who: string } | { kind: 'doc'; doc: DocKind; who: string }

const ITEMS: Item[] = [
  { kind: 'template', id: 'gulf_premium', who: 'engineering' },
  { kind: 'template', id: 'executive_gcc', who: 'hr' },
  { kind: 'doc', doc: 'cover', who: 'healthcare' },
  { kind: 'template', id: 'modern_professional', who: 'healthcare' },
  { kind: 'template', id: 'ats_classic', who: 'finance' },
  { kind: 'doc', doc: 'questions', who: 'finance' },
  { kind: 'template', id: 'gcc_engineering', who: 'construction' },
  { kind: 'template', id: 'senior_compact', who: 'it' },
  { kind: 'doc', doc: 'scorecard', who: 'hr' },
  { kind: 'template', id: 'gulf_minimal', who: 'hr' },
  { kind: 'template', id: 'corporate_band', who: 'engineering' },
  { kind: 'template', id: 'technical_sidebar', who: 'it' },
  { kind: 'template', id: 'project_twocol', who: 'construction' },
]

const N = ITEMS.length
const STEP = (Math.PI * 2) / N
const FRONT = Math.PI / 2
const PAGE_W = 794
const MINI_W = 156
const MINI_H = 214
const TURN_MS = 52_000

/**
 * HD. Pages are drawn with CSS `zoom`, not `transform: scale`: zoom lays the
 * page out at its final size, so text is rasterised crisp at every size
 * instead of being drawn at A4 and shrunk (which is what looked soft).
 * The stage is sized in real pixels per layout for the same reason.
 */
const LAYOUTS = {
  wide: { k: 1, ry: 150, box: 960, track: 610, trackW: 1000, trackH: 300, innerW: 700, innerH: 180, stageTop: 8, stageW: 460, stageH: 600 },
  compact: { k: 0.6, ry: 50, box: 760, track: 470, trackW: 340, trackH: 120, innerW: 240, innerH: 72, stageTop: 4, stageW: 318, stageH: 420 },
} as const

const persona = (key: string) => PERSONAS.find((p) => p.key === key)!

/* ── The three non-CV documents, drawn at A4 width (794px) like a template ── */

function Letterhead({ p }: { p: Persona }) {
  return (
    <div style={{ borderBottom: '3px solid #0F4C43', paddingBottom: 18 }}>
      <div style={{ fontFamily: 'Georgia, serif', fontSize: 40, fontWeight: 700, color: '#14181C' }}>{p.name}</div>
      <div style={{ fontSize: 20, color: '#0F4C43', fontWeight: 600, marginTop: 4 }}>{p.role}</div>
      <div style={{ fontSize: 16, color: '#616B76', marginTop: 6 }}>{p.base} · {p.years} years’ experience</div>
    </div>
  )
}

function CoverLetterDoc({ p }: { p: Persona }) {
  const job = p.jobs[0]
  const para = { fontSize: 19, lineHeight: 1.65, color: '#2A3138', margin: '0 0 18px' } as const
  return (
    <div style={{ width: PAGE_W, minHeight: 1123, background: '#fff', padding: '64px 72px', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <Letterhead p={p} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 30, fontSize: 17, color: '#414B55' }}>
        <span>Hiring Manager<br />{job.employer}</span>
        <span style={{ background: '#F7EFDD', color: '#8A6114', borderRadius: 999, padding: '6px 14px', height: 'fit-content', fontWeight: 700, fontSize: 15 }}>Professional tone</span>
      </div>
      <div style={{ marginTop: 26, fontSize: 20, fontWeight: 700, color: '#14181C' }}>Re: {job.title} — {job.country}</div>
      <div style={{ marginTop: 22 }}>
        <p style={para}>Dear Hiring Manager,</p>
        <p style={para}>
          I am applying for the {job.title} role. With {p.years} years as a {p.role}, I bring the experience your team described — and I can show it with results.
        </p>
        <p style={para}>In my current role I {p.bullets[0].replace(/\*\*/g, '').replace(/^./, (c) => c.toLowerCase())}</p>
        <p style={para}>I also {p.bullets[1].replace(/\*\*/g, '').replace(/^./, (c) => c.toLowerCase())}</p>
        <p style={para}>I would welcome the chance to discuss how this experience fits your plans in {job.country}.</p>
        <p style={{ ...para, marginTop: 30 }}>Yours sincerely,<br /><b>{p.name}</b></p>
      </div>
    </div>
  )
}

function QuestionsDoc({ p }: { p: Persona }) {
  const job = p.jobs[0]
  const qs: Array<[string, string]> = [
    ['Role', p.mock.question],
    ['Technical', `Describe your experience with ${p.skills[0]}.`],
    ['Gulf', `Why do you want to work in ${job.country}?`],
    ['Behavioural', 'Tell me about a time you worked under pressure.'],
    ['Technical', `How have you used ${p.skills[2]} in your work?`],
    ['Motivation', 'Where do you see yourself in five years?'],
  ]
  return (
    <div style={{ width: PAGE_W, minHeight: 1123, background: '#FDFCFA', padding: '60px 64px', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '2px solid #D2C9BC', paddingBottom: 16 }}>
        <div>
          <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 15, letterSpacing: 3, color: '#0F4C43' }}>INTERVIEW Q&amp;A · 25 QUESTIONS</div>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: 34, fontWeight: 700, color: '#14181C', marginTop: 6 }}>{job.title}</div>
          <div style={{ fontSize: 17, color: '#616B76', marginTop: 4 }}>{job.employer} · prepared for {p.name}</div>
        </div>
      </div>
      <ol style={{ listStyle: 'none', padding: 0, margin: '22px 0 0' }}>
        {qs.map(([cat, q], i) => (
          <li key={q} style={{ padding: '16px 0', borderBottom: '1px dashed #D2C9BC' }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'baseline' }}>
              <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 20, color: '#8A6114' }}>Q{i + 1}</span>
              <span style={{ fontSize: 21, fontWeight: 700, color: '#14181C', flex: 1 }}>{q}</span>
              <span style={{ fontSize: 14, fontWeight: 700, background: '#E4EEEB', color: '#0F4C43', borderRadius: 999, padding: '4px 12px' }}>{cat}</span>
            </div>
            {i === 0 ? (
              <div style={{ marginTop: 12, marginLeft: 44, background: '#E3EFE8', borderRadius: 12, padding: '12px 16px', fontSize: 17, lineHeight: 1.55, color: '#2A3138' }}>
                <b style={{ color: '#2C6E49' }}>Suggested answer · from your CV — </b>
                {p.mock.suggested}
              </div>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  )
}

function ScorecardDoc({ p }: { p: Persona }) {
  const labels = ['Technical command', 'Role fit', 'Gulf readiness', 'Answer structure']
  return (
    <div style={{ width: PAGE_W, minHeight: 1123, background: '#0B302F', padding: 48, fontFamily: 'Inter, system-ui, sans-serif', color: '#fff' }}>
      <div style={{ border: '2px solid #D6B36A', borderRadius: 28, padding: '40px 44px', minHeight: 1020 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: 32, fontWeight: 700 }}>GCC MENTOR</div>
          <div style={{ fontSize: 15, color: '#D6B36A', letterSpacing: 2, marginTop: 10 }}>MOCK INTERVIEW REPORT</div>
        </div>
        <div style={{ fontSize: 17, color: '#AFCBC5', marginTop: 6 }}>{p.name} · {p.jobs[0].title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 36, background: '#F5F0E7', color: '#102E2D', borderRadius: 22, padding: '30px 36px', marginTop: 30 }}>
          <div>
            <div style={{ fontSize: 16, color: '#63716D', letterSpacing: 2 }}>PREPARATION SCORE</div>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: 120, fontWeight: 700, lineHeight: 1 }}>
              {p.mock.overall}
              <span style={{ fontSize: 30, color: '#63716D' }}>/100</span>
            </div>
          </div>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: 30, fontWeight: 700 }}>Interview<br />ready</div>
        </div>
        <div style={{ marginTop: 34, fontSize: 16, color: '#D6B36A', letterSpacing: 2 }}>SCORE PROFILE</div>
        {labels.map((l, i) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 20, fontSize: 21 }}>
            <span style={{ width: 250, color: '#DCE8E5' }}>{l}</span>
            <span style={{ flex: 1, height: 14, borderRadius: 7, background: '#244E4B' }}>
              <span style={{ display: 'block', height: 14, borderRadius: 7, width: `${p.mock.scores[i]}%`, background: '#D6B36A' }} />
            </span>
            <b style={{ width: 40, textAlign: 'right' }}>{p.mock.scores[i]}</b>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 16, marginTop: 36 }}>
          <div style={{ flex: 1, background: '#153E3B', borderRadius: 16, padding: 20, fontSize: 18, lineHeight: 1.5 }}>
            <b style={{ color: '#9FD8BF' }}>What was good</b>
            <br />
            {p.mock.good}
          </div>
          <div style={{ flex: 1, background: '#153E3B', borderRadius: 16, padding: 20, fontSize: 18, lineHeight: 1.5 }}>
            <b style={{ color: '#E8C98A' }}>Improve next</b>
            <br />
            {p.mock.improve}
          </div>
        </div>
        <div style={{ marginTop: 30, fontSize: 15, color: '#AFCBC5' }}>Practice assessment · not an employer decision</div>
      </div>
    </div>
  )
}

const DOCS = { cover: CoverLetterDoc, questions: QuestionsDoc, scorecard: ScorecardDoc } as const
const DOC_NAMES: Record<DocKind, string> = { cover: 'Cover letter', questions: 'Interview Q&A', scorecard: 'Mock interview scorecard' }

const ItemRender = memo(function ItemRender({ item }: { item: Item }) {
  if (item.kind === 'doc') {
    const Doc = DOCS[item.doc]
    return <Doc p={persona(item.who)} />
  }
  const Template = getTemplate(item.id).component
  return (
    <Template
      {...({
        document: SAMPLE_CVS[item.who],
        profile: undefined,
        optimizedContent: undefined,
        skillsOrder: [],
        fieldVisibility: null,
      } as unknown as GulfPremiumProps)}
    />
  )
})

function itemName(item: Item) {
  return item.kind === 'doc' ? DOC_NAMES[item.doc] : getTemplate(item.id).name
}

function itemTags(item: Item) {
  if (item.kind === 'doc') {
    return [item.doc === 'cover' ? '4 tones' : item.doc === 'questions' ? 'From your CV' : 'Scored practice', 'Per job']
  }
  const t = getTemplate(item.id)
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
  const kick = useRef<() => void>(() => {})

  const [sel, setSel] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [compact, setCompact] = useState(false)
  const [rx, setRx] = useState(460)
  const [zoomed, setZoomed] = useState(false)
  const [boxW, setBoxW] = useState(1200)

  const L = compact ? LAYOUTS.compact : LAYOUTS.wide
  // Phones: the page fills the screen width (less a gutter), never overflows it.
  const stageW = compact ? Math.min(L.stageW, boxW - 32) : L.stageW
  const stageH = Math.round((stageW * L.stageH) / L.stageW)

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
      rxRef.current = isCompact ? Math.min(140, (w - 100) / 2) : Math.min(470, (w - 170) / 2)
      setCompact(isCompact)
      setRx(rxRef.current)
      setBoxW(w)
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

  const selected = ITEMS[sel]
  const who = persona(selected.who)

  return (
    <div
      ref={boxRef}
      className={cn('relative isolate w-full overflow-hidden', className)}
      style={{ height: L.box }}
      aria-roledescription="carousel"
      aria-label="Example CVs, cover letter, interview questions and scorecard"
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
            key={`${item.kind}-${i}`}
            type="button"
            ref={(n) => {
              slots.current[i] = n
            }}
            onClick={() => bringToFront(i)}
            aria-label={`Show ${itemName(item)} — ${p.name}, ${p.role}`}
            aria-pressed={on}
            className={cn(
              'absolute left-1/2 w-[170px] rounded-[14px] border-2 bg-white p-[5px] text-left will-change-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal',
              'shadow-[0_8px_20px_rgba(15,76,67,.06)] data-[front=1]:shadow-[0_18px_34px_rgba(15,76,67,.16),0_34px_78px_rgba(15,76,67,.14)]',
              on ? 'border-teal' : item.kind === 'doc' ? 'border-gold/50' : 'border-line',
            )}
            style={{ top: L.track }}
          >
            <span aria-hidden="true" className="relative block overflow-hidden rounded-[9px] border border-[#F0ECE5] bg-white" style={{ height: MINI_H }}>
              <span className="absolute left-0 top-0 block" style={{ width: PAGE_W, zoom: MINI_W / PAGE_W }}>
                <ItemRender item={item} />
              </span>
              <span className="absolute inset-x-0 bottom-0 h-[30px] bg-gradient-to-t from-white to-transparent" />
            </span>
            <span className="flex flex-col px-1 pb-[3px] pt-[7px]">
              <span className="text-[11.5px] font-extrabold leading-tight text-ink">{itemName(item)}</span>
              <span className="truncate text-[11px] font-bold uppercase text-ink-muted">{p.sector}</span>
            </span>
          </button>
        )
      })}

      {/* centre stage — real pixel size, crisp text */}
      <div className="absolute left-1/2 z-50 -translate-x-1/2" style={{ top: L.stageTop, width: stageW }}>
        <div
          className="relative overflow-hidden rounded-[14px] bg-white ring-1 ring-black/5 shadow-[0_2px_6px_rgba(20,24,28,.06),0_40px_90px_-20px_rgba(15,76,67,.40)]"
          style={{ height: stageH }}
        >
          <div aria-hidden="true" className="absolute left-0 top-0" style={{ width: PAGE_W, zoom: stageW / PAGE_W }}>
            <ItemRender item={selected} />
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[90px] bg-gradient-to-t from-white via-white/80 to-transparent" />
          <button
            type="button"
            onClick={() => setZoomed(true)}
            className="absolute bottom-3 left-1/2 flex min-h-10 -translate-x-1/2 items-center gap-2 rounded-full bg-ink px-4 text-[12.5px] font-bold text-white shadow-m-3 transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 motion-reduce:transition-none"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-4-4M11 8v6M8 11h6" />
            </svg>
            View full size
          </button>
        </div>

        {/* Floating detail chips — desktop only, they sit beside the page. */}
        {!compact && boxW >= 1100 ? (
          <>
            <div key={`who-${sel}`} className="absolute -left-[200px] top-[70px] w-[200px] animate-fade-in rounded-[16px] border border-line bg-white/95 p-3 shadow-m-3 backdrop-blur">
              <div className="flex items-center gap-2.5">
                <span className="relative size-11 shrink-0 overflow-hidden rounded-full ring-2 ring-gold/60">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={who.photo} alt="" className="size-full object-cover" />
                </span>
                <span className="min-w-0 leading-tight">
                  <b className="block truncate text-[13px] text-ink">{who.name}</b>
                  <span className="block truncate text-[11px] text-ink-muted">{who.role}</span>
                </span>
              </div>
              <div className="font-semibold mt-2 text-[11px] uppercase tracking-[0.08em] text-gold-ink">Example · {who.sector}</div>
            </div>
            <div className="absolute -right-[186px] top-[130px] w-[196px] rounded-[16px] border border-line bg-white/95 p-3 shadow-m-3 backdrop-blur">
              <div className="font-semibold text-[11px] uppercase tracking-[0.08em] text-ink-muted">Recruiter-ready</div>
              <ul className="mt-2 space-y-1.5 text-[12px] font-semibold text-ink">
                {(selected.kind === 'template'
                  ? [itemTags(selected)[0], 'Gulf details up front', itemTags(selected)[1]]
                  : ['Written for one job', 'Uses its keywords', 'From your own profile']
                ).map((x) => (
                  <li key={x} className="flex items-center gap-1.5">
                    <span className="grid size-4 place-items-center rounded-full bg-ok-soft text-ok">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg>
                    </span>
                    {x}
                  </li>
                ))}
              </ul>
            </div>
            <div className="absolute -left-[150px] top-[330px] rounded-full bg-gold px-4 py-2 text-[12.5px] font-extrabold text-ink shadow-[0_10px_24px_-8px_rgba(201,150,46,.7)]">
              {selected.kind === 'template' ? 'ATS-friendly layout' : 'Part of your job pack'}
            </div>
          </>
        ) : null}
      </div>

      {/* info + controls */}
      <div className="absolute inset-x-0 z-[120] flex justify-center px-3" style={{ bottom: compact ? 10 : 18 }}>
        <div
          className={cn(
            'flex flex-wrap items-center justify-center rounded-[18px] border border-line bg-white/95 shadow-[0_16px_40px_rgba(20,24,28,.10)]',
            compact ? 'gap-2.5 p-3' : 'gap-[18px] py-3 pl-[22px] pr-3.5',
          )}
        >
          <div className={cn(compact ? 'w-full text-center' : 'min-w-[270px] text-left')} aria-live="polite">
            <div className={cn('flex items-baseline gap-2.5', compact && 'justify-center')}>
              <span className="text-[21px] font-bold tracking-[-0.02em]">{itemName(selected)}</span>
              <span className="font-mono text-[12px] text-ink-muted">
                {String(sel + 1).padStart(2, '0')} / {String(N).padStart(2, '0')}
              </span>
            </div>
            <div className="mt-0.5 truncate text-[12.5px] text-ink-soft">
              {who.name} · {who.role}
            </div>
            <div className={cn('mt-1.5 flex items-center gap-1.5', compact && 'justify-center')}>
              {itemTags(selected).map((tag) => (
                <span key={tag} className="rounded-full bg-canvas px-[9px] py-[3px] text-[11px] font-bold uppercase tracking-[0.06em] text-ink-muted">
                  {tag}
                </span>
              ))}
            </div>
          </div>
          {!compact && <div className="h-11 w-px bg-line" aria-hidden="true" />}
          <button type="button" onClick={() => bringToFront(sel - 1)} aria-label="Previous document" className="flex size-11 items-center justify-center rounded-full border border-line bg-white text-ink hover:border-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal">
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
            {playing ? 'Pause' : 'Play'}
          </button>
          <button type="button" onClick={() => bringToFront(sel + 1)} aria-label="Next document" className="flex size-11 items-center justify-center rounded-full border border-line bg-white text-ink hover:border-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
          {!compact && selected.kind === 'template' && (
            <Link href="/templates" className="flex min-h-11 items-center rounded-full border border-teal px-4 text-[13px] font-extrabold text-teal hover:bg-teal-soft">
              See all templates
            </Link>
          )}
        </div>
      </div>
      {zoomed ? <FullSize item={selected} onClose={() => setZoomed(false)} /> : null}
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
          <div className="mx-auto bg-white shadow-m-2" style={{ width: w }}>
            <div style={{ width: PAGE_W, zoom: w / PAGE_W }}>
              <ItemRender item={item} />
            </div>
          </div>
        </div>
      </div>
    </dialog>
  )
}
