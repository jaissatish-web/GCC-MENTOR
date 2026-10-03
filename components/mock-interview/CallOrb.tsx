'use client'

import { useEffect, useState } from 'react'

/**
 * The "AI call" waiting screen for recorded interviews (founder, 2026-10-03):
 * a softly pulsing circle and calm, human lines — "your interviewer is
 * joining", "our panel is reviewing your answers, we'll get back to you very
 * soon" — instead of a progress list, so waiting feels like a real interview
 * call rather than a loading page. Motion stops for reduced-motion users.
 */
export function CallOrb({
  title,
  lines,
  detail,
  label,
}: {
  title: string
  /** Shown one at a time, changing every few seconds. */
  lines: string[]
  /** A fixed line under the rotating one, e.g. "3 of 5 answers reviewed". */
  detail?: string | null
  /** Word inside the circle. */
  label?: string
}) {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (lines.length < 2) return
    const t = window.setInterval(() => setI((n) => (n + 1) % lines.length), 3800)
    return () => window.clearInterval(t)
  }, [lines.length])

  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center gap-6 px-4 py-8 text-center">
      <div className="relative flex size-44 items-center justify-center sm:size-52" aria-hidden="true">
        <span className="absolute inset-0 rounded-full bg-teal/10 motion-safe:animate-[orb-ring_2.8s_ease-out_infinite]" />
        <span className="absolute inset-0 rounded-full bg-teal/10 motion-safe:animate-[orb-ring_2.8s_ease-out_1.4s_infinite]" />
        <span className="absolute inset-5 rounded-full bg-gradient-to-br from-teal/25 to-gold/25 motion-safe:animate-[orb-spin_9s_linear_infinite]" />
        <span className="relative flex size-28 items-center justify-center rounded-full bg-gradient-to-br from-teal to-[#0b3a33] shadow-[0_18px_50px_rgba(15,76,67,0.35)] motion-safe:animate-[orb-breathe_3.2s_ease-in-out_infinite] sm:size-32">
          <span className="flex items-end gap-1">
            {[0, 1, 2, 3, 4].map((b) => (
              <span
                key={b}
                className="w-1.5 rounded-full bg-white/85 motion-safe:animate-[orb-bar_1.2s_ease-in-out_infinite]"
                style={{ height: 10 + (b % 3) * 8, animationDelay: `${b * 0.15}s` }}
              />
            ))}
          </span>
        </span>
        {label ? (
          <span className="absolute -bottom-3 rounded-full bg-white px-3 py-1 text-[11.5px] font-bold uppercase tracking-[0.12em] text-teal shadow">
            {label}
          </span>
        ) : null}
      </div>
      <div className="flex max-w-md flex-col gap-2">
        <h3 className="font-display text-[22px] font-semibold leading-snug text-ink sm:text-[26px]">{title}</h3>
        <p key={i} className="min-h-[3rem] text-[15px] leading-relaxed text-ink-soft motion-safe:animate-[orb-fade_0.6s_ease-out]">
          {lines[i]}
        </p>
        {detail ? <p className="text-[13.5px] font-semibold text-teal">{detail}</p> : null}
      </div>
      <style jsx global>{`
        @keyframes orb-ring { 0% { transform: scale(0.72); opacity: 0.9 } 100% { transform: scale(1.25); opacity: 0 } }
        @keyframes orb-breathe { 0%, 100% { transform: scale(1) } 50% { transform: scale(1.06) } }
        @keyframes orb-spin { to { transform: rotate(360deg) } }
        @keyframes orb-bar { 0%, 100% { transform: scaleY(0.45) } 50% { transform: scaleY(1.15) } }
        @keyframes orb-fade { from { opacity: 0; transform: translateY(4px) } to { opacity: 1; transform: none } }
      `}</style>
    </div>
  )
}

export const JOINING_LINES = [
  'Your interviewer is joining the call. We will start in a moment.',
  'Find a quiet place and sit comfortably.',
  'Take a slow breath. There are no trick questions here.',
  'Speak naturally, the way you would to a real HR panel.',
  'Tip: say what you did, how you did it, and the result.',
]

export const REVIEWING_LINES = [
  'Thank you for your time today.',
  'Our interview panel is reviewing your answers.',
  'We will get back to you very soon.',
  'Your report usually arrives within a minute or two.',
  'You can stay on this page. Your report will appear here.',
]
