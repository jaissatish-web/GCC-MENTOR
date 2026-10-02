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
 * The moving art — v2 (founder, 2026-10-02: "premium, clean, digitally
 * improved… something stunning is coming", identical everywhere).
 *
 * Three COMETS instead of flat arcs: each is a ring whose colour fades along
 * its length into a glowing head (a conic gradient masked to a ring), so the
 * motion reads as light travelling, not a spinner. Around them a faint
 * digital dial, a few particles on their own slow orbits, rings that leave
 * the core, a soft halo, and a glossy core with a light sweep across it.
 *
 * Every moving layer is its own square rotating about its centre, and only
 * transform and opacity animate, so the compositor does all the work. Small
 * sizes (inline waits) keep the comets and the core and drop the detail that
 * would only be noise at 60px. One component, so every AI wait in the
 * product shows the same art.
 */
const ART = {
  light: {
    track: 'rgba(15,76,67,0.13)',
    comet1: '201,150,46', // gold
    comet2: '18,105,92', // teal bright
    comet3: '201,150,46',
    particle: '#C9962E',
    dial: 'rgba(15,76,67,0.22)',
    halo: 'radial-gradient(circle, rgba(18,105,92,0.16) 0%, rgba(201,150,46,0.10) 38%, rgba(255,255,255,0) 70%)',
    ripple: 'rgba(18,105,92,0.35)',
  },
  dark: {
    track: 'rgba(255,255,255,0.08)',
    comet1: '233,199,122', // light gold
    comet2: '127,209,190', // mint
    comet3: '233,199,122',
    particle: '#E9C77A',
    dial: 'rgba(255,255,255,0.18)',
    halo: 'radial-gradient(circle, rgba(127,209,190,0.22) 0%, rgba(233,199,122,0.14) 38%, rgba(0,0,0,0) 70%)',
    ripple: 'rgba(233,199,122,0.45)',
  },
} as const

/** A ring of `width` px whose colour fades along `sweep` degrees into a glowing head at 12 o'clock. */
function Comet({ inset, width, rgb, sweep, reverse, track, head, className }: {
  inset: string
  width: number
  rgb: string
  sweep: number
  /** Turning anticlockwise: the tail then trails on the other side of the head. */
  reverse?: boolean
  track: string
  head: number
  className: string
}) {
  const ring = `radial-gradient(farthest-side, transparent calc(100% - ${width}px), #000 calc(100% - ${width - 0.5}px))`
  const gradient = reverse
    ? `conic-gradient(from 0deg, rgba(${rgb},1) 0deg, rgba(${rgb},0) ${sweep}deg, transparent ${sweep}deg)`
    : `conic-gradient(from ${-sweep}deg, transparent 0deg, rgba(${rgb},0) 0deg, rgba(${rgb},1) ${sweep}deg, transparent ${sweep}deg)`
  return (
    <div className={cn('absolute motion-reduce:animate-none', className)} style={{ inset }}>
      <div className="absolute inset-0 rounded-full" style={{ boxShadow: `inset 0 0 0 ${Math.max(1, width / 2)}px ${track}` }} />
      <div className="absolute inset-0 rounded-full" style={{ background: gradient, WebkitMask: ring, mask: ring }} />
      <span
        className="absolute left-1/2 rounded-full"
        style={{
          width: head,
          height: head,
          top: width / 2 - head / 2,
          marginLeft: -head / 2,
          background: `rgb(${rgb})`,
          boxShadow: `0 0 ${head * 1.6}px ${head * 0.5}px rgba(${rgb},0.65)`,
        }}
      />
    </div>
  )
}

export function ProcessingOrbit({
  tone = 'light',
  size = 176,
  glyph = 'G',
  className,
}: {
  tone?: Tone
  /** Diameter in px. The page screens use ~176; inline waits use ~60. */
  size?: number
  /** What sits in the core. The brand mark by default. */
  glyph?: React.ReactNode
  className?: string
}) {
  const c = ART[tone]
  const small = size < 96
  // Line weights scale with size, clamped so a 56px orbit still reads.
  const w = (f: number, min: number) => Math.max(min, Math.round(size * f * 10) / 10)

  return (
    <div aria-hidden="true" className={cn('relative shrink-0', className)} style={{ width: size, height: size }}>
      {/* Halo — the soft light the whole thing sits in. */}
      <div className="absolute -inset-[18%] rounded-full animate-halo motion-reduce:animate-none" style={{ background: c.halo }} />

      {!small ? (
        <>
          {/* Rings leaving the core, half a cycle apart. */}
          {[0, 1.5].map((delay) => (
            <span
              key={delay}
              className="absolute inset-[4%] rounded-full animate-ring-out motion-reduce:hidden"
              style={{ border: `1px solid ${c.ripple}`, animationDelay: `${delay}s` }}
            />
          ))}
          {/* The digital dial: fine ticks, turning very slowly. */}
          <div className="absolute inset-0 animate-dial motion-reduce:animate-none">
            <svg viewBox="0 0 100 100" className="size-full">
              <circle cx="50" cy="50" r="49" fill="none" stroke={c.dial} strokeWidth="1.6" strokeDasharray="0.35 2.2" />
              <circle cx="50" cy="50" r="49" fill="none" stroke={c.dial} strokeWidth="3" strokeDasharray="0.6 25.06" />
            </svg>
          </div>
          {/* Particles, each on its own slow orbit. */}
          {[
            { inset: '6%', anim: 'animate-particle-1', d: 3, at: 'top' },
            { inset: '19%', anim: 'animate-particle-2', d: 2.2, at: 'bottom' },
            { inset: '11%', anim: 'animate-particle-3', d: 1.8, at: 'left' },
          ].map((p) => (
            <div key={p.inset} className={cn('absolute motion-reduce:hidden', p.anim)} style={{ inset: p.inset }}>
              <span
                className="absolute rounded-full"
                style={{
                  width: p.d,
                  height: p.d,
                  background: c.particle,
                  boxShadow: `0 0 6px 1px ${c.particle}`,
                  ...(p.at === 'top' ? { top: 0, left: '50%' } : p.at === 'bottom' ? { bottom: 0, left: '50%' } : { left: 0, top: '50%' }),
                }}
              />
            </div>
          ))}
        </>
      ) : null}

      {/* Three comets: slow and wide outside, quick and short inside, the middle one turning back. */}
      <Comet inset={small ? '0%' : '9%'} width={w(0.02, 2.5)} rgb={c.comet1} sweep={150} track={c.track} head={w(0.04, 4)} className="animate-comet-1" />
      <Comet inset={small ? '15%' : '20%'} width={w(0.024, 3)} rgb={c.comet2} sweep={200} reverse track={c.track} head={w(0.036, 3.5)} className="animate-comet-2" />
      <Comet inset={small ? '28%' : '30%'} width={w(0.026, 3)} rgb={c.comet3} sweep={95} track="transparent" head={w(0.03, 3)} className="animate-comet-3" />

      {/* The core: glossy, breathing, with light sweeping round inside it. */}
      <div
        className="absolute inset-[35%] overflow-hidden rounded-full animate-breathe motion-reduce:animate-none"
        style={{
          background: 'radial-gradient(circle at 32% 26%, #1F8A77 0%, #0F4C43 58%, #0A332D 100%)',
          boxShadow: tone === 'dark' ? '0 0 22px 2px rgba(233,199,122,0.35), inset 0 1px 1px rgba(255,255,255,0.35)' : '0 6px 18px -4px rgba(15,76,67,0.45), inset 0 1px 1px rgba(255,255,255,0.35)',
        }}
      >
        <div
          className="absolute -inset-1/2 animate-sheen motion-reduce:hidden"
          style={{ background: 'conic-gradient(from 0deg, transparent 0deg, rgba(255,255,255,0.28) 40deg, transparent 80deg)' }}
        />
        <span
          className="relative flex size-full items-center justify-center font-display font-bold text-white"
          style={{ fontSize: Math.max(10, Math.round(size * 0.11)) }}
        >
          {glyph}
        </span>
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
    <div
      className={cn('flex items-center gap-4 rounded-card border border-teal/15 px-4 py-4 shadow-m-1', className)}
      style={{ background: 'linear-gradient(135deg, #FFFFFF 0%, #F3F7F5 55%, #FBF6EA 100%)' }}
    >
      <ProcessingOrbit size={72} glyph="" />
      <div className="flex min-w-0 flex-col gap-1">
        {steps.length > 1 ? (
          <span aria-hidden="true" className="flex gap-1">
            {steps.map((s, n) => (
              <span key={s} className={cn('h-1 rounded-full transition-all duration-500', n < i ? 'w-3 bg-teal' : n === i ? 'w-6 bg-gold' : 'w-3 bg-line-strong')} />
            ))}
          </span>
        ) : null}
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
