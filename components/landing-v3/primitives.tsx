import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Landing CONCEPT primitives (prototype, 2026-09-29).
 *
 * Deliberately a copy, not an import, of components/landing-v2/ui.tsx: the
 * concept must be deletable in one folder and must not change a shared file
 * the live landing page depends on. Tokens are the Meridian ones from
 * tailwind.config.ts — teal is the voice, gold is the one action colour.
 */

export function Wrap({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-10', className)}>{children}</div>
}

export function Eyebrow({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span className={cn('type-caption font-semibold uppercase tracking-[0.08em] text-teal', className)}>
      {children}
    </span>
  )
}

/** Section titles use the same Inter family as the app. Role classes and
 * responsive rem sizes live in app/globals.css. Colours remain local. */
export function H2({ id, className, children }: { id?: string; className?: string; children: ReactNode }) {
  return (
    <h2
      id={id}
      className={cn(
        'mt-2.5 type-marketing-title text-ink lg:mt-3',
        '[&_em]:not-italic [&_em]:text-teal',
        className,
      )}
    >
      {children}
    </h2>
  )
}

export function Lead({ className, children }: { className?: string; children: ReactNode }) {
  return <p className={cn('mt-3 max-w-[60ch] type-body text-ink-soft lg:text-base', className)}>{children}</p>
}

export function SectionHead({
  eyebrow,
  title,
  lead,
  id,
  center,
  className,
}: {
  eyebrow: string
  title: ReactNode
  lead?: ReactNode
  id?: string
  center?: boolean
  className?: string
}) {
  return (
    <div className={cn(center && 'mx-auto sm:text-center sm:[&_p]:mx-auto', 'max-w-[760px]', className)}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <H2 id={id}>{title}</H2>
      {lead ? <Lead>{lead}</Lead> : null}
    </div>
  )
}

const BTN =
  'group/btn inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[14px] px-5 type-label transition-[background-color,border-color,box-shadow,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 active:translate-y-px motion-reduce:transition-none lg:px-6'
/** Gold is the action colour (Meridian rule). Ink on gold is 6.70:1. */
export const BTN_GOLD = cn(
  BTN,
  'bg-gold text-ink shadow-[0_6px_18px_-6px_rgba(201,150,46,0.65)] hover:-translate-y-px hover:bg-[#D4A33C] hover:shadow-[0_10px_24px_-8px_rgba(201,150,46,0.75)]',
)
export const BTN_TEAL = cn(BTN, 'bg-teal text-white hover:bg-[#0B3A33]')
export const BTN_LINE = cn(BTN, 'border border-line-strong bg-white text-ink hover:border-teal hover:text-teal')

export function ArrowRight({ className }: { className?: string }) {
  return (
    <svg
      className={cn('size-[18px] transition-transform duration-200 group-hover/btn:translate-x-0.5 motion-reduce:transition-none', className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

export function Check({ className }: { className?: string }) {
  return (
    <svg className={cn('size-4 shrink-0', className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}

export function Cross({ className }: { className?: string }) {
  return (
    <svg className={cn('size-4 shrink-0', className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

/** Faux text line inside a document preview. */
export function Line({ w, className }: { w: string; className?: string }) {
  return <span className={cn('block h-[5px] rounded-full bg-line-strong/70', className)} style={{ width: w }} aria-hidden="true" />
}

export function Tag({ tone = 'teal', className, children }: { tone?: 'teal' | 'gold' | 'ok' | 'alert' | 'muted' | 'blue'; className?: string; children: ReactNode }) {
  const tones = {
    teal: 'bg-teal-soft text-teal',
    gold: 'bg-gold-soft text-gold-ink',
    ok: 'bg-ok-soft text-ok',
    alert: 'bg-alert-soft text-alert',
    muted: 'bg-fill-subtle text-ink-soft',
    blue: 'bg-blue-soft text-blue',
  } as const
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-[3px] type-caption font-semibold', tones[tone], className)}>{children}</span>
}

export function Meter({ value, tone = 'teal', className }: { value: number; tone?: 'teal' | 'gold' | 'alert'; className?: string }) {
  return (
    <span className={cn('block h-1.5 overflow-hidden rounded-full bg-line', className)} aria-hidden="true">
      <span
        className={cn(
          'block h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none',
          tone === 'teal' ? 'bg-teal' : tone === 'gold' ? 'bg-gold' : 'bg-alert',
        )}
        style={{ width: `${value}%` }}
      />
    </span>
  )
}

/** Renders **keyword** spans as highlights. Used by the persona copy. */
export function Rich({ text, mark = 'teal' }: { text: string; mark?: 'teal' | 'bold' }) {
  const parts = text.split(/\*\*(.+?)\*\*/g)
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          mark === 'bold' ? (
            <b key={i} className="font-semibold text-ink">{p}</b>
          ) : (
            <mark key={i} className="rounded bg-teal-soft px-0.5 text-teal">{p}</mark>
          )
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  )
}

/**
 * Profession chips. Only ever rendered inside client components (it takes an
 * onChange), so this file stays free of 'use client'.
 */
export function PersonaSwitch({
  personas,
  active,
  onChange,
  label,
  className,
  dark,
}: {
  personas: ReadonlyArray<{ key: string; sector: string }>
  active: number
  onChange: (i: number) => void
  label: string
  className?: string
  dark?: boolean
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn('-mx-4 flex snap-x gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden', className)}
    >
      {personas.map((p, i) => (
        <button
          key={p.key}
          type="button"
          aria-pressed={i === active}
          onClick={() => onChange(i)}
          className={cn(
            'min-h-10 shrink-0 snap-start rounded-full border px-3.5 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
            dark
              ? i === active
                ? 'border-white bg-white text-teal focus-visible:ring-gold'
                : 'border-white/25 text-white/85 hover:border-white/60 focus-visible:ring-gold'
              : i === active
                ? 'border-ink bg-ink text-white focus-visible:ring-teal'
                : 'border-line bg-white text-ink-soft hover:border-teal/50 hover:text-ink focus-visible:ring-teal',
          )}
        >
          {p.sector}
        </button>
      ))}
    </div>
  )
}
