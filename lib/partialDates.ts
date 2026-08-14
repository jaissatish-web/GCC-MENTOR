/**
 * Partial-date handling for profile dates.
 *
 * WHY THIS EXISTS
 * Resumes state employment and certification dates to month precision at best
 * ("March 2021", "2019") — a day-of-month is essentially never present. The
 * extraction prompt (lib/ai/extractionPrompt.ts) is written to match that
 * reality: it returns "YYYY-MM-DD" only where a full date really appears, and
 * otherwise "YYYY-MM" or "YYYY".
 *
 * The database columns are Postgres `date`, which accepts only full dates, and
 * the profile form used `<input type="date">`, which silently blanks any value
 * that is not a full ISO date. So an extracted "2021-03" rendered as an empty
 * field while still sitting in form state, and saving it failed the whole
 * request with a 500 the user could neither see nor fix. Found end-to-end,
 * 2026-08-14.
 *
 * The rule here: month precision is the truth we actually have, so it is what
 * the UI collects and what the renderer prints (lib/resumeDocument.ts already
 * formats "Mar 2021", never a day). Storage pads to the first of the month
 * purely because the column demands a full date — that day is never shown to
 * anyone and must never be presented as if the user supplied it.
 */

/** A full ISO date, e.g. 2021-03-01. */
const FULL = /^\d{4}-\d{2}-\d{2}$/
/** Year and month, e.g. 2021-03. */
const YEAR_MONTH = /^\d{4}-\d{2}$/
/** Year only, e.g. 2019. */
const YEAR = /^\d{4}$/

/**
 * Coerce a date-ish string into something a Postgres `date` column accepts.
 *
 * - ''/null/undefined      -> null (absent, not an error)
 * - 'YYYY'                 -> 'YYYY-01-01'
 * - 'YYYY-MM'              -> 'YYYY-MM-01'
 * - 'YYYY-MM-DD'           -> unchanged
 * - anything else          -> null
 *
 * Returning null for unparseable input is deliberate: a date we cannot read is
 * absent data, and dropping it is honest. Writing a guess would not be.
 */
export function normalizeProfileDate(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const v = value.trim()
  if (v === '') return null
  if (FULL.test(v)) return v
  if (YEAR_MONTH.test(v)) return `${v}-01`
  if (YEAR.test(v)) return `${v}-01-01`
  return null
}

/**
 * Stored date -> the value a `<input type="date">` expects ('YYYY-MM-DD').
 *
 * For the few fields that genuinely have a day the user knows (date of birth,
 * passport and licence expiry), a partial value returns '' rather than being
 * padded. Padding would put an invented day in front of the user as if they had
 * entered it; an empty field they can fill from the actual document is honest,
 * and — unlike before — the value is no longer retained invisibly in state.
 */
export function toDateInputValue(value: unknown): string {
  if (typeof value !== 'string') return ''
  const v = value.trim()
  return FULL.test(v) ? v : ''
}

/**
 * Stored date -> the value a `<input type="month">` expects ('YYYY-MM').
 * Anything unparseable becomes '' so the field renders empty rather than
 * holding a value the user cannot see (the exact failure this module exists
 * to prevent).
 */
export function toMonthInputValue(value: unknown): string {
  if (typeof value !== 'string') return ''
  const v = value.trim()
  if (FULL.test(v) || YEAR_MONTH.test(v)) return v.slice(0, 7)
  if (YEAR.test(v)) return `${v}-01`
  return ''
}
