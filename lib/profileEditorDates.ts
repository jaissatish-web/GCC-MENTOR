import { encodePrecisionDate, inferDatePrecision, readPrecisionDate, type DatePrecision } from './profileDatePrecision'

/** Untagged fresh input may infer precision; explicit null is retained legacy uncertainty. */
export function editorDateFact(value: unknown, precision?: DatePrecision | null): { value: string; precision: DatePrecision | null } {
  const text = typeof value === 'string' ? value : ''
  return { value: precision === null ? text : (readPrecisionDate(text, precision) ?? ''), precision: precision === undefined ? inferDatePrecision(text) : precision }
}
export function editorDatePayload(field: string, value: string, precision?: DatePrecision | null): Record<string, unknown> {
  return { [field]: value.trim() || null, [`${field}_precision`]: value.trim() ? (precision === undefined ? inferDatePrecision(value) : precision) : null }
}
export function editorDateInvalid(value: string, precision?: DatePrecision | null): boolean {
  if (!value.trim()) return false
  try { encodePrecisionDate(value, precision); return false } catch { return true }
}
