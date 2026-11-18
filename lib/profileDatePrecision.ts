/** Date facts retain the precision the candidate supplied. Calendar anchors are storage only. */
export type DatePrecision = 'year' | 'month' | 'day'

const ISO = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$/
function parts(value: unknown): { text: string; year: number; month: number; day: number; precision: DatePrecision } | null {
  if (typeof value !== 'string') return null
  const text = value.trim(), m = ISO.exec(text)
  if (!m) return null
  const year = Number(m[1]), month = Number(m[2] ?? 1), day = Number(m[3] ?? 1)
  if (year < 1 || year > 9999 || month < 1 || month > 12 || day < 1) return null
  const date = new Date(0)
  date.setUTCFullYear(year, month - 1, day)
  date.setUTCHours(0, 0, 0, 0)
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null
  return { text, year, month, day, precision: m[3] ? 'day' : m[2] ? 'month' : 'year' }
}

/** Only call inference on fresh extracted/user-entered facts, never an untagged database date. */
export function inferDatePrecision(value: unknown): DatePrecision | null {
  return parts(value)?.precision ?? null
}

/**
 * Encode a fresh partial date, or a known-precision storage date, as an anchor plus precision.
 * Explicit null means legacy uncertainty: preserve the supplied raw date unchanged, without certifying it.
 * Callers must additionally compare unchanged legacy values under the atomic save lock.
 */
export function encodePrecisionDate(value: unknown, precision?: DatePrecision | null): { value: string | null; precision: DatePrecision | null } {
  if (value == null || value === '') {
    if (precision != null) throw new Error('Date precision requires a date')
    return { value: null, precision: null }
  }
  const p = parts(value)
  if (!p) throw new Error('Invalid calendar date')
  if (precision === null) {
    if (p.precision !== 'day') throw new Error('Legacy date requires its original stored full date')
    return { value: p.text, precision: null }
  }
  const resolved = precision ?? p.precision
  if (!['year', 'month', 'day'].includes(resolved)) throw new Error('Invalid date precision')
  if (resolved !== p.precision && !(p.precision === 'day' && ((resolved === 'year' && p.month === 1 && p.day === 1) || (resolved === 'month' && p.day === 1)))) {
    throw new Error('Date does not match its precision')
  }
  return { value: `${String(p.year).padStart(4, '0')}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`, precision: resolved }
}

/** Explicit NULL is legacy unknown; display its year without asserting the stored month/day. */
export function readPrecisionDate(value: unknown, precision?: DatePrecision | null): string | null {
  if (value == null || value === '') return null
  if (precision === null) {
    const p = parts(value)
    if (!p) throw new Error('Invalid legacy date')
    return p.text.slice(0, 4)
  }
  const encoded = encodePrecisionDate(value, precision)
  if (!encoded.value) return null
  if (precision === null || encoded.precision === 'year') return encoded.value.slice(0, 4)
  return encoded.precision === 'month' ? encoded.value.slice(0, 7) : encoded.value
}

export interface PrecisionDateBounds {
  min: string
  max: string
  precision: DatePrecision | null
}

/** Conservative calendar bounds, not a guessed date. A legacy stored year is retained; its month/day is unverified. */
export function dateBounds(value: unknown, precision?: DatePrecision | null): PrecisionDateBounds | null {
  if (value == null || value === '') return null
  if (precision === null) {
    const p = parts(value)
    if (!p) return null
    const y = String(p.year).padStart(4, '0')
    return { min: `${y}-01-01`, max: `${y}-12-31`, precision: null }
  }
  let encoded: ReturnType<typeof encodePrecisionDate>
  try { encoded = encodePrecisionDate(value, precision) } catch { return null }
  const p = parts(encoded.value)
  if (!p) return null
  const y = String(p.year).padStart(4, '0'), m = String(p.month).padStart(2, '0')
  if (encoded.precision === null || encoded.precision === 'year') return { min: `${y}-01-01`, max: `${y}-12-31`, precision: encoded.precision }
  if (encoded.precision === 'month') {
    const last = new Date(0)
    last.setUTCFullYear(p.year, p.month, 0)
    return { min: `${y}-${m}-01`, max: `${y}-${m}-${String(last.getUTCDate()).padStart(2, '0')}`, precision: 'month' }
  }
  return { min: encoded.value!, max: encoded.value!, precision: 'day' }
}

/** Project DB rows without inferring precision from a stored full-date anchor.
 * Legacy raw dates stay available for unchanged saves; consumers display them
 * through readPrecisionDate and retain the explicit NULL uncertainty marker.
 */
export function projectPersistedDateRow<T extends object>(row: T, fields: readonly string[]): T {
  const projected = { ...row } as Record<string, unknown>
  for (const field of fields) {
    const precisionKey = field + '_precision'
    const precision = projected[precisionKey] as DatePrecision | null | undefined
    projected[precisionKey] = precision ?? null
    if (precision != null) projected[field] = readPrecisionDate(projected[field], precision)
  }
  return projected as T
}
