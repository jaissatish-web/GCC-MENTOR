'use client'

import { useState } from 'react'
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
  const [rowCount, setRowCount] = useState(1)

  const addRow = () => setRowCount((n) => n + 1)
  const removeRow = (index: number) => {
    if (rowCount > 1) setRowCount((n) => n - 1)
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-warm">
        Quota line items
      </div>
      <div className="flex flex-col gap-2" id="service-items">
        {Array.from({ length: rowCount }, (_, i) => (
          <div key={i} className="flex items-end gap-2">
            <Input
              name={`service_key_${i}`}
              label={`Service key #${i + 1}`}
              placeholder="e.g. resume_optimization"
              list="known-services"
              required
              className="flex-1"
            />
            <Input
              name={`quota_${i}`}
              type="number"
              min={1}
              label="Quota"
              placeholder="e.g. 3"
              required
              className="w-[100px]"
            />
            {rowCount > 1 ? (
              <button
                type="button"
                onClick={() => removeRow(i)}
                className="mb-0.5 flex h-11 w-9 items-center justify-center rounded-lg border border-line text-sm text-ink-muted hover:border-terracotta hover:text-terracotta"
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
        className="self-start rounded-lg border border-dashed border-line-strong px-4 py-2 text-[12px] font-semibold text-emerald hover:border-emerald"
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