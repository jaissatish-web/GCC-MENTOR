'use client'

import { useState } from 'react'
import { availableTemplates, getTemplate, type TemplateId } from '@/lib/templates'
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

const LAYOUT = {
  /** Top three-quarters of the page. */
  grid: { cardW: 240, pageFraction: 0.75, wrap: 'flex flex-wrap justify-center gap-5' },
  /** Shorter still: ten previews in a sticky column must stay scannable. */
  rail: { cardW: 212, pageFraction: 0.66, wrap: 'flex flex-col items-center gap-3' },
} as const

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
  layout?: keyof typeof LAYOUT
}) {
  const [hovered, setHovered] = useState<TemplateId | null>(null)
  const templates = availableTemplates()
  const { cardW, pageFraction, wrap } = LAYOUT[layout]
  // Scale against the card's CONTENT width, not its outer width. Tailwind sets
  // border-box, so a 240px card with a 1px border has a 238px content box — and
  // scaling to 240 pushed 2px of the page's right edge under `overflow-hidden`,
  // quietly shaving the margin off every thumbnail.
  const innerW = cardW - CARD_BORDER * 2
  const SCALE = innerW / PAGE_W
  // True page height at this width, then the visible fraction of it. Width is
  // never touched, so the page is clipped rather than squashed.
  const previewH = Math.round(innerW * (PAGE_H / PAGE_W) * pageFraction)

  return (
    <div role="group" aria-label="Resume templates" className={wrap}>
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
              'group flex flex-col overflow-hidden rounded-radius-lg border bg-surface-light text-left shadow-sm transition duration-150 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-2 ' +
              (isCurrent
                ? 'border-forest ring-2 ring-forest/30'
                : 'border-line-light hover:border-forest/60')
            }
          >
            {/* The preview: a real render, clipped to a page-shaped window. */}
            <span
              aria-hidden="true"
              className="relative block overflow-hidden bg-surface-2-light"
              style={{ height: previewH }}
            >
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
                <span className="absolute inset-0 bg-forest/10" />
              ) : null}
            </span>

            <span className="flex flex-col gap-1 border-t border-line-light bg-surface-light p-3">
              <span className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-bold text-ink-900">{t.name}</span>
                {isCurrent ? (
                  <span className="rounded-[4px] bg-forest-tint px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-forest">
                    In use
                  </span>
                ) : t.atsLevel === 'maximum' ? (
                  <span className="rounded-[4px] bg-surface-2-light px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-ink-700">
                    Max ATS
                  </span>
                ) : null}
              </span>
              <span className="text-[11.5px] leading-snug text-ink-700">{t.description}</span>
              <span className="text-[10.5px] text-ink-400">Best for {t.recommendedFor.join(' · ')}</span>
              <span className="mt-1 text-[11px] font-semibold text-forest">
                {isBusy ? 'Applying…' : isCurrent ? 'Current template' : 'Use this template'}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
