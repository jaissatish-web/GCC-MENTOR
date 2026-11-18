'use client'

export function RowActions({ name, index, count, onMove, onRemove, onUndo }: {
  name: string
  index: number
  count: number
  onMove: (direction: -1 | 1) => void
  onRemove: () => void
  onUndo?: () => void
}) {
  return <div className="flex flex-wrap items-center gap-2" role="group" aria-label={`Actions for ${name}`}>
    <button type="button" className="min-h-11 rounded-lg border border-line px-3 text-sm" disabled={index === 0} onClick={() => onMove(-1)} aria-label={`Move ${name} up`}>Move up</button>
    <button type="button" className="min-h-11 rounded-lg border border-line px-3 text-sm" disabled={index >= count - 1} onClick={() => onMove(1)} aria-label={`Move ${name} down`}>Move down</button>
    {onUndo ? <button type="button" className="min-h-11 rounded-lg border border-line px-3 text-sm" onClick={onUndo} aria-label={`Undo changes to ${name}`}>Undo</button> : null}
    <button type="button" className="min-h-11 rounded-lg border border-line px-3 text-sm text-alert" onClick={onRemove} aria-label={`Remove ${name}`}>Remove</button>
  </div>
}
