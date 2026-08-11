import { useEffect, useState } from 'react'

/**
 * ReadinessRing — the approved SVG geometry remains unchanged from TASK-026.
 * Props, score clamping, animation, and accessibility semantics are
 * unchanged; visual classes now use the redesign token foundation.
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
    const target = CIRCUMFERENCE * (1 - clamped / 100)
    setOffset(target)
  }, [clamped])

  const isComplete = clamped === 100
  const progressClass = isComplete ? 'stroke-forest' : dark ? 'stroke-redesign-gold-dark' : 'stroke-redesign-gold'
  const trackClass = dark ? 'stroke-forest-tint-dark' : 'stroke-surface-2-light'
  const textClass = dark
    ? isComplete
      ? 'fill-forest-dark'
      : 'fill-redesign-gold-dark'
    : isComplete
      ? 'fill-forest'
      : 'fill-gold-text'

  return (
    <div className="flex flex-col items-center gap-2 font-redesign-sans" role="img" aria-label={`Readiness ${clamped} percent`}>
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className={`-rotate-90 ${dark && !isComplete ? 'drop-shadow-[0_0_10px_rgba(201,138,46,0.45)]' : ''}`}
        aria-hidden="true"
      >
        <circle cx="50" cy="50" r="42" fill="none" strokeWidth="8" className={trackClass} />
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
        <text
          x="50"
          y="50"
          dy="0.35em"
          textAnchor="middle"
          className={`font-mono text-[22px] ${textClass}`}
          style={{ transform: 'rotate(90deg)', transformOrigin: '50px 50px' }}
        >
          {clamped}
        </text>
      </svg>
      {label ? (
        <span className={`text-[12px] ${dark ? 'text-ink-400-dark' : 'text-ink-400'}`}>{label}</span>
      ) : null}
    </div>
  )
}
