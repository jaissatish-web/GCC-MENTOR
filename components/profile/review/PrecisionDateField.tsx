'use client'

import { inferDatePrecision, readPrecisionDate, type DatePrecision } from '@/lib/profileDatePrecision'

export interface PrecisionDateFieldProps {
  id: string
  label: string
  value: string
  precision?: DatePrecision | null
  onChange: (value: string, precision: DatePrecision | null) => void
  helper?: string
  error?: string
  disabled?: boolean
}

/** No type=month coercion: year and supplied day stay independently editable. */
export function PrecisionDateField({ id, label, value, precision, onChange, helper, error, disabled }: PrecisionDateFieldProps) {
  let displayValue = value
  if (value && precision === null) {
    try { displayValue = readPrecisionDate(value, null) ?? '' } catch { /* Retain malformed input visibly. */ }
  } else if (value && precision) {
    try { displayValue = readPrecisionDate(value, precision) ?? '' } catch { /* Retain malformed input visibly. */ }
  }
  const validPrecision = inferDatePrecision(displayValue)
  const invalid = error || (displayValue.trim() && !validPrecision ? 'Use a real date: YYYY, YYYY-MM or YYYY-MM-DD.' : undefined)
  const hintId = `${id}-precision-help`, errorId = `${id}-precision-error`
  return <div className="flex min-w-0 flex-col gap-1.5">
    <label htmlFor={id} className="field-label">{label}</label>
    <input id={id} type="text" className="field" inputMode="text" autoComplete="off" placeholder="YYYY, YYYY-MM or YYYY-MM-DD" value={displayValue} disabled={disabled} aria-invalid={invalid ? true : undefined} aria-describedby={`${hintId}${invalid ? ` ${errorId}` : ''}`} onChange={event => onChange(event.target.value, inferDatePrecision(event.target.value))} />
    <span id={hintId} className="field-hint">{precision === null && value ? 'Date precision unverified. The stored month and day are not confirmed. Enter only the date you know to clarify it.' : validPrecision === 'year' ? 'Year only — no month or day supplied.' : validPrecision === 'month' ? 'Month and year — no day supplied.' : validPrecision === 'day' ? 'Full date supplied.' : 'Optional — enter only the date information you know.'}{helper ? ` ${helper}` : ''}</span>
    {precision === null && value && validPrecision === 'year' ? <button type="button" className="min-h-11 self-start rounded-lg border border-line bg-white px-3 text-sm font-semibold text-teal" disabled={disabled} onClick={() => onChange(displayValue, 'year')}>Use year only</button> : null}
    {invalid ? <span id={errorId} className="field-hint text-alert" role="alert">{invalid}</span> : null}
  </div>
}
