'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { getTemplate, type TemplateId } from '@/lib/templates'
import { SAMPLE_RESUME_DOCUMENT } from '@/lib/sampleResume'
import type { GulfPremiumProps } from '@/components/templates/GulfPremium'

/**
 * Real templates, rendered live on the landing page.
 *
 * THESE ARE NOT SCREENSHOTS AND NOT MOCKUPS. Each card runs the same template
 * component that produces the user's actual PDF, against
 * `lib/sampleResume.ts` — the same fictional showcase CV the signed-in gallery
 * uses. So a visitor is looking at genuine product output, and it cannot drift
 * from what they will get: change a template and this changes with it.
 *
 * WHY THAT MATTERS HERE MORE THAN ANYWHERE. `01_PRODUCT.md` §3 describes an
 * audience being actively worked by placement scams. A landing page that shows
 * polished mockups of a product that does not look like that is the first move
 * in exactly that con. Rendering the real thing is both the honest choice and
 * the more persuasive one.
 *
 * THE CV IS FICTIONAL AND SAYS SO. No real person's name, history or contact
 * details appear, and the caption states it. There are no customer photos and
 * no testimonials on this page for the same reason — inventing social proof is
 * the one thing this product must never do.
 *
 * SCALING is the transform technique from `TemplatePicker`: the page renders at
 * its true 794px width inside a fixed box and is scaled from the top-left, so
 * it is clipped rather than squashed. Reflowing it would mean the preview no
 * longer matched the PDF, which is the whole point of rendering it live.
 */

const PAGE_W = 794
const PAGE_H = 1123

/** Four that show the real spread: ATS-plain through to photo-led. */
const SHOWN: ReadonlyArray<{ id: TemplateId; note: string }> = [
  { id: 'gulf_premium', note: 'The default. Gulf-standard layout with a photo.' },
  { id: 'ats_classic', note: 'Stripped for applicant tracking systems.' },
  { id: 'technical_sidebar', note: 'Skills and certifications in a side rail.' },
  { id: 'executive_gcc', note: 'For senior and management roles.' },
]

export function TemplateShowcase({
  /**
   * `full` is the gallery: the four choices beside a live page.
   * `page` is just the page, larger — for the hero, where a 300px chooser
   * column squeezed the preview down to a thumbnail nobody could read. A hero
   * visual has one job, and it is not to offer a choice.
   */
  variant = 'full',
}: {
  variant?: 'full' | 'page'
} = {}) {
  const [active, setActive] = useState<TemplateId>('gulf_premium')
  const Template = getTemplate(active).component
  const meta = getTemplate(active)

  /**
   * The scale has to come from the real rendered width.
   *
   * A CSS transform cannot read its parent, and this box is fluid — so the box
   * is measured and the scale set from that. A hard-coded scale would either
   * crop the page on a phone or leave white space on a laptop, and the whole
   * value of a live preview is that it matches the PDF exactly.
   */
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
    <div
      className={cn(
        'flex flex-col gap-6',
        variant === 'full' && 'lg:flex-row lg:items-start lg:gap-10',
      )}
    >
      {/* ── the chooser ── */}
      <div
        className={cn(
          'flex gap-3 overflow-x-auto pb-2 lg:w-[300px] lg:shrink-0 lg:flex-col lg:overflow-visible lg:pb-0',
          variant === 'page' && 'hidden',
        )}
      >
        {SHOWN.map((t) => {
          const info = getTemplate(t.id)
          const on = t.id === active
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActive(t.id)}
              aria-pressed={on}
              className={cn(
                'flex min-w-[220px] flex-col gap-1 rounded-card border px-4 py-3.5 text-left transition-colors lg:min-w-0',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2',
                on
                  ? 'border-teal bg-teal text-white shadow-m-2'
                  : 'border-line bg-white text-ink hover:border-teal/50 hover:bg-teal-soft/40',
              )}
            >
              <span className="font-display text-[15px] font-semibold">{info.name}</span>
              <span className={cn('text-[12.5px] leading-snug', on ? 'text-teal-soft' : 'text-ink-muted')}>
                {t.note}
              </span>
            </button>
          )
        })}
        <p className="hidden text-[12px] leading-relaxed text-ink-muted lg:block">
          Eleven more inside — switch template, font, colour and photo without retyping a word.
        </p>
      </div>

      {/* ── the live page ── */}
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div
          ref={boxRef}
          aria-hidden="true"
          className={cn(
            'relative mx-auto w-full overflow-hidden rounded-card border border-line bg-white shadow-m-3',
            variant === 'full' ? 'max-w-[430px]' : 'max-w-[520px]',
          )}
          // The page is clipped to a window rather than shown whole: a full A4
          // at this width would be 700px+ tall and push everything below it off
          // the first screen.
          style={{ height: scale ? Math.round(PAGE_H * scale * (variant === 'page' ? 0.72 : 0.62)) : 420 }}
        >
          {scale > 0 ? (
            <div
              className="absolute left-0 top-0 origin-top-left"
              style={{ width: PAGE_W, transform: `scale(${scale})` }}
            >
              {/* Same prop shape TemplatePicker uses — a template renders from
                  the derived document alone, never from a live profile. */}
              <Template
                {...({
                  document: SAMPLE_RESUME_DOCUMENT,
                  profile: undefined,
                  optimizedContent: undefined,
                  skillsOrder: [],
                  fieldVisibility: null,
                } as unknown as GulfPremiumProps)}
              />
            </div>
          ) : null}
          {/* The page is taller than the window; fade the cut rather than
              ending on a hard line that reads as a broken image. */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white to-transparent" />
        </div>
        <p className="text-center text-[12px] leading-relaxed text-ink-muted">
          <span className="font-semibold text-ink-soft">{meta.name}</span>
          {variant === 'page' ? ', one of 15' : ''} — rendered live by the same component that
          builds your PDF. The CV shown is fictional.
        </p>
      </div>
    </div>
  )
}
