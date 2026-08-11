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
 */
const DEFAULT_NOTE = 'Planned for a future release.'

export interface LockedTileProps {
  title: string
  description: string
  /** Optional custom locked message shown on tap. Defaults to
   * "Planned for a future release." */
  note?: string
  className?: string
}

export function LockedTile({ title, description, note, className }: LockedTileProps) {
  const [showNote, setShowNote] = useState(false)

  return (
    <div
      className={cn(
        'flex cursor-default flex-col gap-2 rounded-radius-lg border-2 border-dashed border-line-dark-strong bg-surface-2-light p-4 font-redesign-sans dark:bg-marble/[0.03]',
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
      {/* Header row: badge + title */}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center rounded-full border border-line-dark px-[9px] py-[3px] text-[10px] font-semibold leading-none text-ink-400 tracking-wider uppercase font-redesign-sans">
          Planned
        </span>
      </div>

      {/* Title */}
      <span className="text-sm font-semibold text-ink-900">{title}</span>

      {/* Description */}
      <span className="text-[12px] leading-snug text-ink-700">{description}</span>

      {/* Expanded note on tap */}
      {showNote && (
        <div className="mt-1 rounded-lg border border-ink-200 bg-ink-200/30 px-3 py-2 text-[11.5px] text-ink-700">
          {note ?? DEFAULT_NOTE}
        </div>
      )}
    </div>
  )
}