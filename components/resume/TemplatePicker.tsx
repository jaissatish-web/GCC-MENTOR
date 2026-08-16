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
const CARD_W = 200
const SCALE = CARD_W / PAGE_W

export function TemplatePicker({
  document,
  current,
  onSelect,
  busyId,
}: {
  document: ResumeDocument
  current: TemplateId
  onSelect: (id: TemplateId) => void
  busyId?: TemplateId | null
}) {
  const [hovered, setHovered] = useState<TemplateId | null>(null)
  const templates = availableTemplates()

  return (
    <div
      role="group"
      aria-label="Resume templates"
      className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
    >
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
            onClick={() => onSelect(t.id)}
            onMouseEnter={() => setHovered(t.id)}
            onMouseLeave={() => setHovered(null)}
            className={
              'group flex flex-col overflow-hidden rounded-radius-lg border text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-2 ' +
              (isCurrent
                ? 'border-forest ring-2 ring-forest/30'
                : 'border-line-light hover:border-forest/60')
            }
          >
            {/* The preview: a real render, clipped to a page-shaped window. */}
            <span
              aria-hidden="true"
              className="relative block overflow-hidden bg-surface-2-light"
              style={{ height: 260 }}
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
