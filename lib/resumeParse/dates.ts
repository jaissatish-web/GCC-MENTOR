/**
 * CV dates, read by code rather than by the model (2026-10-01).
 *
 * The model is asked to copy a date EXACTLY as the CV writes it ("Mar'19",
 * "03/2019", "Till Date") and this module turns it into what the profile
 * stores. Converting is deterministic work a model gets wrong now and then — and
 * a wrongly converted date passes every downstream check — while a date the
 * model copied can also be checked against the CV text.
 *
 * Output matches what normalizeProfileDate (lib/partialDates.ts) accepts:
 * YYYY-MM-DD, YYYY-MM or YYYY. "Present" words are reported separately, since
 * the profile stores a current role as an EMPTY end date.
 */

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5, jun: 6, june: 6,
  jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11,
  dec: 12, december: 12,
}

const PRESENT = /^(present|current(ly)?|till\s*(date|now)?|to\s*date|todate|now|ongoing|continuing|working|date|still\s+working|running|till\s+present|until\s+(now|present))$/i

export const isPresentWord = (s: string) => PRESENT.test(s.trim().replace(/[.\s]+$/, ''))

const pad = (n: number) => String(n).padStart(2, '0')
const year4 = (y: number) => (y < 100 ? (y > 50 ? 1900 + y : 2000 + y) : y)
const validYear = (y: number) => y >= 1950 && y <= 2100

export type CvDate = { kind: 'date'; value: string } | { kind: 'present' } | { kind: 'unknown' }

/**
 * Read one date as written on a CV.
 *
 * `dayFirst` is the Gulf / South Asian convention (14/06/1988 = 14 June), which
 * is what the CVs this product reads use; an impossible day-first reading
 * (month > 12) falls back to month-first.
 */
export function parseCvDate(raw: unknown, { dayFirst = true }: { dayFirst?: boolean } = {}): CvDate {
  if (typeof raw === 'number' && validYear(raw)) return { kind: 'date', value: String(raw) }
  if (typeof raw !== 'string') return { kind: 'unknown' }
  const s = raw.trim().replace(/\s+/g, ' ').replace(/[.,]$/, '')
  if (!s) return { kind: 'unknown' }
  if (isPresentWord(s)) return { kind: 'present' }

  let m: RegExpMatchArray | null
  // Already ISO: 2019-03-14 / 2019-03 / 2019
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) return ymd(+m[1], +m[2], +m[3])
  if ((m = s.match(/^(\d{4})[-/.](\d{1,2})$/))) return ym(+m[1], +m[2])
  if ((m = s.match(/^(\d{4})$/))) return validYear(+m[1]) ? { kind: 'date', value: m[1] } : { kind: 'unknown' }

  // Numeric day/month/year: 14/06/1988, 14-06-1988, 14.06.1988
  if ((m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/))) {
    let [d, mo] = dayFirst ? [+m[1], +m[2]] : [+m[2], +m[1]]
    if (mo > 12 && d <= 12) [d, mo] = [mo, d]
    return ymd(year4(+m[3]), mo, d)
  }
  // Numeric month/year: 03/2019, 03.2019, 3-2019, 03/19
  if ((m = s.match(/^(\d{1,2})[/.-](\d{2,4})$/))) return ym(year4(+m[2]), +m[1])

  // Words. Normalise apostrophes / commas: "Mar'19", "March, 2019", "Jun’2013"
  const w = s.replace(/[’‘`´]/g, "'").replace(/,/g, ' ').replace(/\s+/g, ' ').trim()
  // 14 June 1988 / 14th Jun 1988 / 14-Jun-1988 / 05-May-84
  if ((m = w.match(/^(\d{1,2})(?:st|nd|rd|th)?[\s\-/.]+([A-Za-z]{3,9})\.?[\s\-/.']+(\d{2,4})$/))) {
    const mo = MONTHS[m[2].toLowerCase()]
    if (mo) return ymd(year4(+m[3]), mo, +m[1])
  }
  // June 14, 1988 / Jun 14 1988
  if ((m = w.match(/^([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?\s+(\d{4})$/))) {
    const mo = MONTHS[m[1].toLowerCase()]
    if (mo) return ymd(+m[3], mo, +m[2])
  }
  // Mar 2019 / March 2019 / Mar'19 / Mar'2019 / Mar-2019 / Mar.2019 / Sept. 19
  if ((m = w.match(/^([A-Za-z]{3,9})\.?\s*['\-/.]?\s*(\d{2}|\d{4})$/))) {
    const mo = MONTHS[m[1].toLowerCase()]
    if (mo) return ym(year4(+m[2]), mo)
  }
  // 2019 Mar / 2019-Mar
  if ((m = w.match(/^(\d{4})[\s\-/.]+([A-Za-z]{3,9})\.?$/))) {
    const mo = MONTHS[m[2].toLowerCase()]
    if (mo) return ym(+m[1], mo)
  }
  return { kind: 'unknown' }
}

function ym(y: number, mo: number): CvDate {
  if (!validYear(y) || mo < 1 || mo > 12) return { kind: 'unknown' }
  return { kind: 'date', value: `${y}-${pad(mo)}` }
}
function ymd(y: number, mo: number, d: number): CvDate {
  if (!validYear(y) || mo < 1 || mo > 12 || d < 1 || d > 31) return { kind: 'unknown' }
  return { kind: 'date', value: `${y}-${pad(mo)}-${pad(d)}` }
}

/**
 * Split a written range into its two ends: "Mar 2019 – Till Date",
 * "2015-2019", "July 2012 to May 2013". Used when the model hands back the
 * whole range in one field.
 */
export function splitRange(raw: string): [string, string] | null {
  const s = raw.trim()
  // An ISO-looking single date ("2019-03") is not a range.
  if (/^\d{4}-\d{2}(-\d{2})?$/.test(s)) return null
  const m = s.match(/^(.+?)\s*(?:–|—|-|to|till|until|~)\s*(.+)$/i)
  if (!m) return null
  const a = parseCvDate(m[1]), b = parseCvDate(m[2])
  if (a.kind === 'unknown' || b.kind === 'unknown') return null
  return [m[1].trim(), m[2].trim()]
}

/** Year of a date string the profile stores (or null). */
export const yearOf = (v: string | null | undefined) => (v && /^\d{4}/.test(v) ? Number(v.slice(0, 4)) : null)
