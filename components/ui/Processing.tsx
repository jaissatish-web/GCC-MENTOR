'use client'

import { useEffect, useState } from 'react'
import { CheckIcon } from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

/**
 * What the product looks like while it is working.
 *
 * FOUNDER REQUEST 2026-09-10: "while an API call runs the screen looks static
 * — make something visually dynamic, circular, moving, so the user feels
 * something big is processing." He was right about how bad it was. Cover
 * letter generation — a real model call — showed the word "Generating…" on its
 * button and nothing else. The free scorecard pulsed three dots at once, so it
 * never looked like it was getting anywhere. The optimizer's dark screens did
 * name real steps, but nothing moved except a tick every fifteen seconds, and
 * fifteen seconds of stillness on a slow connection reads as a crash.
 *
 * THREE PIECES, so each wait keeps its own words:
 *   · `ProcessingOrbit` — the moving art. Three rings turning at different
 *     speeds and in both directions, a dot riding each, a core that breathes,
 *     and ripples leaving it.
 *   · `ProcessingSteps` — the named steps, and a rotating note beneath them.
 *   · `ProcessingInline` — both, compressed, for a wait inside a card.
 *
 * THE ONE THING IT WILL NOT DO IS INVENT PROGRESS. There is no percentage and
 * no bar that fills. None of these calls reports progress — each is a single
 * request that answers once — so any number would be made up, and a made-up
 * "73%" on the screen where someone is waiting to trust an AI with their career
 * is this product breaking its own promise at the worst possible moment. What
 * is shown instead is all true: that it is running (the motion), what it is
 * doing (steps that name real stages of the pipeline), and a note about what
 * this service does and why. The steps are paced by the page's own timer, and
 * the last one holds until the answer arrives rather than pretending to finish.
 *
 * NO TIMINGS (founder decision 2026-09-11). This used to show a running clock
 * and an estimate beside it — "usually about 20 seconds". The estimates were
 * local measurements, and production runs about 2.8× slower, so they were a
 * promise the product could not keep; an estimate that runs over tells the
 * user something is wrong when nothing is. The clock was true, but on a slow
 * minute all it did was count how long someone had been waiting. In their
 * place each wait passes its own `notes`: short sentences, each true of THAT
 * service (lib/processingNotes.ts cites the source of every one), rotating so
 * there is always something to read.
 *
 * MOTION IS AN ENHANCEMENT. Every animated element carries
 * `motion-reduce:animate-none`, so a user who has asked for reduced motion
 * gets still rings and the same steps and notes. The art is `aria-hidden`;
 * the active step is announced through a polite live region instead. Notes
 * are not announced — a sentence every few seconds read aloud would drown the
 * one announcement that matters, the step changing.
 *
 * Transform and opacity only, so it all runs on the compositor and costs a
 * slow phone nothing while it is also waiting on the network.
 */

type Tone = 'dark' | 'light'

/** How long each note stays up — long enough to read one sentence. */
const NOTE_MS = 5500

/**
 * Cycles through `count` notes, looping. Unlike the steps, notes are not
 * progress, so coming round again claims nothing.
 */
function useRotation(count: number, ms: number = NOTE_MS): number {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (count < 2) return
    const t = window.setInterval(() => setI((n) => (n + 1) % count), ms)
    return () => window.clearInterval(t)
  }, [count, ms])
  return count === 0 ? 0 : i % count
}

/**
 * The moving art.
 *
 * Each ring is its own square layer rotating about its own centre, so no SVG
 * transform-origin arithmetic is needed and the three speeds never interfere.
 */
export function ProcessingOrbit({
  tone = 'light',
  size = 176,
  glyph = 'G',
  className,
}: {
  tone?: Tone
  /** Diameter in px. The page screens use 176; inline waits use ~44. */
  size?: number
  /** What sits in the core. The brand mark by default. */
  glyph?: React.ReactNode
  className?: string
}) {
  const dark = tone === 'dark'
  // Stroke weights scale with size, so a 44px orbit is not all line.
  const outer = dark ? 'stroke-white/15' : 'stroke-line-strong'
  const mid = dark ? 'stroke-teal-soft/30' : 'stroke-teal/20'
  const small = size < 80

  return (
    <div
      aria-hidden="true"
      className={cn('relative shrink-0', className)}
      style={{ width: size, height: size }}
    >
      {/* Ripples leaving the core — the "something is happening" signal that
          reads even in peripheral vision. Two, half a cycle apart. */}
      {!small ? (
        <>
          <span
            className={cn(
              'absolute inset-[30%] rounded-full animate-ripple motion-reduce:hidden',
              dark ? 'bg-gold/25' : 'bg-teal/15',
            )}
          />
          <span
            className={cn(
              'absolute inset-[30%] rounded-full animate-ripple motion-reduce:hidden',
              dark ? 'bg-gold/25' : 'bg-teal/15',
            )}
            style={{ animationDelay: '1.4s' }}
          />
        </>
      ) : null}

      {/* Outer ring — dashed, slow, with a gold dot riding it. */}
      <div className="absolute inset-0 animate-orbit-slow motion-reduce:animate-none">
        <svg viewBox="0 0 100 100" className="size-full">
          <circle cx="50" cy="50" r="47" fill="none" className={outer} strokeWidth={small ? 3 : 1} strokeDasharray="2 4" />
          <circle cx="50" cy="3" r={small ? 5 : 2.6} className="fill-gold" />
        </svg>
      </div>

      {/* Middle ring — the other way round, faster, with a long arc on it. */}
      <div className="absolute inset-[13%] animate-orbit-mid motion-reduce:animate-none">
        <svg viewBox="0 0 100 100" className="size-full">
          <circle cx="50" cy="50" r="46" fill="none" className={mid} strokeWidth={small ? 5 : 2} />
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            className={dark ? 'stroke-teal-soft' : 'stroke-teal'}
            strokeWidth={small ? 6 : 2.6}
            strokeLinecap="round"
            strokeDasharray="72 217"
          />
          <circle cx="96" cy="50" r={small ? 5 : 2.4} className={dark ? 'fill-white' : 'fill-teal'} />
        </svg>
      </div>

      {/* Inner ring — fastest, a short gold arc. The eye locks onto this one. */}
      <div className="absolute inset-[27%] animate-orbit-fast motion-reduce:animate-none">
        <svg viewBox="0 0 100 100" className="size-full">
          <circle
            cx="50"
            cy="50"
            r="44"
            fill="none"
            className="stroke-gold"
            strokeWidth={small ? 9 : 4}
            strokeLinecap="round"
            strokeDasharray="46 230"
          />
        </svg>
      </div>

      {/* The core. */}
      <div
        className={cn(
          'absolute inset-[36%] flex items-center justify-center rounded-full bg-teal font-display font-bold text-white animate-breathe motion-reduce:animate-none',
          dark ? 'shadow-glow-gold' : 'shadow-m-2',
        )}
        style={{ fontSize: Math.max(10, Math.round(size * 0.12)) }}
      >
        {glyph}
      </div>
    </div>
  )
}

/**
 * The named steps, and a rotating note beneath them.
 *
 * Controlled when the page passes `activeIndex` (the optimizer and extraction
 * screens already run their own timers against real call lengths). Otherwise
 * it advances itself every `stepMs` and HOLDS on the last step — it never ticks
 * the final one done, because only the server's answer can do that.
 */
export function ProcessingSteps({
  steps,
  activeIndex,
  stepMs = 4000,
  tone = 'light',
  notes,
  className,
}: {
  steps: readonly string[]
  activeIndex?: number
  stepMs?: number
  tone?: Tone
  /** Sentences true of this service, one at a time (lib/processingNotes.ts). */
  notes?: readonly string[]
  className?: string
}) {
  const [auto, setAuto] = useState(0)
  const controlled = typeof activeIndex === 'number'
  useEffect(() => {
    if (controlled) return
    const t = window.setInterval(() => setAuto((i) => Math.min(i + 1, steps.length - 1)), stepMs)
    return () => window.clearInterval(t)
  }, [controlled, stepMs, steps.length])

  const active = Math.min(controlled ? (activeIndex as number) : auto, steps.length - 1)
  const note = useRotation(notes?.length ?? 0)
  const dark = tone === 'dark'

  return (
    <div className={cn('flex w-full flex-col gap-3', className)}>
      <ol className="flex flex-col gap-2.5">
        {steps.map((label, i) => {
          const state = i < active ? 'done' : i === active ? 'active' : 'todo'
          return (
            <li
              key={label}
              className={cn(
                'flex items-center gap-3 rounded-ctl px-3.5 py-3 text-[14px] transition-colors duration-500',
                state === 'active' && (dark ? 'bg-white/[0.08]' : 'bg-white shadow-m-1'),
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'relative flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                  state === 'done' && 'bg-teal text-white',
                  state === 'active' && (dark ? 'border-2 border-gold' : 'border-2 border-teal'),
                  // Measured on ink: white/40 was 3.81 and failed for these 11px numbers; white/55 is 5.8.
                  state === 'todo' && (dark ? 'border border-white/25 text-white/55' : 'border border-line-strong text-ink-muted'),
                )}
              >
                {state === 'done' ? (
                  <CheckIcon className="size-3.5" strokeWidth={3} />
                ) : state === 'active' ? (
                  <span className={cn('size-2 rounded-full animate-breathe motion-reduce:animate-none', dark ? 'bg-gold' : 'bg-teal')} />
                ) : (
                  i + 1
                )}
              </span>
              <span
                className={cn(
                  state === 'todo'
                    ? dark
                      ? 'text-white/55' // white/45 sat exactly on 4.50 — no margin
                      : 'text-ink-muted'
                    : dark
                      ? 'text-white'
                      : 'text-ink',
                  state === 'active' && 'font-semibold',
                )}
              >
                {label}
              </span>
            </li>
          )
        })}
      </ol>

      {/* One note at a time. The fixed height keeps the page from jumping as a
          one-line note gives way to a two-line one. */}
      {notes && notes.length > 0 ? (
        <p
          className={cn(
            'flex min-h-[3em] items-start justify-center px-2 text-center text-[13px] leading-relaxed',
            dark ? 'text-white/75' : 'text-ink-soft',
          )}
        >
          <span key={note} className="animate-fade-in motion-reduce:animate-none">
            {notes[note]}
          </span>
        </p>
      ) : null}

      {/* Screen readers hear the stage change, not a stream of notes. */}
      <p role="status" aria-live="polite" className="sr-only">
        {steps[active]}
      </p>
    </div>
  )
}

/** A wait inside a card: small orbit, the current step, and a rotating note. */
export function ProcessingInline({
  steps,
  stepMs = 4000,
  notes,
  className,
}: {
  steps: readonly string[]
  stepMs?: number
  /** Sentences true of this service, one at a time (lib/processingNotes.ts). */
  notes?: readonly string[]
  className?: string
}) {
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = window.setInterval(() => setI((n) => Math.min(n + 1, steps.length - 1)), stepMs)
    return () => window.clearInterval(t)
  }, [stepMs, steps.length])
  const note = useRotation(notes?.length ?? 0)

  return (
    <div className={cn('flex items-center gap-4 rounded-card border border-teal/20 bg-teal-soft/40 px-4 py-3.5', className)}>
      <ProcessingOrbit size={48} glyph="" />
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-[14px] font-semibold text-ink" key={steps[i]}>
          <span className="animate-fade-in">{steps[i]}…</span>
        </span>
        {notes && notes.length > 0 ? (
          <span className="block min-h-[2.8em] text-[12.5px] leading-snug text-ink-soft">
            <span key={note} className="animate-fade-in motion-reduce:animate-none">
              {notes[note]}
            </span>
          </span>
        ) : null}
      </div>
      <p role="status" aria-live="polite" className="sr-only">
        {steps[i]}
      </p>
    </div>
  )
}
