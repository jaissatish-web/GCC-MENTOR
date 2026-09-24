import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Landing v2 primitives (design/landing-v2, approved 2026-09-24).
 *
 * Mobile first: every size here is the 390px design, and `lg:` reaches the
 * 1440px design. 768–1023px keeps the mobile structure with wider grids.
 */

export function Wrap({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('mx-auto w-full max-w-[1200px] px-5 lg:px-10', className)}>{children}</div>
}

export function Eyebrow({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        'font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-teal lg:text-[12px]',
        className,
      )}
    >
      {children}
    </span>
  )
}

/** Section title. Wrap the accent words in <em> — they render italic teal. */
export function H2({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <h2
      className={cn(
        'mt-2.5 font-display text-[31px] font-semibold leading-[1.1] tracking-[-0.02em] text-ink lg:mt-3.5 lg:text-[46px] lg:leading-[1.08]',
        '[&_em]:font-medium [&_em]:italic [&_em]:text-teal',
        className,
      )}
    >
      {children}
    </h2>
  )
}

export function Lead({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <p className={cn('mt-3 max-w-[660px] text-[16px] leading-[1.6] text-ink-soft lg:mt-4 lg:text-[18px] lg:leading-[1.65]', className)}>
      {children}
    </p>
  )
}

export function Card({ className, style, children }: { className?: string; style?: CSSProperties; children: ReactNode }) {
  return (
    <div className={cn('rounded-[18px] border border-line bg-white shadow-lp-card', className)} style={style}>
      {children}
    </div>
  )
}

/** A horizontal swipe row on phones. Bleeds to the screen edge inside a Wrap. */
export const SWIPE_ROW =
  '-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-5 px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'

export function ArrowRight({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </svg>
  )
}

export const BTN =
  'inline-flex min-h-[52px] items-center justify-center gap-2.5 rounded-[14px] px-5 text-[16px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 lg:rounded-xl lg:px-6'
export const BTN_TEAL = cn(BTN, 'bg-teal text-white hover:bg-[#0B3A33]')
export const BTN_LINE = cn(BTN, 'border border-line-strong bg-white text-ink hover:border-teal')

/** A score bar — teal for strong, gold for "work on this". */
export function Bar({ value, tone = 'teal', className }: { value: number; tone?: 'teal' | 'gold' | 'muted'; className?: string }) {
  return (
    <div className={cn('h-1.5 rounded-full bg-line', className)}>
      <div
        className={cn('h-full rounded-full', tone === 'teal' ? 'bg-teal' : tone === 'gold' ? 'bg-gold' : 'bg-[#B9AE9E]')}
        style={{ width: `${value}%` }}
      />
    </div>
  )
}
