'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * LockedTile — purely presentational component for Planned services
 * (docs/redesign/PLANNED_SERVICES.md).
 *
 * Renders a dashed-border card with a neutral "Planned" badge, a service
 * title and one description line via props. Tap/click shows a short honest
 * note (default: "Planned for a future release."). The type signature
 * explicitly excludes any numeric or preview-content prop so it is
 * structurally impossible to pass a fake score or result.
 *
 * `tone` picks the light/dark token set explicitly, same as Card/Input —
 * not Tailwind's `dark:` media-query variant. This app's light/dark
 * surfaces are a per-page design choice (e.g. Dashboard is dark-shelled),
 * not driven by the browser's OS color-scheme preference.
 */
const DEFAULT_NOTE = 'Planned for a future release.'

export interface LockedTileProps {
  title: string
  description: string
  /** Optional custom locked message shown on tap. Defaults to
   * "Planned for a future release." */
  note?: string
  tone?: 'light' | 'dark'
  className?: string
}

export function LockedTile({ title, description, note, tone = 'light', className }: LockedTileProps) {
  const [showNote, setShowNote] = useState(false)
  const isDark = tone === 'dark'

  return (
    <div
      className={cn(
        'flex cursor-default flex-col gap-2 rounded-bp-lg border-2 border-dashed p-4 font-redesign-sans',
        isDark ? 'border-edge-strong bg-surface-2-dark' : 'border-edge-strong bg-paper',
        className
      )}
      onClick={() => setShowNote((prev) => !prev)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          setShowNote((prev) => !prev)
        }
      }}
      aria-expanded={showNote}
    >
      {/* Header row: badge */}
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'inline-flex items-center rounded-full border px-[9px] py-[3px] text-[12px] font-semibold leading-none tracking-wider uppercase font-redesign-sans',
            isDark ? 'border-edge text-slate' : 'border-edge text-slate'
          )}
        >
          Planned
        </span>
      </div>

      {/* Title */}
      <span className={cn('text-sm font-semibold', isDark ? 'text-white' : 'text-graphite')}>
        {title}
      </span>

      {/* Description */}
      <span className={cn('text-[12px] leading-snug', isDark ? 'text-paper' : 'text-graphite-soft')}>
        {description}
      </span>

      {/* Expanded note on tap */}
      {showNote && (
        <div
          className={cn(
            'mt-1 rounded-lg border px-3 py-2 text-[12px]',
            isDark
              ? 'border-edge bg-paper text-slate'
              : 'border-edge bg-edge/30 text-graphite-soft'
          )}
        >
          {note ?? DEFAULT_NOTE}
        </div>
      )}
    </div>
  )
}