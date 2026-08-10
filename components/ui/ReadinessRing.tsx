import { useEffect, useState } from 'react'

/**
 * ReadinessRing — `components/ui/ReadinessRing.tsx` (TASK-026).
 *
 * A satisfaction ring for the Readiness Score, per docs/DESIGN.md §4 and the
 * rings in `design-reference/MVP Screens.dc.html`. SVG geometry is copied
 * from the mockup verbatim — not redesigned or recomputed:
 *   - viewBox "0 0 100 100", circle r=42, stroke-width 8
 *   - stroke-dasharray 264 (circumference ≈ 2·π·42)
 *   - rotated −90° so the ring starts at 12 o'clock; round linecap
 *
 * Colour carries meaning (docs/DESIGN.md §4): GOLD below 100, EMERALD at
 * exactly 100. Tailwind tokens only — never a hard-coded hex. The progress
 * arc animates on change via a transition on stroke-dashoffset.
 *
 * `dark`: opt-in variant for the 2026-08-07 dark dashboard redesign — swaps
 * the track/text colours for the dark surface tokens and adds the gold glow
 * filter. Defaults to false so the existing light usage (app/profile) is
 * completely unaffected.
 *
 * Props:
 *   score : number — 0..100
 *   size  : number — rendered pixel width/height
 *   label : string — optional caption rendered under the ring
 *   dark  : boolean — dark-surface variant, default false
 */

interface ReadinessRingProps {
  score: number
  size?: number
  label?: string
  dark?: boolean
}

const CIRCUMFERENCE = 264 // 2·π·42, per mockup dasharray

export default function ReadinessRing({
  score,
  size = 88,
  label,
  dark = false,
}: ReadinessRingProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)))
  const [offset, setOffset] = useState(CIRCUMFERENCE)

  useEffect(() => {
    // Animate from full (empty) to the target offset on mount and on change.
    const target = CIRCUMFERENCE * (1 - clamped / 100)
    setOffset(target)
  }, [clamped])

  const isComplete = clamped === 100
  const progressClass = isComplete ? 'stroke-emerald' : 'stroke-gold'
  const trackClass = dark ? 'stroke-surface-2' : 'stroke-sand'
  const textClass = dark
    ? isComplete
      ? 'fill-state-emerald-line'
      : 'fill-gold-light'
    : isComplete
      ? 'text-emerald'
      : 'text-midnight'

  return (
    <div className="flex flex-col items-center gap-2" role="img" aria-label={`Readiness ${clamped} percent`}>
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className={`-rotate-90 ${dark && !isComplete ? 'drop-shadow-[0_0_10px_rgba(199,154,60,0.45)]' : ''}`}
        aria-hidden="true"
      >
        {/* Track */}
        <circle cx="50" cy="50" r="42" fill="none" strokeWidth="8" className={trackClass} />
        {/* Progress — gold below 100, emerald at 100 */}
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          className={`${progressClass} transition-[stroke-dashoffset] duration-500 ease-out motion-reduce:transition-none`}
        />
        {/* Score reads upright (we rotated the svg −90°) */}
        <text
          x="50"
          y="50"
          dy="0.35em"
          textAnchor="middle"
          className={`font-mono text-[22px] ${dark ? textClass : `fill-ink ${textClass}`}`}
          style={{ transform: 'rotate(90deg)', transformOrigin: '50px 50px' }}
        >
          {clamped}
        </text>
      </svg>
      {label ? (
        <span className={`text-[12px] ${dark ? 'text-marble/50' : 'text-ink-muted'}`}>{label}</span>
      ) : null}
    </div>
  )
}
