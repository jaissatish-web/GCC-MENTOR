import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * The six GCC flags, drawn — not emoji.
 *
 * WHY. Windows ships no flag emoji at all. "🇸🇦" renders there as the letters
 * "SA", so on the founder's own machine the footer read "SA Saudi Arabia · AE
 * UAE" — a list of country codes, not flags. That was noted in lib/utils.ts as
 * an acceptable fallback; it is not acceptable on the one screen where it was
 * asked for. Inline SVG draws the same on every device and costs no request.
 *
 * Simplified at 3:2 on purpose. At 16px tall the Saudi shahada and the Omani
 * emblem are illegible whatever you do, so they are suggested (a script line, a
 * sword; a white mark) rather than traced. Every other element — the stripes,
 * the hoist bands, the nine Qatari and five Bahraini serrations — is exact.
 *
 * `aria-hidden` by default: the country name always sits beside it, and
 * "flag of Saudi Arabia, Saudi Arabia" is worse than the name alone.
 */

type Country = 'saudi_arabia' | 'uae' | 'qatar' | 'oman' | 'kuwait' | 'bahrain'

/** Serrated hoist edge: `teeth` points between x=`base` and x=`tip`, over a 20-high flag. */
function serration(teeth: number, base: number, tip: number): string {
  const step = 20 / teeth
  const pts: string[] = ['0,0', `${base},0`]
  for (let i = 0; i < teeth; i += 1) {
    pts.push(`${tip},${(i * step + step / 2).toFixed(3)}`)
    pts.push(`${base},${((i + 1) * step).toFixed(3)}`)
  }
  pts.push('0,20')
  return pts.join(' ')
}

const DRAW: Record<Country, React.ReactNode> = {
  saudi_arabia: (
    <>
      <rect width="30" height="20" fill="#006C35" />
      {/* The shahada, suggested as a line of script. */}
      <path
        d="M8 8.6c1.2-1.6 2.2 1.4 3.4 0s2.2 1.4 3.4 0 2.2 1.4 3.4 0 2.2 1.4 3.4 0"
        fill="none"
        stroke="#fff"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      {/* The sword, hilt to the fly. */}
      <rect x="8" y="12.6" width="13.5" height="0.95" rx="0.45" fill="#fff" />
      <rect x="20.6" y="11.8" width="0.9" height="2.6" rx="0.4" fill="#fff" />
    </>
  ),
  uae: (
    <>
      <rect width="30" height="20" fill="#fff" />
      <rect x="7.5" width="22.5" height="6.667" fill="#00732F" />
      <rect x="7.5" y="13.333" width="22.5" height="6.667" fill="#000" />
      <rect width="7.5" height="20" fill="#FF0000" />
    </>
  ),
  qatar: (
    <>
      <rect width="30" height="20" fill="#8A1538" />
      <polygon points={serration(9, 8, 11)} fill="#fff" />
    </>
  ),
  oman: (
    <>
      <rect width="30" height="20" fill="#DB161B" />
      <rect x="7.5" width="22.5" height="6.667" fill="#fff" />
      <rect x="7.5" y="13.333" width="22.5" height="6.667" fill="#008000" />
      {/* The emblem, suggested. */}
      <circle cx="3.75" cy="3.4" r="1.5" fill="none" stroke="#fff" strokeWidth="0.8" />
    </>
  ),
  kuwait: (
    <>
      <rect width="30" height="20" fill="#fff" />
      <rect width="30" height="6.667" fill="#007A3D" />
      <rect y="13.333" width="30" height="6.667" fill="#CE1126" />
      <polygon points="0,0 7.5,6.667 7.5,13.333 0,20" fill="#000" />
    </>
  ),
  bahrain: (
    <>
      <rect width="30" height="20" fill="#CE1126" />
      <polygon points={serration(5, 7.5, 10.5)} fill="#fff" />
    </>
  ),
}

export function isGulfFlagCountry(value: string): value is Country {
  return value in DRAW
}

export function GulfFlag({ country, className }: { country: Country; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('inline-block h-4 w-6 shrink-0 overflow-hidden rounded-[3px] ring-1 ring-ink/15', className)}
    >
      <svg viewBox="0 0 30 20" className="block size-full" preserveAspectRatio="none">
        {DRAW[country]}
      </svg>
    </span>
  )
}
