'use client'

import { useRef, useState } from 'react'
import { Input } from '@/components/ui/Input'

/**
 * Dynamic "service key + quota" row editor for the create-package form.
 *
 * Renders client-side state for any number of rows (starts at 1),
 * each with `service_key_N` / `quota_N` field naming so the server
 * action's existing parsing loop handles them unchanged.
 *
 * The final "Remove" button is hidden on the last remaining row to
 * prevent a zero-row form from being submitted.
 */
export function ServicePackageItemsFields() {
  // A unique, never-reused id per row (NOT a plain count) — using a plain
  // 0..rowCount-1 index as both the React `key` and the id to remove let
  // "remove row N" actually remove the LAST row instead whenever N wasn't
  // already the last one: React keeps every key that still exists in the
  // new array mounted with its current typed value, so shrinking the count
  // always drops the highest index, regardless of which row's button was
  // clicked. A stable id per row (kept even as earlier rows are removed)
  // makes `key` and "which row to remove" the same value, so the row that's
  // visually removed is always the one whose button was actually clicked.
  const [rowIds, setRowIds] = useState<number[]>([0])
  const nextIdRef = useRef(1)

  const addRow = () => {
    setRowIds((ids) => [...ids, nextIdRef.current++])
  }
  const removeRow = (id: number) => {
    setRowIds((ids) => (ids.length > 1 ? ids.filter((rowId) => rowId !== id) : ids))
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">
        Quota line items
      </div>
      <div className="flex flex-col gap-2" id="service-items">
        {rowIds.map((id, i) => (
          <div key={id} className="flex items-end gap-2">
            <Input
              name={`service_key_${id}`}
              label={`Service key #${i + 1}`}
              placeholder="e.g. resume_optimization"
              list="known-services"
              required
              className="flex-1"
            />
            <Input
              name={`quota_${id}`}
              type="number"
              min={1}
              label="Quota"
              placeholder="e.g. 3"
              required
              className="w-[100px]"
            />
            {rowIds.length > 1 ? (
              <button
                type="button"
                onClick={() => removeRow(id)}
                className="mb-0.5 flex h-11 w-9 items-center justify-center rounded-radius-md border border-line-light text-sm text-ink-400 hover:border-terra hover:text-terra"
                aria-label={`Remove service #${i + 1}`}
              >
                ×
              </button>
            ) : null}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addRow}
        className="self-start rounded-radius-md border border-dashed border-line-light-strong px-4 py-2 text-[12px] font-semibold text-forest hover:border-forest"
      >
        + Add another service
      </button>
      <datalist id="known-services">
        <option value="resume_optimization" />
        <option value="cover_letter" />
      </datalist>
    </div>
  )
}