'use client'

import { useEffect, useRef, useState } from 'react'
import { availableTemplates, getTemplate, TEMPLATE_FIELDS, type TemplateField, type TemplateId } from '@/lib/templates'
import { cn } from '@/lib/utils'
import type { ResumeDocument } from '@/lib/resumeDocument'
import type { GulfPremiumProps } from '@/components/templates/GulfPremium'

/**
 * Template chooser (TASK-138).
 *
 * REAL PREVIEWS, NOT PICTURES. Each card renders the actual template component
 * with the user's OWN document, scaled down — so what they pick is literally
 * what they will get. Static screenshots would drift from the renderer the
 * moment a template changed, and the spec (§16) rules them out for exactly
 * that reason.
 *
 * The scale is a CSS transform on a fixed-size box, the same technique
 * ResumeDocumentView uses for the full document: the page is never reflowed,
 * because a reflowed preview would stop predicting the PDF.
 *
 * Each card is a real <button> so keyboard and screen-reader users get the
 * behaviour they expect, with the current choice marked aria-pressed.
 */

const PAGE_W = 794
const PAGE_H = 1123

/**
 * Two layouts, one picker (TASK-146).
 *
 * `grid` is the gallery at /templates — browse ten designs side by side.
 * `rail` is the persistent left column on the resume screen: one card per row,
 * narrower and shorter, so all ten stay scannable beside the document instead
 * of hiding behind a toggle. Same component either way, because two pickers
 * would be two things that can disagree about which template is in use.
 *
 * THE CARD IS EXACTLY AS WIDE AS THE PREVIEW (TASK-148). It used to be a
 * `grid-cols-4`, which stretched each card to whatever a quarter of the
 * container happened to be — ~298px at the gallery's 1240px — while the page
 * inside was scaled to a fixed 200px and pinned `left-0`. Every thumbnail
 * therefore sat shoved against the left edge of its own card with ~98px of dead
 * white space to its right. Reported by the founder off the deployed site.
 * Fixing the scale to the card is not possible in plain CSS (a transform cannot
 * read its parent's width), so the card is sized to the preview instead and the
 * row is centred — deterministic, and no ResizeObserver.
 *
 * HEIGHT IS A FRACTION OF THE PAGE, cut from the bottom (TASK-150, founder's
 * call). A full-page thumbnail was right in principle and too tall in practice:
 * ten of them made the gallery a long scroll for information that is decided in
 * the top half. `pageFraction` keeps the page at true A4 WIDTH — so the layout
 * is never distorted — and simply shows the top portion, letting
 * `overflow-hidden` clip the rest. Header, summary and the first job are what a
 * template is judged on, and all three sit inside 75%.
 */
const CARD_BORDER = 1
/** The phone grid's gap (`gap-4`), used to size the two cards. */
const PHONE_GAP = 16

const LAYOUT = {
  /** Top three-quarters of the page. */
  grid: { cardW: 240, pageFraction: 0.75, wrap: 'flex flex-wrap justify-center gap-5' },
  /**
   * The gallery on a phone (2026-09-24): two across instead of one. At 240px
   * a 390px screen fitted one card per row and fifteen templates ran to
   * ~7,400px. 160px cards, two per row, halve that and still read.
   */
  gridPhone: { cardW: 160, pageFraction: 0.72, wrap: 'grid grid-cols-2 justify-items-center gap-4' },
  /** Shorter still: ten previews in a sticky column must stay scannable. */
  rail: { cardW: 212, pageFraction: 0.66, wrap: 'flex flex-col items-center gap-3' },
} as const

/**
 * The job fields that have at least one template, each with its count
 * (2026-10-04). The registry is static, so this is worked out once.
 */
const FIELD_OPTIONS = TEMPLATE_FIELDS.map((f) => ({
  ...f,
  count: availableTemplates().filter((t) => t.fields.includes(f.key)).length,
})).filter((f) => f.count > 0)

/**
 * A preview drawn only once its card is near the screen (2026-10-04).
 *
 * Every card renders the real template — a few hundred elements each — and
 * there are fifty templates now. Drawing all fifty at once on a mid-range phone
 * is the heaviest thing this screen could do, for cards nobody has scrolled to
 * yet. The box keeps its size meanwhile, so nothing jumps.
 */
function LazyPreview({ height, children }: { height: number; children: React.ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || shown) return
    if (typeof IntersectionObserver === 'undefined') {
      setShown(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true)
          io.disconnect()
        }
      },
      { rootMargin: '600px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [shown])
  return (
    <span ref={ref} aria-hidden="true" className="relative block overflow-hidden bg-canvas" style={{ height }}>
      {shown ? children : null}
    </span>
  )
}

export function TemplatePicker({
  document,
  current,
  onSelect,
  busyId,
  layout = 'grid',
}: {
  document: ResumeDocument
  current: TemplateId
  onSelect: (id: TemplateId) => void
  busyId?: TemplateId | null
  layout?: 'grid' | 'rail'
}) {
  const [hovered, setHovered] = useState<TemplateId | null>(null)
  const all = availableTemplates()
  // FILTER BY FIELD (2026-10-04): fifty templates, each tagged with the job
  // families it is designed for (FIELD_OPTIONS above).
  const [field, setField] = useState<TemplateField | 'all'>('all')
  const templates = field === 'all' ? all : all.filter((t) => t.fields.includes(field))
  // Card width has to be known in JS (the preview is scaled to it), so the
  // phone layout is chosen by a media query rather than by CSS alone.
  const [phone, setPhone] = useState(false)
  useEffect(() => {
    // The rail stacks under the document below 1024px, where a single
    // 212px column of fifteen cards ran to ~5,000px on a phone.
    const mq = window.matchMedia(layout === 'grid' ? '(max-width: 559px)' : '(max-width: 1023px)')
    const on = () => setPhone(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [layout])
  // ON A PHONE THE CARD FITS ITS COLUMN (founder 2026-10-04). The phone card
  // was a fixed 160px; two of them plus the gap need 336px, and inside the
  // workspace's padded panel a column was only ~152px — so the two cards
  // overlapped and read as one. Now each card is half of the width actually
  // available, less the 16px gap, between 120px and 200px.
  const wrapRef = useRef<HTMLDivElement>(null)
  const [phoneCardW, setPhoneCardW] = useState<number | null>(null)
  useEffect(() => {
    const el = wrapRef.current
    if (!phone || !el) return
    const measure = () => {
      const w = el.clientWidth
      if (w > 0) setPhoneCardW(Math.max(120, Math.min(200, Math.floor((w - PHONE_GAP) / 2))))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [phone])
  const base = LAYOUT[phone ? 'gridPhone' : layout]
  const { pageFraction, wrap } = base
  const cardW = phone && phoneCardW ? phoneCardW : base.cardW
  // Scale against the card's CONTENT width, not its outer width. Tailwind sets
  // border-box, so a 240px card with a 1px border has a 238px content box — and
  // scaling to 240 pushed 2px of the page's right edge under `overflow-hidden`,
  // quietly shaving the margin off every thumbnail.
  const innerW = cardW - CARD_BORDER * 2
  const SCALE = innerW / PAGE_W
  // True page height at this width, then the visible fraction of it. Width is
  // never touched, so the page is clipped rather than squashed.
  const previewH = Math.round(innerW * (PAGE_H / PAGE_W) * pageFraction)

  const chip = (active: boolean) =>
    cn(
      'inline-flex min-h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal',
      active ? 'border-teal bg-teal text-white' : 'border-line-strong bg-white text-ink-soft hover:border-teal hover:text-teal',
    )

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {layout === 'rail' && !phone ? (
        // The desktop rail is 212px: seventeen chips would wrap to eight rows,
        // so it gets the same choices as a compact dropdown.
        <label className="flex flex-col gap-1 text-[12px] font-semibold text-ink-soft">
          Show templates for
          <select
            className="field py-2"
            value={field}
            onChange={(e) => setField(e.target.value as TemplateField | 'all')}
          >
            <option value="all">All fields ({all.length})</option>
            {FIELD_OPTIONS.map((f) => (
              <option key={f.key} value={f.key}>
                {f.label} ({f.count})
              </option>
            ))}
          </select>
        </label>
      ) : (
        <div
          role="group"
          aria-label="Filter templates by field"
          className={cn(
            'flex gap-2',
            // A swipeable row on a phone; wrapping chips where there is room.
            phone ? '-mx-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden' : 'flex-wrap justify-center',
          )}
        >
          <button type="button" aria-pressed={field === 'all'} onClick={() => setField('all')} className={chip(field === 'all')}>
            All <span className={field === 'all' ? 'text-white/80' : 'text-ink-muted'}>{all.length}</span>
          </button>
          {FIELD_OPTIONS.map((f) => (
            <button key={f.key} type="button" aria-pressed={field === f.key} onClick={() => setField(f.key)} className={chip(field === f.key)}>
              {f.label} <span className={field === f.key ? 'text-white/80' : 'text-ink-muted'}>{f.count}</span>
            </button>
          ))}
        </div>
      )}
      <div ref={wrapRef} role="group" aria-label="Resume templates" className={wrap}>
        {templates.map((t) => {
          const Template = getTemplate(t.id).component
          const isCurrent = t.id === current
          const isBusy = busyId === t.id
          return (
            <button
              key={t.id}
              type="button"
              aria-pressed={isCurrent}
              aria-label={`${t.name} — ${t.description}`}
              disabled={isBusy}
              // Width pinned to the preview, so the scaled page fills its card
              // exactly and cannot sit off to one side (TASK-148).
              style={{ width: cardW }}
              onClick={() => onSelect(t.id)}
              onMouseEnter={() => setHovered(t.id)}
              onMouseLeave={() => setHovered(null)}
              className={
                'group flex flex-col overflow-hidden rounded-card border bg-white text-left shadow-sm transition duration-150 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 ' +
                (isCurrent
                  ? 'border-teal ring-2 ring-teal/30'
                  : 'border-line hover:border-teal/60')
              }
            >
              {/* The preview: a real render, clipped to a page-shaped window. */}
              <LazyPreview height={previewH}>
                <span
                  className="absolute left-0 top-0 block origin-top-left"
                  style={{ width: PAGE_W, transform: `scale(${SCALE})` }}
                >
                  <Template
                    {...({
                      document,
                      profile: undefined,
                      optimizedContent: undefined,
                      skillsOrder: [],
                      fieldVisibility: null,
                    } as unknown as GulfPremiumProps)}
                  />
                </span>
                {hovered === t.id && !isCurrent ? (
                  <span className="absolute inset-0 bg-teal/10" />
                ) : null}
              </LazyPreview>

              <span className="flex flex-col gap-1 border-t border-line bg-white p-3">
                {/* Wraps: at a phone's ~167px card the name and its badge squeezed
                    each other onto two lines apiece ("Gulf / Premium", "IN / USE").
                    The badge now drops under the name instead. */}
                <span className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                  <span className="text-[13px] font-bold text-ink">{t.name}</span>
                  {isCurrent ? (
                    <span className="whitespace-nowrap rounded-[4px] bg-teal-soft px-1.5 py-0.5 text-[12px] font-bold uppercase tracking-wider text-teal">
                      In use
                    </span>
                  ) : t.atsLevel === 'maximum' ? (
                    <span className="whitespace-nowrap rounded-[4px] bg-canvas px-1.5 py-0.5 text-[12px] font-semibold uppercase tracking-wider text-ink-soft">
                      Max ATS
                    </span>
                  ) : null}
                </span>
                {phone ? null : (
                  <>
                    <span className="text-[12px] leading-snug text-ink-soft">{t.description}</span>
                    <span className="text-[12px] text-ink-muted">Best for {t.recommendedFor.join(' · ')}</span>
                  </>
                )}
                <span className="mt-1 text-[12px] font-semibold text-teal">
                  {isBusy ? 'Applying…' : isCurrent ? 'Current template' : 'Use this template'}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
