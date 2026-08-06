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
 * exactly 100. The track is sand. Tailwind tokens only — never a hard-coded
 * hex. The progress arc animates on change via a transition on
 * stroke-dashoffset.
 *
 * Props:
 *   score : number — 0..100
 *   size  : number — rendered pixel width/height
 *   label : string — optional caption rendered under the ring
 */

interface ReadinessRingProps {
  score: number
  size?: number
  label?: string
}

const CIRCUMFERENCE = 264 // 2·π·42, per mockup dasharray

export default function ReadinessRing({
  score,
  size = 88,
  label,
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

  return (
    <div className="flex flex-col items-center gap-2" role="img" aria-label={`Readiness ${clamped} percent`}>
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className="-rotate-90"
        aria-hidden="true"
      >
        {/* Track — sand, copied geometry */}
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          strokeWidth="8"
          className="stroke-sand"
        />
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
          className={`${progressClass} transition-[stroke-dashoffset] duration-500 ease-out`}
        />
        {/* Score reads upright (we rotated the svg −90°) */}
        <text
          x="50"
          y="50"
          dy="0.35em"
          textAnchor="middle"
          className={`fill-ink font-mono text-[22px] ${isComplete ? 'text-emerald' : 'text-midnight'}`}
          style={{ transform: 'rotate(90deg)', transformOrigin: '50px 50px' }}
        >
          {clamped}
        </text>
      </svg>
      {label ? (
        <span className="text-[12px] text-ink-muted">{label}</span>
      ) : null}
    </div>
  )
}
